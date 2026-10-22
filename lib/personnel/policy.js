export const PERSONNEL_CHANNELS = { officers: "1318677652835532902", announcements: "1182947312465625088" };

export const PERSONNEL_ROLES = {
  visitor: "1193387275510370374",
  foundling: "1122535749271683082",
  wolfDragoon: "1120183152430825532",
  rallyMaster: "1318669443227975710",
  platoonSergeant: "1318668777881211023",
  fieldMarshal: "1318669440119734362",
  member: "1319052362261725214",
  houseWolf: "1357688449871646873",
  lieutenant: "1318673103424852092",
  captain: "1308253899357950034",
  fleetCommander: "1318668938854273077",
  armor: "1125067962827690065",
  highCouncilor: "1184242838507094186",
  hand: "1119837295097434263",
  warlord: "1119791005382750288",
};

export const OFFICER_ROLE_IDS = [PERSONNEL_ROLES.lieutenant, PERSONNEL_ROLES.captain, PERSONNEL_ROLES.fleetCommander, PERSONNEL_ROLES.armor, PERSONNEL_ROLES.highCouncilor, PERSONNEL_ROLES.hand, PERSONNEL_ROLES.warlord];

export const SERVICE_RANKS = [
  { key: "foundling", name: "Foundling", roleId: PERSONNEL_ROLES.foundling, months: 0, approvals: 0, duty: "Learn the code, train beside the Dragoons, and build the trust on which every contract depends.", charge: "Carry the House Wolf banner with humility. Learn your craft, honor your word, and answer the call of your clan." },
  { key: "wolfDragoon", name: "Wolf Dragoon", roleId: PERSONNEL_ROLES.wolfDragoon, months: 6, approvals: 1, duty: "Serve as a dependable warrior of the clan, uphold operational discipline, and support your squad through every contract.", charge: "Stand ready beside your fellow Dragoons. Protect the warrior on your flank and let your conduct speak for the House." },
  { key: "rallyMaster", name: "Rally Master", roleId: PERSONNEL_ROLES.rallyMaster, months: 12, approvals: 2, duty: "Rally warriors to the mission, help new Dragoons find their footing, and strengthen the cohesion of the squad.", charge: "Set the example before giving the order. Turn individual resolve into a shared purpose, and leave no warrior without a place in the formation." },
  { key: "platoonSergeant", name: "Platoon Sergeant", roleId: PERSONNEL_ROLES.platoonSergeant, months: 18, approvals: 3, duty: "Guide squads in the field, maintain readiness and clear communications, and translate the intent of command into disciplined action.", charge: "Know the strengths of your warriors. Mentor your Rally Masters, hold the line when the contract turns against us, and remain accountable to those you lead." },
  { key: "fieldMarshal", name: "Field Marshal", roleId: PERSONNEL_ROLES.fieldMarshal, months: 24, approvals: 3, duty: "Coordinate multiple units with the Officer Corps, oversee readiness, align deployments, and guide the leaders entrusted with executing the plan.", charge: "Mentor the Platoon Sergeants under your charge. Lead with resolve, uphold discipline without sacrificing judgment, and ensure every warrior is prepared and supported." },
];

export function addCalendarMonths(date, months) {
  const result = new Date(date);
  if (!Number.isFinite(result.getTime()) || !Number.isInteger(months) || months < 0) throw new Error("Invalid service date or duration");
  const day = result.getUTCDate();
  result.setUTCDate(1);
  result.setUTCMonth(result.getUTCMonth() + months);
  const end = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
  result.setUTCDate(Math.min(day, end));
  return result;
}

export function nextServiceRank(roleId) {
  const index = SERVICE_RANKS.findIndex((rank) => rank.roleId === roleId);
  return index < 0 ? null : SERVICE_RANKS[index + 1] || null;
}

export function promotionReviewDelay(roleId) {
  if ([PERSONNEL_ROLES.wolfDragoon, PERSONNEL_ROLES.rallyMaster].includes(roleId)) return 6;
  if ([PERSONNEL_ROLES.platoonSergeant, PERSONNEL_ROLES.fieldMarshal].includes(roleId)) return 12;
  throw new Error("This rank does not support promotion review reminders.");
}

export function serviceRankFromRoles(roleIds) {
  if (OFFICER_ROLE_IDS.some((roleId) => roleIds.includes(roleId))) return null;
  const ranks = SERVICE_RANKS.filter((rank) => roleIds.includes(rank.roleId));
  return ranks.length === 1 ? ranks[0] : null;
}

export function evaluatePromotionVotes(votes, approvalsRequired) {
  const distinct = new Map(votes.map((vote) => [vote.voterDiscordId, vote]));
  const ballots = [...distinct.values()];
  const approvals = ballots.filter((vote) => vote.decision === "APPROVE").length;
  const rejections = ballots.filter((vote) => vote.decision === "REJECT").length;
  const score = approvals - rejections;
  if (ballots.some((vote) => vote.isVeto && vote.decision === "REJECT")) return { status: "VETOED", approvals, rejections, score };
  const enough = score >= approvalsRequired;
  return { status: enough ? "APPROVED" : "REVIEW", approvals, rejections, score };
}

export function promotionRoleChanges(targetRoleId, sourceRoleId = null, buyerRoleId = null) {
  const rank = SERVICE_RANKS.find((candidate) => candidate.roleId === targetRoleId);
  if (!rank) throw new Error("Unsupported promotion rank");
  return targetRoleId === PERSONNEL_ROLES.foundling
    ? { add: [targetRoleId, PERSONNEL_ROLES.member, PERSONNEL_ROLES.houseWolf], remove: [PERSONNEL_ROLES.visitor, buyerRoleId].filter(Boolean) }
    : { add: [targetRoleId], remove: sourceRoleId ? [sourceRoleId] : [] };
}

export function formatVerseDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid effective date");
  const month = new Intl.DateTimeFormat("en-GB", { month: "long", timeZone: "UTC" }).format(date);
  return `${date.getUTCDate()} ${month}, ${date.getUTCFullYear() + 930}`;
}

export function canManageCommand({ actorId, actorRoles, command, memberRoles, roleId }) {
  const isWarlord = actorRoles.includes(PERSONNEL_ROLES.warlord);
  const ownsCommand = command.captainDiscordIds.includes(actorId) || (!command.captainDiscordIds.length && actorRoles.includes(command.commandRoleId));
  return (isWarlord || (actorRoles.includes(PERSONNEL_ROLES.captain) && ownsCommand))
    && memberRoles.includes(PERSONNEL_ROLES.member)
    && memberRoles.includes(PERSONNEL_ROLES.houseWolf)
    && command.allowedRoleIds.includes(roleId)
    && !Object.values(PERSONNEL_ROLES).includes(roleId)
    && roleId !== command.commandRoleId;
}

export const COMMAND_DEFINITIONS = [
  { key: "tacops", name: "TACOPS", commandRole: "TACOPS - Command", captainDiscordIds: ["261698704468213763"], roles: ["TACOPS - Dire Wolfs", "TACOPS - Howlers"] },
  { key: "specops", name: "SPECOPS", commandRole: "SPECOPS - Command", captainDiscordIds: [], roles: ["SPECOPS - Wolfen", "SPECOPS - Medic", "SPECOPS - Inquisitor"] },
  { key: "locops", name: "LOCOPS", commandRole: "LOCOPS - Command", captainDiscordIds: ["173989558877159424"], roles: ["LOCOPS - Heavy Lift", "LOCOPS - Salvage", "LOCOPS - Mining", "LOCOPS - Engineer"] },
  { key: "arcops", name: "ARCOPS", commandRole: "ARCOPS - Command", captainDiscordIds: [], roles: ["ARCOPS - Chimeras", "ARCOPS - Wayfinders", "ARCOPS - Replicators"] },
];
