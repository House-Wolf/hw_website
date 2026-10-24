import type { FleetYardsModel, FleetYardsVehicle, FleetStatItem, HouseWolfFleetPayload } from "./types";

function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === "object" && !Array.isArray(value); }
const label = (value: unknown): string | undefined => typeof value === "string" && value.trim() ? value.trim() : undefined;
function hasArrayEnvelope(value: unknown, depth = 0): boolean {
  if (Array.isArray(value)) return true;
  if (!record(value) || depth > 4) return false;
  return ["data", "vehicles", "results", "items", "models"].some((key) => hasArrayEnvelope(value[key], depth + 1));
}

export function unwrapFleetArray(value: unknown, depth = 0): unknown[] {
  if (Array.isArray(value)) return value;
  if (!record(value) || depth > 4) return [];
  for (const key of ["data", "vehicles", "results", "items", "models"]) {
    if (Array.isArray(value[key])) return value[key];
    if (record(value[key])) { const result = unwrapFleetArray(value[key], depth + 1); if (result.length) return result; }
  }
  return [];
}

export function normalizeFleetVehicles(value: unknown): FleetYardsVehicle[] {
  return unwrapFleetArray(value).filter(record).map((row) => {
    const rawModel = record(row.model) ? row.model : null;
    const rawSize = rawModel?.size;
    // FleetYards v1 Model references ModelMetrics.size/sizeLabel (official schema).
    const metrics = record(rawModel?.metrics) ? rawModel.metrics : null;
    const size = label(rawModel?.sizeLabel) || label(metrics?.sizeLabel) || label(metrics?.size) || (record(rawSize) ? label(rawSize.label) || label(rawSize.name) : label(rawSize));
    const username = label(row.username);
    const displayName = label(row.userDisplayName) || label(row.user_display_name);
    const rsiHandle = label(row.userRsiHandle) || label(row.user_rsi_handle);
    const hidden = row.hideOwner === true || row.hide_owner === true;
    return {
      id: label(row.id) || (typeof row.id === "number" && Number.isSafeInteger(row.id) ? String(row.id) : undefined),
      name: label(row.name), serial: label(row.serial),
      owner: !hidden && (username || displayName || rsiHandle) ? { username, displayName, rsiHandle } : null,
      loaner: row.loaner === true,
      model: rawModel ? { ...rawModel, id: label(rawModel.id) || (typeof rawModel.id === "number" ? String(rawModel.id) : undefined), size: size || null, sizeLabel: size || null } as FleetYardsModel : null,
    };
  });
}

export function modelIdentity(model: FleetYardsModel | null | undefined) {
  if (model?.id) return `id:${model.id}`;
  if (model?.slug) return `slug:${model.slug}`;
  if (model?.name && (model.manufacturer?.slug || model.manufacturer?.name))
    return `name:${model.manufacturer.slug || model.manufacturer.name}:${model.name}`.toLowerCase();
  return null;
}

function counts(vehicles: FleetYardsVehicle[], key: (model: FleetYardsModel) => string | null | undefined): FleetStatItem[] {
  const values = new Map<string, number>();
  for (const vehicle of vehicles) { const name = vehicle.model && key(vehicle.model); if (name) values.set(name, (values.get(name) || 0) + 1); }
  return [...values].sort(([a], [b]) => a.localeCompare(b)).map(([name, count]) => ({ name, label: name, count }));
}

export function fleetStatistics(vehicles: FleetYardsVehicle[]) {
  const identities = new Set(vehicles.map((vehicle) => modelIdentity(vehicle.model)).filter(Boolean));
  return { totalVehicles: vehicles.length, uniqueModels: identities.size, unidentifiedModels: vehicles.filter((vehicle) => !modelIdentity(vehicle.model)).length,
    manufacturers: new Set(vehicles.map((vehicle) => vehicle.model?.manufacturer?.slug || vehicle.model?.manufacturer?.name).filter(Boolean)).size,
    classifications: new Set(vehicles.map((vehicle) => vehicle.model?.classification || vehicle.model?.classificationLabel).filter(Boolean)).size };
}

/** A failed later page is explicitly partial, never silently an empty/complete fleet. */
export async function loadPublicFleet(fleetSlug: string, read: (path: string) => Promise<unknown>, perPage = 240, maxPages = 50): Promise<HouseWolfFleetPayload> {
  const vehicles: FleetYardsVehicle[] = [], seen = new Set<string>(), warnings: string[] = [];
  let complete = false;
  for (let page = 1; page <= maxPages; page++) {
    let rows;
    try {
      const payload = await read(`/public/fleets/${encodeURIComponent(fleetSlug)}/vehicles?page=${page}&per_page=${perPage}`);
      if (!hasArrayEnvelope(payload)) throw new Error("Invalid fleet envelope");
      rows = normalizeFleetVehicles(payload);
    }
    catch { warnings.push(`Fleet source page ${page} is unavailable.`); break; }
    const fresh = rows.filter((vehicle) => { if (!vehicle.id) return true; if (seen.has(vehicle.id)) return false; seen.add(vehicle.id); return true; });
    vehicles.push(...fresh);
    if (rows.length < perPage) { complete = true; break; }
    if (!fresh.length) { warnings.push("Fleet source repeated a page; totals are incomplete."); break; }
    if (page === maxPages) warnings.push("Fleet pagination safety limit reached; totals are incomplete.");
  }
  const models = new Map<string, FleetStatItem>();
  for (const vehicle of vehicles) {
    const identity = modelIdentity(vehicle.model), model = vehicle.model;
    if (!identity || !model) continue;
    const prior = models.get(identity);
    if (prior) prior.count = (prior.count || 0) + 1;
    else models.set(identity, { name: model.name || model.slug || model.id, count: 1 });
  }
  return { fleetSlug, vehicles, sourceStatus: complete ? "complete" : vehicles.length ? "partial" : "unavailable", warnings,
    modelCounts: [...models.values()],
    manufacturers: counts(vehicles, (model) => model.manufacturer?.name), classifications: counts(vehicles, (model) => model.classificationLabel || model.classification),
    sizes: counts(vehicles, (model) => model.sizeLabel || model.size), productionStatuses: counts(vehicles, (model) => model.productionStatusLabel || model.productionStatus) };
}
