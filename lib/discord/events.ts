export interface ScheduledEvent {
  id: string;
  name: string;
  description?: string | null;
  scheduled_start_time: string;
  status: number;
}

export interface HomepageEvent {
  id: string;
  title: string;
  description: string;
  scheduledStartTime: string;
  url: string;
  isLive: boolean;
}

export function prepareEvents(events: ScheduledEvent[], guildId: string, now = Date.now()): HomepageEvent[] {
  return events.filter((event) => {
    const start = Date.parse(event.scheduled_start_time);
    return Number.isFinite(start) && (event.status === 2 || (event.status === 1 && start >= now));
  }).sort((a, b) => Date.parse(a.scheduled_start_time) - Date.parse(b.scheduled_start_time))
    .slice(0, 3).map((event) => ({
      id: event.id,
      title: event.name,
      description: event.description ?? "",
      scheduledStartTime: event.scheduled_start_time,
      url: `https://discord.com/events/${guildId}/${event.id}`,
      isLive: event.status === 2,
    }));
}
