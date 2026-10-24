import { CommandError, isOfficer } from "./access.js";
import { crewMember, uuid, scheduleTransaction } from "./staffingPolicy.js";

export function matchRegistryOwners(vehicles, personnel, users) {
  const result = [], seen = new Set();
  for (const vehicle of vehicles) {
    if (!uuid(vehicle.id) || seen.has(vehicle.id) || vehicle.loaner) continue;
    seen.add(vehicle.id);
    const handle = vehicle.owner?.rsiHandle?.trim().toLowerCase();
    const members = handle ? personnel.filter(p => p.membershipConfirmedAt && p.rsiHandle?.trim().toLowerCase() === handle) : [];
    const accounts = members.length === 1 ? users.filter(u => u.isActive && u.discordId === members[0].discordId) : [];
    result.push({ vehicle, ownerId: accounts.length === 1 ? accounts[0].id : null });
  }
  return result;
}

export function createFleetRegistryService({ prisma, authorize, loadFleet }) {
  return {
    async sync(userId) {
      const actor = await authorize(userId);
      if (!crewMember(actor)) throw new CommandError(403, "MEMBER_REQUIRED", "Current House Wolf membership is required.");
      const fleet = await loadFleet();
      if (fleet.sourceStatus !== "complete") throw new CommandError(503, "FLEET_UNAVAILABLE", "FleetYards could not load the complete fleet. Please retry.");
      const personnel = await prisma.personnelMember.findMany({ where: { guildId: actor.guildId, membershipConfirmedAt: { not: null }, rsiHandle: { not: null } }, select: { discordId: true, rsiHandle: true, membershipConfirmedAt: true } });
      const users = await prisma.user.findMany({ where: { isActive: true, discordId: { in: personnel.map(p => p.discordId) } }, select: { id: true, discordId: true, isActive: true } });
      const matches = matchRegistryOwners(fleet.vehicles, personnel, users);
      const selected = matches.filter(m => m.ownerId && (isOfficer(actor.roleIds) || m.ownerId === actor.id));
      const eligibleOwners = new Set();
      for (const ownerId of new Set(selected.map(m => m.ownerId))) {
        try { if (crewMember(await authorize(ownerId))) eligibleOwners.add(ownerId); }
        catch (error) {
          if (!(error instanceof CommandError) || error.status >= 500) throw error;
        }
      }
      return scheduleTransaction(prisma, actor, async tx => {
        const currentPersonnel = await tx.personnelMember.findMany({ where: { guildId: actor.guildId, membershipConfirmedAt: { not: null }, rsiHandle: { not: null } }, select: { discordId: true, rsiHandle: true, membershipConfirmedAt: true } });
        const currentUsers = await tx.user.findMany({ where: { isActive: true, discordId: { in: currentPersonnel.map(p => p.discordId) } }, select: { id: true, discordId: true, isActive: true } });
        const currentMatches = new Map(matchRegistryOwners(fleet.vehicles, currentPersonnel, currentUsers).map(m => [m.vehicle.id, m.ownerId]));
        if (selected.some(m => eligibleOwners.has(m.ownerId) && currentMatches.get(m.vehicle.id) !== m.ownerId))
          throw new CommandError(409, "OWNER_IDENTITY_CHANGED", "A registry owner match changed. Reload before importing.");
        let imported = 0, existing = 0, conflicts = 0;
        for (const { vehicle, ownerId } of selected) {
          if (!eligibleOwners.has(ownerId)) continue;
          const model = vehicle.model?.name?.trim();
          if (!model || model.length > 100) continue;
          const externalRef = `fleetyards:${vehicle.id}`;
          const prior = await tx.commandShip.findUnique({ where: { guildId_externalRef: { guildId: actor.guildId, externalRef } } });
          if (prior) { if (prior.ownerId === ownerId) existing++; else conflicts++; continue; }
          const name = (vehicle.name?.trim() || model).slice(0, 100);
          const ship = await tx.commandShip.create({ data: { guildId: actor.guildId, ownerId, name, model, externalRef } });
          await tx.auditLog.create({ data: { actorId: actor.id, action: "COMMAND_FLEET_REGISTRY_IMPORTED", targetType: "CommandShip", targetId: ship.id, metadata: { externalRef, ownerId, source: "FleetYards public registry", verification: "PENDING" } } });
          imported++;
        }
        // Owner/member checks are refreshed before committing the imported declarations.
        for (const ownerId of eligibleOwners) {
          if (!crewMember(await authorize(ownerId))) throw new CommandError(403, "OWNER_INELIGIBLE", "An owner’s membership changed. Please retry.");
        }
        const fresh = await authorize(userId);
        if (!crewMember(fresh) || (isOfficer(actor.roleIds) && !isOfficer(fresh.roleIds))) throw new CommandError(403, "ACTOR_CHANGED", "Your permissions changed. Please retry.");
        return { imported, existing, conflicts, unmatched: matches.filter(m => !m.ownerId).length };
      });
    },
  };
}
