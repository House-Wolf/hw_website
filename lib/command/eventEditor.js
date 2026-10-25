/** Legacy fixed-offset events keep their saved instant when opened in Eastern local time. */
export function easternEditorSchedule(input) {
  const legacyZone = input.timezone?.trim().toUpperCase();
  if (!["EST", "EDT"].includes(legacyZone)) return { timezone: input.timezone };
  const timezone = "America/New_York";
  const formatter = new Intl.DateTimeFormat("sv-SE", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const schedule = { timezone };
  for (const field of ["start", "end"]) {
    if (!input[field]) continue;
    schedule[`${field}Local`] = formatter.format(new Date(input[field])).replace(" ", "T");
    // Preserve which 1 AM was intended when clocks move back in autumn.
    schedule[`${field}Choice`] = legacyZone === "EST" ? "later" : "earlier";
  }
  return schedule;
}
