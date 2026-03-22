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
      className={`box-border flex flex-grow items-center overflow-hidden rounded text-left transition-colors ${
        collapsed
          ? "h-10 w-10 justify-center p-0"
          : "h-[38.5px] w-[216px] pl-2 pr-0 py-2"
      } ${
        active ? "bg-[#f2f4f8] text-[#1d1f25]" : "text-[#1d1f25] hover:bg-[#f5f5f4]"
      } text-[15px] font-medium leading-[22.5px]`}
      style={{
        fontFamily:
          '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
      }}
    >
      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center ${active ? "text-[#1d1f25]" : "text-[#1d1f25]"}`}>{icon}</span>
      {!collapsed && <span className="block flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-left text-[15px] font-medium leading-[22.5px]">{label}</span>}
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
