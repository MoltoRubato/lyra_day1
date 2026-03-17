"use client";
import { BASE_ICONS } from "~/app/_components/baseIcons";

export function BaseIconSVG({ iconId, color, size = 28 }: { iconId: string; color: string; size?: number }) {
  const def = BASE_ICONS.find((i) => i.id === iconId);
  const isDefault = !def?.path;
  return (
    <div
      className="rounded flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, background: isDefault ? "transparent" : color, fontSize: size * 0.36 }}
    >
      {def?.path ? (
        <svg
          width={size * 0.6}
          height={size * 0.6}
          viewBox="0 0 16 16"
          fill="none"
          stroke="white"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={def.path} />
        </svg>
      ) : (
        <img
          src="/airtable_assets/Airtable_logo_without_words.png"
          alt="Airtable"
          draggable={false}
          style={{ width: size * 0.86, height: size * 0.86 }}
        />
      )}
    </div>
  );
}
