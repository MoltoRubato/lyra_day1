import { BASE_ICONS } from "~/app/_components/baseIcons";
import { getContrastTextColor } from "~/app/_components/baseAppearanceColors";
import { fallbackColor } from "~/app/_components/home/helpers";
import type { BaseItem } from "~/app/_components/home/types";

export function BaseIcon({
  base,
  size = 28,
}: {
  base: Pick<BaseItem, "id" | "name" | "color" | "icon">;
  size?: number;
}) {
  const color = base.color ?? fallbackColor(base.id);
  const def = base.icon && base.icon !== "default" ? BASE_ICONS.find((i) => i.id === base.icon) : null;
  const textColor = getContrastTextColor(color);
  const abbrev =
    base.name.length >= 2
      ? base.name[0]!.toUpperCase() + base.name[1]!.toLowerCase()
      : (base.name[0]?.toUpperCase() ?? "?");
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-[6px] border border-black/30 font-semibold"
      style={{
        width: size,
        height: size,
        background: color,
        color: textColor,
        fontSize: Math.round(size * 0.36),
        lineHeight: 1,
      }}
    >
      {def?.path ? (
        <svg
          width={Math.round(size * 0.58)}
          height={Math.round(size * 0.58)}
          viewBox="0 0 16 16"
          fill="none"
          stroke={textColor}
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={def.path} />
        </svg>
      ) : (
        abbrev
      )}
    </div>
  );
}

export function WorkspaceIcon({ size = 28 }: { size?: number }) {
  return (
    <div
      className="rounded flex items-center justify-center bg-[#4d3f85] text-white flex-shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={Math.round(size * 0.54)} height={Math.round(size * 0.54)} viewBox="0 0 14 14" fill="none">
        <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9" />
        <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.7" />
        <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.7" />
        <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5" />
      </svg>
    </div>
  );
}

export function NavBtn({
  icon,
  label,
  active,
  collapsed,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  collapsed: boolean;
  onClick: () => void;
  children?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex h-10 w-full items-center gap-2 rounded px-3 text-[13px] leading-[18px] transition-colors ${
        active ? "bg-[#f2f4f8] text-[#172b4d] font-medium" : "text-[#374151] hover:bg-[#f5f5f4] hover:text-[#172b4d]"
      } ${collapsed ? "justify-center" : ""}`}
    >
      <span className={`flex-shrink-0 ${active ? "text-[#172b4d]" : "text-[#6b7280]"}`}>{icon}</span>
      {!collapsed && <span className="flex-1 text-left text-[13px] leading-[18px]">{label}</span>}
      {!collapsed && children}
    </button>
  );
}

export function ActionBtn({
  children,
  onClick,
  title,
  danger = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title?: string;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className={`p-1.5 rounded transition-colors ${
        danger ? "text-[#bbb] hover:text-red-500 hover:bg-red-50" : "text-[#bbb] hover:text-[#555] hover:bg-[#ebebeb]"
      }`}
    >
      {children}
    </button>
  );
}
