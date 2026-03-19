import type { SummaryOption } from "./tableTypes";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";

export const GROUP_DEPTH_COLORS = [
  { bg: "#f0f4f8", text: "#374151", border: "#e2e8f0", dot: "#6b7280" },
  { bg: "#f5f3ff", text: "#5b21b6", border: "#ede9fe", dot: "#8b5cf6" },
  { bg: "#fff7ed", text: "#9a3412", border: "#fed7aa", dot: "#f97316" },
];

export const SUMMARY_OPTIONS: SummaryOption[] = [
  "None",
  "Empty",
  "Filled",
  "Unique",
  "Percent Empty",
  "Percent Filled",
  "Percent Unique",
];

export function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function FieldTypeIcon({
  type,
  className = "text-[#111827]",
}: {
  type: string;
  className?: string;
}) {
  const assetByType: Record<string, number> = {
    TEXT: 53,
    LONG_TEXT: 51,
    USER: 19,
    DATE: 375,
    PHONE: 137,
    EMAIL: 289,
    URL: 190,
    NUMBER: 228,
    CURRENCY: 313,
    PERCENT: 140,
    DURATION: 335,
    SINGLE_SELECT: 372,
    ATTACHMENT: 279,
  };

  if (assetByType[type]) {
    return <AirtableAssetIcon asset={assetByType[type]} alt="" size={14} className={className} />;
  }

  const common = { width: 14, height: 14, viewBox: "0 0 14 14", fill: "none" } as const;
  if (type === "CHECKBOX") {
    return (
      <svg {...common} className={className} stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="2" width="10" height="10" rx="1.5" />
        <path d="M4.2 7.1l1.9 2 3.7-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (type === "NUMBER" || type === "CURRENCY" || type === "PERCENT") {
    return <span className={className}>#</span>;
  }
  if (type === "MULTI_SELECT") {
    return (
      <svg {...common} className={className} stroke="currentColor" strokeWidth="1.3">
        <path d="M3 4h8M3 7h6M3 10h8" strokeLinecap="round" />
      </svg>
    );
  }
  if (type === "DATE") {
    return (
      <svg {...common} className={className} stroke="currentColor" strokeWidth="1.3">
        <rect x="2" y="3" width="10" height="9" rx="1.5" />
        <path d="M2 5.5h10M4.5 2v3M9.5 2v3" strokeLinecap="round" />
      </svg>
    );
  }
  return <span className={className}>A</span>;
}
