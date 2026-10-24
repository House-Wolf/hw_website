import { CommandError } from "./access.js";
const invalid = (message) => { throw new CommandError(422, "INVALID_EVENT", message); };
const text = (value, max, label, required = true) => {
  if (typeof value !== "string" || value.length > max || (required && !value.trim()) || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) invalid(`${label} is required and must be at most ${max} characters.`);
  return value.trim();
};
export function localInstant(local, timezone, choice = "reject") {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(local || "")) invalid("Enter a valid local date and time.");
  let formatter;
  try { formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }); }
  catch { invalid("Select a valid IANA timezone."); }
  const nominal = Date.parse(`${local}:00Z`);
  if (!Number.isFinite(nominal)) invalid("Invalid date.");
  const offsets = new Set();
  for (let hours = -36; hours <= 36; hours += 6) {
    const probe = nominal + hours * 3600000;
    const displayed = formatter.format(new Date(probe)).replace(" ", "T");
    offsets.add(Date.parse(`${displayed}:00Z`) - probe);
  }
  const matches = [...offsets].map((offset) => nominal - offset).filter((stamp) => formatter.format(new Date(stamp)).replace(" ", "T") === local).sort((a, b) => a - b);
  if (!matches.length) invalid("This local time does not exist because of a timezone/DST change.");
  if (matches.length > 1 && !["earlier", "later"].includes(choice)) invalid("This local time occurs twice. Select earlier or later offset explicitly.");
  return new Date(choice === "later" ? matches.at(-1) : matches[0]).toISOString();
}
export function validateEventInput(raw, { future = true, now = Date.now() } = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) invalid("Submit an event object.");
  const allowed = ["title", "description", "entityType", "channelId", "location", "timezone", "startLocal", "endLocal", "startChoice", "endChoice", "recurrence", "visibility", "imageData", "imageBehavior"];
  if (Object.keys(raw).some((key) => !allowed.includes(key))) invalid("Unsupported event field or schedule.");
  const title = text(raw.title, 100, "Title"), description = text(raw.description, 700, "Description", false);
  const timezone = text(raw.timezone, 80, "Timezone");
  const start = localInstant(raw.startLocal, timezone, raw.startChoice);
  const end = raw.endLocal ? localInstant(raw.endLocal, timezone, raw.endChoice) : null;
  if (future && Date.parse(start) <= now + 60000) invalid("Start must be more than one minute in the future.");
  if (end && end <= start) invalid("End must be after start.");
  if (!["VOICE", "EXTERNAL"].includes(raw.entityType)) invalid("Select Voice Channel or Somewhere Else.");
  const channelId = raw.entityType === "VOICE" ? text(raw.channelId, 20, "Voice channel") : null;
  if (channelId && !/^\d{17,20}$/.test(channelId)) invalid("Select a valid channel ID.");
  const location = raw.entityType === "EXTERNAL" ? text(raw.location, 100, "Location") : null;
  if (raw.entityType === "EXTERNAL" && !end) invalid("Somewhere Else requires an end time.");
  const recurrence = raw.recurrence || "NONE";
  if (!["NONE", "WEEKLY", "FORTNIGHTLY"].includes(recurrence)) invalid("Only weekly and fortnightly native recurrence are supported. Count, end-date and custom schedules cannot be set through this form.");
  if (!["GUILD", "OFFICERS"].includes(raw.visibility)) invalid("Select event visibility.");
  if (recurrence !== "NONE" && timezone !== "UTC") invalid("Native recurrence uses UTC intervals. Use timezone UTC for recurring events; local wall-clock recurrence across DST is unsupported.");
  const imageData = raw.imageData || null;
  const imageBehavior = raw.imageBehavior || (imageData ? "REPLACE" : "PRESERVE");
  if (!["PRESERVE", "REPLACE", "REMOVE"].includes(imageBehavior) || (imageBehavior === "REPLACE" && !imageData)) invalid("Choose a validated cover image or preserve/remove the existing cover.");
  if (imageData && (typeof imageData !== "string" || imageData.length > 750000 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(imageData))) invalid("Upload a validated JPEG cover using the dashboard image control.");
  return { title, description, entityType: raw.entityType, channelId, location, timezone, startLocal: raw.startLocal, endLocal: raw.endLocal || "", startChoice: raw.startChoice || "reject", endChoice: raw.endChoice || "reject", start, end, recurrence, visibility: raw.visibility, imageData, imageBehavior };
}
export function editableInput(input) {
  const raw = { ...input }; delete raw.start; delete raw.end;
  return raw;
}
export function nativePayload(operation, baseUrl) {
  const input = operation.input;
  if (input.visibility !== "GUILD") throw new CommandError(422, "PRIVATE_NATIVE_UNSUPPORTED", "Discord native events cannot enforce officer-only operation visibility. Publication is blocked.");
  let url;
  try {
    url = new URL(`/dashboard/operations/${operation.id}`, baseUrl);
    if (url.username || url.password || (url.protocol !== "https:" && !(url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)))) throw new Error("Invalid origin");
  } catch { throw new CommandError(503, "WEBSITE_UNCONFIGURED", "Configure the canonical HTTPS website URL before publishing."); }
  const safeText = (value) => value.replace(/@(?!\u200b)/g, "@\u200b");
  const description = `${safeText(input.description)}\n\nHouse Wolf signup & briefing: ${url.href}\nInterested is not a confirmed commitment.`;
  if (description.length > 1000) invalid("Description and dashboard link exceed Discord's 1000-character limit.");
  return {
    name: safeText(input.title).slice(0, 100), description, privacy_level: 2, entity_type: input.entityType === "VOICE" ? 2 : 3,
    channel_id: input.channelId, entity_metadata: input.location ? { location: input.location } : null,
    scheduled_start_time: input.start, ...(input.end ? { scheduled_end_time: input.end } : {}),
    recurrence_rule: input.recurrence === "NONE" ? null : { start: input.start, frequency: 2, interval: input.recurrence === "FORTNIGHTLY" ? 2 : 1, by_weekday: [(new Date(input.start).getUTCDay() + 6) % 7] },
    ...(input.imageBehavior === "REMOVE" ? { image: null } : input.imageBehavior === "REPLACE" ? { image: input.imageData } : {}),
  };
}
export function nativeSnapshot(event) {
  // Ignore Interested counts, creator metadata and volatile provider timestamps.
  return { name: event.name, description: event.description || "", channel_id: event.channel_id || null,
    entity_type: event.entity_type, location: event.entity_metadata?.location || null,
    start: new Date(event.scheduled_start_time).toISOString(), end: event.scheduled_end_time ? new Date(event.scheduled_end_time).toISOString() : null,
    recurrence: event.recurrence_rule ? { start: new Date(event.recurrence_rule.start).toISOString(), frequency: event.recurrence_rule.frequency, interval: event.recurrence_rule.interval, by_weekday: event.recurrence_rule.by_weekday || null, by_n_weekday: event.recurrence_rule.by_n_weekday || null, by_month: event.recurrence_rule.by_month || null, by_month_day: event.recurrence_rule.by_month_day || null } : null, image: event.image || null, status: event.status };
}
export function snapshotsEqual(a, b) {
  const stable = (value) => Array.isArray(value) ? value.map(stable) : value && typeof value === "object" ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])])) : value;
  return JSON.stringify(stable(a)) === JSON.stringify(stable(b));
}
export function transition(state, action) {
  const next = { DRAFT: { publish: "PUBLISHED", cancel: "CANCELLED" }, PUBLISHED: { start: "ACTIVE", cancel: "CANCELLED" }, ACTIVE: { complete: "COMPLETED", cancel: "CANCELLED" }, COMPLETED: { archive: "ARCHIVED" }, CANCELLED: { archive: "ARCHIVED" } }[state]?.[action];
  if (!next) throw new CommandError(409, "INVALID_TRANSITION", `Cannot ${action} an operation in ${state}.`);
  return next;
}
