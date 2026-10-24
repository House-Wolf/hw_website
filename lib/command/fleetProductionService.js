import { scheduleTransaction, releaseAssignments } from "./staffingPolicy.js";

// Only explicit machine statuses establish playability; labels and missing data do not.
export function registryProductionState(model) {
  if (model?.productionStatus === "flight-ready") return "FLIGHT_READY";
  if (["in-concept", "in-production", "concept"].includes(model?.productionStatus)) return "CONCEPT";
  return null;
}

/** Refresh model release status independently of ownership, owner readiness and consent. */
export function createFleetProductionService({ prisma, loadFleet }) {
  return async function refreshProduction(actor) {
    let fleet;
    try { fleet = await loadFleet(); }
    catch { return { status: "unavailable", updated: 0 }; }
    if (fleet.sourceStatus !== "complete") return { status: "unavailable", updated: 0 };
    const vehicles = new Map();
    for (const vehicle of fleet.vehicles) {
      if (!vehicle.id || vehicle.loaner) continue;
      const ref = `fleetyards:${vehicle.id}`;
      // Ambiguous source records must not choose a model arbitrarily.
      vehicles.set(ref, vehicles.has(ref) ? null : vehicle);
    }
    return scheduleTransaction(prisma, actor, async (tx) => {
      const ships = await tx.commandShip.findMany({ where: { guildId: actor.guildId, externalRef: { in: [...vehicles.keys()] } } });
      let updated = 0;
      for (const ship of ships) {
        const model = vehicles.get(ship.externalRef)?.model;
        if (!model?.name || model.name.trim().toLowerCase() !== ship.model.trim().toLowerCase()) continue;
        const productionState = registryProductionState(model);
        if (!productionState || ship.productionState === productionState) continue;
        const previous = ship.productionState;
        await tx.commandShip.update({ where: { id: ship.id }, data: { productionState, revision: { increment: 1 } } });
        if (productionState !== "FLIGHT_READY") {
          await releaseAssignments(tx, { seat: { operationShip: { shipId: ship.id } }, operation: { state: { in: ["DRAFT", "PUBLISHED", "ACTIVE"] } } }, actor.id, "FleetYards model is no longer flight-ready");
        }
        await tx.auditLog.create({ data: { actorId: actor.id, action: "COMMAND_FLEET_PRODUCTION_SYNCED", targetType: "CommandShip", targetId: ship.id, metadata: { source: "FleetYards", previous, productionState, externalRef: ship.externalRef } } });
        updated++;
      }
      return { status: "complete", updated };
    });
  };
}
