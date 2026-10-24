export type OverviewOperation = {
  id: string; title: string | null; start: string | null; state: string; createdAt: Date | string;
};
export type OperationsOverview = {
  generatedAt: string;
  leadership: boolean;
  members: { total: number; newThisMonth: number };
  operations: { active: number; scheduled: number; total: number };
  fleet: { total: number | null; status: "complete" | "partial" | "unavailable" };
  reliability: { value: null; description: string };
  trend: { month: string; label: string; count: number }[];
  statuses: { state: string; count: number }[];
  upcoming: { id: string; title: string; start: string | null; state: string }[];
  recentMembers: { name: string; rank: string; joinedAt: string }[];
  recentActivity: { id: number; operationId: string; title: string; action: string; at: string; actor: string }[];
};

/** Aggregate only the operation rows authorized by the repository. All windows use UTC. */
export function operationOverviewStatistics(rows: OverviewOperation[], at: Date) {
  const trend = Array.from({ length: 6 }, (_, index) => {
    const month = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth() - 5 + index, 1));
    return { month: month.toISOString().slice(0, 7), label: month.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }), count: 0 };
  });
  const cutoff = at.getTime() - 90 * 24 * 60 * 60 * 1000;
  const statuses = new Map<string, number>();
  for (const row of rows) {
    const date = new Date(row.createdAt);
    if (!Number.isFinite(date.getTime()) || date > at) continue;
    const bucket = trend.find(month => month.month === date.toISOString().slice(0, 7));
    if (bucket) bucket.count++;
    if (date.getTime() >= cutoff) statuses.set(row.state, (statuses.get(row.state) ?? 0) + 1);
  }
  const upcoming = rows.filter(row => row.state === "ACTIVE" || (row.state === "PUBLISHED" && row.start && Date.parse(row.start) >= at.getTime()))
    .sort((a, b) => Number(b.state === "ACTIVE") - Number(a.state === "ACTIVE") || Date.parse(a.start || "") - Date.parse(b.start || ""))
    .slice(0, 4).map(row => ({ id: row.id, title: row.title || "Untitled operation", start: row.start, state: row.state }));
  return {
    operations: { active: rows.filter(row => row.state === "ACTIVE").length, scheduled: rows.filter(row => row.state === "PUBLISHED").length, total: rows.length },
    trend, statuses: ["DRAFT", "PUBLISHED", "ACTIVE", "COMPLETED", "CANCELLED", "ARCHIVED"]
      .filter(state => statuses.has(state)).map(state => ({ state, count: statuses.get(state)! })), upcoming,
  };
}
