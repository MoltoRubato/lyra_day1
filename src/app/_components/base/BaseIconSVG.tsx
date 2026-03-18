"use client";
import { BASE_ICONS } from "~/app/_components/baseIcons";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { getBaseIconForegroundColor } from "~/app/_components/baseAppearanceColors";

export function BaseIconSVG({ iconId, color, size = 28 }: { iconId: string; color: string; size?: number }) {
  const def = BASE_ICONS.find((i) => i.id === iconId);
  const iconColor = getBaseIconForegroundColor(color);
  return (
    <div
      className="rounded-[8px] flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, background: color, fontSize: size * 0.36 }}
    >
      {def?.path ? (
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 16 16"
          fill="none"
          stroke={iconColor}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={def.path} />
        </svg>
      ) : (
        <AirtableAssetIcon
          asset={453}
          alt="Airtable base icon"
          tintColor={iconColor}
          style={{ width: size * 0.75, height: size * 0.6372 }}
        />
      )}
    </div>
  );
}
