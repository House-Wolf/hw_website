import { CommandError } from "./access.js";

export function defaultCommandSettings() {
  return { schemaVersion: 1, revision: 0, channels: { events: "", reminders: "", aar: "", voice: "" }, skillWeight: 50, preferenceWeight: 50 };
}
export function validateCommandSettings(input) {
  const fail = () => { throw new CommandError(422, "INVALID_SETTINGS", "Use valid channel IDs, a current revision, and weights from 0 to 100 totaling 100."); };
  if (!input || typeof input !== "object" || Array.isArray(input)) fail();
  if (Object.keys(input).some((key) => !["schemaVersion", "revision", "channels", "skillWeight", "preferenceWeight"].includes(key))) fail();
  if (input.schemaVersion !== 1 || !Number.isSafeInteger(input.revision) || input.revision < 0) fail();
  if (!input.channels || typeof input.channels !== "object" || Array.isArray(input.channels)) fail();
  if (Object.keys(input.channels).some((key) => !["events", "reminders", "aar", "voice"].includes(key))) fail();
  for (const name of ["events", "reminders", "aar", "voice"]) if (typeof input.channels[name] !== "string" || (input.channels[name] !== "" && !/^\d{17,20}$/.test(input.channels[name]))) fail();
  if (![input.skillWeight, input.preferenceWeight].every((weight) => Number.isInteger(weight) && weight >= 0 && weight <= 100) || input.skillWeight + input.preferenceWeight !== 100) fail();
  return { schemaVersion: 1, revision: input.revision, channels: { ...input.channels }, skillWeight: input.skillWeight, preferenceWeight: input.preferenceWeight };
}

export function createSettingsService({ authorize, repository, validateChannel }) {
  return {
    async read(userId) { const actor = await authorize(userId, { officer: true }); return repository.read(actor.guildId); },
    async save(userId, input) {
      const actor = await authorize(userId, { officer: true });
      const value = validateCommandSettings(input);
      for (const name of ["events", "reminders", "aar"]) if (value.channels[name]) await validateChannel(actor.guildId, value.channels[name], "text");
      if (value.channels.voice) await validateChannel(actor.guildId, value.channels.voice, "voice");
      return repository.save(actor.guildId, value, actor.id, async () => {
        const fresh = await authorize(userId, { officer: true });
        if (fresh.guildId !== actor.guildId || fresh.id !== actor.id) throw new CommandError(403, "ACTOR_CHANGED", "Account scope changed. Please retry.");
      });
    },
  };
}
