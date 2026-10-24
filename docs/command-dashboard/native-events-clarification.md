Update the House Wolf dashboard event implementation to publish
directly into Discord’s built-in Events section using native
Guild Scheduled Events.

This clarifies and overrides any earlier instruction requiring
an events text-channel ID before publishing a native event.

1. DASHBOARD EVENT FORM
Provide this workflow:
Location → Event Info → Review → Publish.

Support:
- Voice Channel: select an existing server voice channel.
- Somewhere Else: enter an in-game location or external location.
- Event title and description.
- Start date/time with explicit timezone.
- End date/time, required for external events.
- Optional cover image.
- Recurrence supported by the current Discord API, with clear
  validation for unsupported schedules.

Fetch available voice channels server-side from the configured
Discord server. Store and validate channel IDs, not channel names.
Do not hardcode WOLF DEN or invent its ID.

2. NATIVE DISCORD PUBLICATION
Use the existing Discord bot and DISCORD_GUILD_ID to create a
native Guild Scheduled Event.

Discord’s built-in Events section has NO channel ID.
DISCORD_EVENTS_CHANNEL_ID must NOT be required for this feature.

For a voice event, use the selected voice channel’s ID.
For an external event, supply the required location and end time.

Verify the current official Discord API documentation and the
installed discord.js version before implementing API calls.

3. EVENT CREATION PERMISSIONS
Only current Discord members holding Lieutenant or one of the
higher officer roles defined in lib/personnel/policy.js may
create or publish an event.

Enforce this on the server using current Discord role IDs.
Do not trust browser claims, profile rank names, or stale JWT
permissions. Site Admin or Discord Administrator alone must not
bypass the officer requirement.

Preserve the existing officer allowlist and management rules
in the comprehensive dashboard instructions.

4. KEEP WEBSITE AND DISCORD LINKED
Persist the Discord scheduled event ID against the operation.
Return its Discord event link after successful publication.

Website edits must update the linked event.
Website cancellations must cancel the linked event.
Prevent duplicate events on repeated clicks, retries or restarts.

Use the durable outbox and worker design already specified.
Track native-event delivery independently from optional messages.
Show pending, published, failed, blocked and partial delivery
states honestly. Preserve drafts and allow safe retries.

Reconcile supported event updates made directly in Discord.
Define field ownership and conflict handling so synchronization
does not loop or overwrite newer dashboard changes silently.
Flag externally deleted events rather than automatically
recreating them without an authorized decision.

5. OPTIONAL TEXT-CHANNEL ANNOUNCEMENTS
A separate #events text-channel announcement is optional.
Use DISCORD_EVENTS_CHANNEL_ID only for that additional message.

If it is not configured, native event creation must still work.
Display:
“Discord event created. Text-channel announcement not configured.”

Custom Commit, Tentative, Reserve and Withdraw buttons belong
on that optional bot message or the website—not inside Discord’s
native scheduled event card.

Include the dashboard signup link in the native event description.

6. SIGNUPS AND ATTENDANCE
Keep Discord’s native Interested response separate from a
confirmed House Wolf operation commitment.

Do not treat Interested as attendance, a crew assignment, or a
confirmed signup. Members complete detailed signup and role
preferences through the dashboard or optional bot buttons.

7. SAFETY AND CONFIGURATION
Validate guild, channel type, effective bot permissions, input
limits, image handling and timezone conversion.

Do not publish restricted operation details into a native event
whose audience is broader than the operation permits.
Explain and block unsupported private publication.

Never expose the bot token to the browser.
Do not grant the bot Administrator merely to make this work.

8. TEST AND COMPLETE
Test:
- Lieutenant and higher officer creation.
- Lower-rank and stale-role denial.
- Voice and external event creation.
- Native creation without a text-channel ID.
- Updates, cancellations, duplicates and restart recovery.
- Missing permissions, invalid channels and Discord failures.
- Timezones, DST and supported recurrence.
- Interested remaining separate from confirmed commitment.
- Direct Discord edits/deletions and synchronization conflicts.

Update the implementation documentation, configuration examples,
requirement traceability and progress files.

Preserve the rest of the comprehensive dashboard feature scope.
Implement and verify the code; do not stop at a plan.
Do not deploy or create live Discord test events without my
explicit authorization.
