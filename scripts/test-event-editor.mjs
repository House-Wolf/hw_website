import assert from "node:assert/strict";
import { test } from "node:test";
import { easternEditorSchedule } from "../lib/command/eventEditor.js";
import { localInstant } from "../lib/command/eventInput.js";

test("Eastern calendar selection applies the correct seasonal offset", () => {
  assert.equal(localInstant("2026-10-24T20:45", "America/New_York"), "2026-10-25T00:45:00.000Z");
  assert.equal(localInstant("2026-12-24T20:45", "America/New_York"), "2026-12-25T01:45:00.000Z");
});
test("opening a fixed EST event in the Eastern editor preserves its saved start and end", () => {
  const input = { timezone: "EST", start: "2026-10-25T01:45:00.000Z", end: "2026-10-25T04:30:00.000Z" };
  const schedule = easternEditorSchedule(input);
  assert.equal(schedule.timezone, "America/New_York");
  assert.equal(schedule.startLocal, "2026-10-24T21:45");
  assert.equal(schedule.endLocal, "2026-10-25T00:30");
  assert.equal(localInstant(schedule.startLocal, schedule.timezone, schedule.startChoice), input.start);
  assert.equal(localInstant(schedule.endLocal, schedule.timezone, schedule.endChoice), input.end);
});
test("autumn clock ambiguity retains both the EST and EDT saved instants", () => {
  for (const [timezone, start] of [["EST", "2026-11-01T06:30:00.000Z"], ["EDT", "2026-11-01T05:30:00.000Z"]]) {
    const schedule = easternEditorSchedule({ timezone, start });
    assert.equal(schedule.startLocal, "2026-11-01T01:30");
    assert.equal(localInstant(schedule.startLocal, schedule.timezone, schedule.startChoice), start);
  }
  assert.throws(() => localInstant("2026-03-08T02:30", "America/New_York"));
});
test("Eastern defaults normalize legacy templates while preserving explicit UTC choices", () => {
  assert.deepEqual(easternEditorSchedule({ timezone: "EST" }), { timezone: "America/New_York" });
  assert.deepEqual(easternEditorSchedule({ timezone: "UTC" }), { timezone: "UTC" });
});
