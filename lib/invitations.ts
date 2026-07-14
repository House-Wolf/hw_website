export type DivisionBrief = {
  code: "TACOPS" | "LOCOPS" | "SPECOPS" | "ARCOPS";
  title: string;
  quote: string;
  summary: string;
  patchImagePath: string;
  glowClass: string;
};

export type DragoonPillar = {
  name: "Strength" | "Honor" | "Death";
  creed: string;
  summary: string;
  iconPath: string;
};

export type HouseWolfInvitation = {
  code: string;
  citizenName: string;
  rsiHandle: string;
  issuedAt: string;
  expiresAt?: string;
  reference: string;
  rsiOrgUrl: string;
  discordUrl: string;
};

type InvitationRecord = Omit<HouseWolfInvitation, "code" | "rsiOrgUrl" | "discordUrl">;

const DEFAULT_RSI_ORG_URL =
  process.env.NEXT_PUBLIC_RSI_ORG_URL ??
  "https://robertsspaceindustries.com/en/orgs/CUTTERWOLF";

const DEFAULT_DISCORD_URL = "https://discord.gg/housewolf";

const INVITATION_RECORDS: Record<string, InvitationRecord> = {
  "SENTINEL-WOLF-HW2601": {
    citizenName: "Sentinel Wolf",
    rsiHandle: "Sentinel_Wolf",
    issuedAt: "July 14, 2026",
    expiresAt: "August 13, 2026",
    reference: "HW-REC-2601",
  },
};

export const DIVISION_BRIEFS: DivisionBrief[] = [
  {
    code: "TACOPS",
    title: "Tactical Operations",
    quote: "When the battle ignites, we lead the charge.",
    summary: "Combat aviation, security, escort duty, air superiority, and coordinated strike operations.",
    patchImagePath: "/images/divisions/tacops/tacops.png",
    glowClass: "from-red-900/35 via-obsidian to-obsidian border-red-500/35",
  },
  {
    code: "LOCOPS",
    title: "Logistics Operations",
    quote: "Wars are won by those who can sustain them.",
    summary: "Mining, salvage, transport, trade, industry, repair, and the supply lines that keep the pack moving.",
    patchImagePath: "/images/divisions/locops/locops.png",
    glowClass: "from-yellow-900/25 via-obsidian to-obsidian border-yellow-500/35",
  },
  {
    code: "SPECOPS",
    title: "Special Operations",
    quote: "Silent when needed. Relentless when unleashed.",
    summary: "Reconnaissance, security response, combat medicine, infiltration, extraction, and specialized missions.",
    patchImagePath: "/images/divisions/specops/specops.png",
    glowClass: "from-emerald-900/25 via-obsidian to-obsidian border-emerald-500/35",
  },
  {
    code: "ARCOPS",
    title: "Advanced Research and Cartography",
    quote: "We map the unknown so others may conquer it.",
    summary: "Exploration, research, crafting, frontier operations, survey work, and knowledge gathering.",
    patchImagePath: "/images/divisions/arcops/arcops.png",
    glowClass: "from-cyan-900/25 via-obsidian to-obsidian border-cyan-500/35",
  },
];

export const DRAGOON_PILLARS: DragoonPillar[] = [
  {
    name: "Strength",
    creed: "Strength is life",
    summary: "The strong earn the authority to lead, protect, and shape what comes next.",
    iconPath: "/images/code/strength.png",
  },
  {
    name: "Honor",
    creed: "Honor is life",
    summary: "Every action and every battle must be measured by honor.",
    iconPath: "/images/code/honor.png",
  },
  {
    name: "Death",
    creed: "Death is life",
    summary: "A Dragoon dies as they lived: with strength, honor, and purpose.",
    iconPath: "/images/code/death.png",
  },
];

export function normalizeInviteCode(code: string): string {
  const cleaned = decodeURIComponent(code)
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  return cleaned.length > 0 ? cleaned.toUpperCase() : "FIELD-INVITATION-HW0000";
}

export function getInvitation(rawCode: string): HouseWolfInvitation {
  const code = normalizeInviteCode(rawCode);
  const record = INVITATION_RECORDS[code] ?? deriveInvitationFromCode(code);

  return {
    code,
    ...record,
    rsiOrgUrl: DEFAULT_RSI_ORG_URL,
    discordUrl: DEFAULT_DISCORD_URL,
  };
}

export function getInvitationLetter(invitation: HouseWolfInvitation): string[] {
  return [
    `Citizen ${invitation.rsiHandle},`,
    "Your actions, character, and potential have drawn the attention of House Wolf.",
    "We are not merely an organization of independent pilots. We are a united force of soldiers, industrialists, explorers, specialists, and citizens who understand that survival among the stars is achieved through discipline, loyalty, and strength of purpose.",
    "You are hereby formally invited to stand among the Kamposian Dragoons and take your place within the ranks of House Wolf.",
    "Those who accept this invitation will gain more than an organization tag. They will gain a pack - citizens who fight together, build together, and answer the call when one of their own is in need.",
    "Should you accept, report to House Wolf command and complete your induction into the pack.",
    "The stars reward the capable. The frontier respects the prepared. The wolf survives because the pack stands together.",
    "Strength in unity. Victory in battle.",
    "Hunt as One.",
  ];
}

export function buildSpectrumTransmission(invitation: HouseWolfInvitation): string {
  return [
    `House Wolf Command has issued a formal invitation under reference ${invitation.reference}.`,
    `RSI Handle: ${invitation.rsiHandle}`,
    `Secure transmission: https://housewolf.co/invite/${invitation.code}`,
    "Review the packet, accept the call through RSI, and report to command through Discord when ready.",
    "Hunt as One.",
  ].join("\n");
}

function deriveInvitationFromCode(code: string): InvitationRecord {
  const referenceNumber = code.match(/HW(\d{3,})$/)?.[1] ?? stableNumericCode(code);
  const handleRoot = code.replace(/-?HW\d{3,}$/i, "") || "HOUSE-WOLF-CANDIDATE";
  const rsiHandle = handleRoot
    .split(/[-_]+/)
    .filter(Boolean)
    .map(toHandleSegment)
    .join("_");

  return {
    citizenName: rsiHandle.replace(/_/g, " "),
    rsiHandle,
    issuedAt: formatDate(new Date()),
    expiresAt: formatDate(addDays(new Date(), 30)),
    reference: `HW-REC-${referenceNumber}`,
  };
}

function stableNumericCode(value: string): string {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 10000;
  }

  return hash.toString().padStart(4, "0");
}

function toHandleSegment(segment: string): string {
  const lower = segment.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}
