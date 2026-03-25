import type { ColumnType } from "@prisma/client";

const DEFAULT_STATUS_LABELS = ["Todo", "In progress", "Done"] as const;
const TASK_VERBS = [
  "Plan",
  "Review",
  "Draft",
  "Audit",
  "Finalize",
  "Coordinate",
  "Ship",
  "Refine",
  "Launch",
  "Triage",
  "Sync",
  "Polish",
] as const;
const TASK_TOPICS = [
  "onboarding refresh",
  "launch checklist",
  "customer briefing",
  "integration cleanup",
  "design polish",
  "support handoff",
  "workspace migration",
  "sprint goals",
  "incident follow-up",
  "sales pipeline",
  "partner rollout",
  "quality review",
] as const;
const FIRST_NAMES = [
  "Harvey",
  "Ed",
  "Jasmine",
  "Ari",
  "Mina",
  "Lucas",
  "Noah",
  "Ava",
  "Sofia",
  "Mason",
  "Zoe",
  "Elijah",
  "Ruby",
  "Theo",
  "Ivy",
  "Liam",
] as const;
const LAST_NAMES = [
  "Graham",
  "Wisoky",
  "Quitzon",
  "Singh",
  "Park",
  "Chen",
  "Foster",
  "Reyes",
  "Patel",
  "Morgan",
  "Kim",
  "Brooks",
  "Diaz",
  "Wells",
  "Price",
  "Bennett",
] as const;
const COMPANY_PREFIXES = [
  "Northwind",
  "Summit",
  "Pioneer",
  "Lumen",
  "Atlas",
  "Acorn",
  "Harbor",
  "Cinder",
  "Evergreen",
  "Signal",
  "Cobalt",
  "Maple",
] as const;
const COMPANY_SUFFIXES = [
  "Labs",
  "Systems",
  "Works",
  "Partners",
  "Dynamics",
  "Studio",
  "Collective",
  "Group",
  "Network",
  "Cloud",
  "Ventures",
  "Supply",
] as const;
const NOTE_WORDS = [
  "aligned",
  "backlog",
  "briefing",
  "cadence",
  "clarify",
  "cohort",
  "context",
  "coverage",
  "deliverable",
  "followup",
  "handoff",
  "insight",
  "iteration",
  "milestone",
  "outreach",
  "pipeline",
  "quality",
  "roadmap",
  "signal",
  "staging",
  "summary",
  "timeline",
  "tracking",
  "workflow",
] as const;
const SUMMARY_OPENERS = [
  "Captured the main points",
  "Summarized the latest notes",
  "Highlighted the key risks",
  "Collected the open questions",
] as const;
const DOMAIN_LABELS = [
  "example.com",
  "northwind.dev",
  "summit.ai",
  "acorn.io",
  "atlas.app",
  "signal.co",
] as const;
const HOST_LABELS = [
  "workspace",
  "portal",
  "status",
  "app",
  "updates",
  "docs",
] as const;
const ATTACHMENT_LABELS = [
  "brief",
  "summary",
  "proposal",
  "notes",
  "plan",
  "report",
] as const;

export function stableHash(input: string) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return hash >>> 0;
}

function pickValue(values: readonly string[], hash: number) {
  return values[hash % values.length]!;
}

function slugify(input: string) {
  return input
    .toLowerCase()
    .replaceAll(/[^a-z0-9 ]/g, "")
    .trim()
    .replaceAll(/\s+/g, "-");
}

function dotSlug(input: string) {
  return input
    .toLowerCase()
    .replaceAll(/[^a-z0-9 ]/g, "")
    .trim()
    .replaceAll(/\s+/g, ".");
}

function titleFromHash(hash: number) {
  return `${pickValue(TASK_VERBS, hash)} ${pickValue(TASK_TOPICS, hash >>> 3)}`;
}

function personFromHash(hash: number) {
  return `${pickValue(FIRST_NAMES, hash)} ${pickValue(LAST_NAMES, hash >>> 4)}`;
}

function companyFromHash(hash: number) {
  return `${pickValue(COMPANY_PREFIXES, hash)} ${pickValue(COMPANY_SUFFIXES, hash >>> 5)}`;
}

function wordsFromHashes(primaryHash: number, secondaryHash: number, count: number) {
  const words: string[] = [];

  for (let i = 0; i < count; i += 1) {
    const nextHash =
      (primaryHash + secondaryHash * (i + 1) + 2_654_435_761 * i) >>> 0;
    words.push(pickValue(NOTE_WORDS, nextHash));
  }

  return words.join(" ");
}

function sentenceFromHashes(primaryHash: number, secondaryHash: number, count: number) {
  const text = wordsFromHashes(primaryHash, secondaryHash, count);
  return text.charAt(0).toUpperCase() + text.slice(1) + ".";
}

function makeSeeds(rowId: string, columnId: string) {
  return {
    primaryHash: stableHash(`${rowId}:${columnId}:primary`),
    secondaryHash: stableHash(`${rowId}:${columnId}:secondary`),
  };
}

export function makeGeneratedCellValue(params: {
  columnType: ColumnType;
  columnName: string;
  rowId: string;
  columnId: string;
  selectOptionLabels: string[];
}) {
  const { columnType, columnName, rowId, columnId, selectOptionLabels } = params;
  const { primaryHash, secondaryHash } = makeSeeds(rowId, columnId);
  const lowerName = columnName.toLowerCase();

  switch (columnType) {
    case "CHECKBOX":
      return primaryHash % 2 === 0 ? "true" : "false";
    case "NUMBER":
      return String(10 + (primaryHash % 4_990));
    case "CURRENCY":
      return ((500 + (primaryHash % 125_000)) / 100).toFixed(2);
    case "PERCENT":
      return String(primaryHash % 100);
    case "RATING":
      return String(1 + (primaryHash % 5));
    case "DATE": {
      const date = new Date(
        Date.UTC(2026, 0, 1) + (primaryHash % 365) * 86_400_000,
      );
      return date.toISOString().slice(0, 10);
    }
    case "EMAIL": {
      const personSlug = dotSlug(personFromHash(primaryHash)) || "person";
      return `${personSlug}${secondaryHash % 100}@${pickValue(DOMAIN_LABELS, secondaryHash)}`;
    }
    case "URL":
      return `https://${pickValue(HOST_LABELS, primaryHash)}.${pickValue(DOMAIN_LABELS, secondaryHash)}/${slugify(titleFromHash((primaryHash + secondaryHash) >>> 0))}`;
    case "PHONE":
      return `+1 ${200 + (primaryHash % 700)}-${String(100 + (secondaryHash % 900)).padStart(3, "0")}-${String(1000 + (primaryHash % 9000)).padStart(4, "0")}`;
    case "DURATION":
      return `${15 * (1 + (primaryHash % 24))}m`;
    case "USER":
      return personFromHash(primaryHash);
    case "ATTACHMENT":
      return `https://files.example.com/${slugify(companyFromHash(primaryHash))}/${pickValue(ATTACHMENT_LABELS, secondaryHash)}-${(secondaryHash % 500) + 1}.pdf`;
    case "SINGLE_SELECT":
      if (selectOptionLabels.length > 0) {
        return pickValue(selectOptionLabels, primaryHash);
      }
      return pickValue(DEFAULT_STATUS_LABELS, primaryHash);
    case "MULTI_SELECT":
      if (selectOptionLabels.length >= 2) {
        return `${pickValue(selectOptionLabels, primaryHash)},${pickValue(selectOptionLabels, secondaryHash)}`;
      }
      if (selectOptionLabels.length === 1) return selectOptionLabels[0]!;
      return `${pickValue(DEFAULT_STATUS_LABELS, primaryHash)},${pickValue(DEFAULT_STATUS_LABELS, secondaryHash)}`;
    case "LONG_TEXT":
      if (lowerName.includes("summary")) {
        return `${pickValue(SUMMARY_OPENERS, primaryHash)}. ${sentenceFromHashes(primaryHash, secondaryHash, 8)}`;
      }
      return sentenceFromHashes(primaryHash, secondaryHash, 8);
    default:
      if (lowerName.includes("assignee") || lowerName.includes("owner")) {
        return personFromHash(primaryHash);
      }
      if (lowerName.includes("company") || lowerName.includes("account")) {
        return companyFromHash(primaryHash);
      }
      return titleFromHash(primaryHash);
  }
}
