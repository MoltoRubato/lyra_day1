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

const FIELD_ICON_DIMENSIONS: Record<string, { width: number; height: number }> = {
  TEXT: { width: 10, height: 9.5 },
  LONG_TEXT: { width: 12, height: 9.25 },
  ATTACHMENT: { width: 11, height: 13 },
  SINGLE_SELECT: { width: 13, height: 13 },
  USER: { width: 13.12, height: 12.5 },
  DATE: { width: 12, height: 13 },
  PHONE: { width: 12.48, height: 12.48 },
  EMAIL: { width: 13, height: 10 },
  URL: { width: 11.98, height: 11.98 },
  NUMBER: { width: 12, height: 12 },
  CURRENCY: { width: 8.99, height: 14 },
  PERCENT: { width: 11, height: 11 },
  DURATION: { width: 13, height: 13 },
};

function FieldIconFrame({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-4 w-4 items-center justify-center">{children}</span>;
}

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
    const dimensions = FIELD_ICON_DIMENSIONS[type] ?? { width: 14, height: 14 };
    return (
      <FieldIconFrame>
        <AirtableAssetIcon
          asset={assetByType[type]}
          alt=""
          className={className}
          style={{ width: dimensions.width, height: dimensions.height }}
        />
      </FieldIconFrame>
    );
  }

  if (type === "CHECKBOX") {
    return (
      <FieldIconFrame>
        <svg width="12" height="12" viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.3">
          <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />
          <path d="M4.6 8.1l2.1 2.2 4.4-4.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </FieldIconFrame>
    );
  }
  if (type === "MULTI_SELECT") {
    return (
      <FieldIconFrame>
        <svg width="12" height="10" viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.3">
          <path d="M3 4.5h10M3 8h7.5M3 11.5h10" strokeLinecap="round" />
        </svg>
      </FieldIconFrame>
    );
  }
  if (type === "RATING") {
    return (
      <FieldIconFrame>
        <svg width="13.99" height="13.5" viewBox="0 0 16 16" className={className} fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M8 2.2l1.77 3.57 3.94.57-2.85 2.78.67 3.92L8 11.24l-3.53 1.8.67-3.92L2.3 6.34l3.94-.57L8 2.2z" />
        </svg>
      </FieldIconFrame>
    );
  }
  return (
    <FieldIconFrame>
      <span className={className}>A</span>
    </FieldIconFrame>
  );
}
