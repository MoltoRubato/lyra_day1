type BaseColorFamily = {
  id: string;
  light: string;
  light3: string;
  bright: string;
  dusty: string;
  aliases?: string[];
};

export type BaseShadeLevel = "light" | "bright" | "dusty";

export const BASE_COLOR_FAMILIES: BaseColorFamily[] = [
  { id: "red", light: "#ffd4e0", light3: "#fff2fa", bright: "#dc043b", dusty: "#99455a", aliases: ["#ffdce5", "#f82b60"] },
  { id: "orange", light: "#ffe0cc", light3: "#ffece3", bright: "#d54401", dusty: "#944d37", aliases: ["#fde8d8", "#ff6f2c"] },
  { id: "yellow", light: "#ffeab6", light3: "#fff6dd", bright: "#ffba05", dusty: "#a26811", aliases: ["#fdf5d4", "#fcb400"] },
  { id: "green", light: "#cff5d1", light3: "#e6fce8", bright: "#048a0e", dusty: "#407c4a", aliases: ["#d1f7c4", "#20c933"] },
  { id: "teal", light: "#c1f5f0", light3: "#e4fbfb", bright: "#01ddd5", dusty: "#0d7f78", aliases: ["#c2f5e9", "#00b2a0"] },
  { id: "cyan", light: "#c4ecff", light3: "#e3fafd", bright: "#39caff", dusty: "#107da3", aliases: ["#d0effd", "#18bfff"] },
  { id: "blue", light: "#d1e2ff", light3: "#f1f5ff", bright: "#166ee1", dusty: "#3b66a3", aliases: ["#cfdfff", "#2d7ff9"] },
  { id: "pink", light: "#fad2fc", light3: "#fff1ff", bright: "#dd04a8", dusty: "#8c3f78", aliases: ["#fce4f9", "#ff08c2"] },
  { id: "purple", light: "#e0dafd", light3: "#fcf3ff", bright: "#7c37ef", dusty: "#63498d", aliases: ["#ede2fe", "#8b46ff"] },
  { id: "gray", light: "#e5e9f0", light3: "#f5f7fa", bright: "#616670", dusty: "#535965", aliases: ["#e8e8e8", "#444444"] },
];

export const BASE_COLOR_SWATCH_ROWS = [
  BASE_COLOR_FAMILIES.map((family) => family.light),
  BASE_COLOR_FAMILIES.map((family) => family.bright),
  BASE_COLOR_FAMILIES.map((family) => family.dusty),
] as const;

function normalizeHex(hex: string): string {
  const trimmed = hex.trim().toLowerCase();
  if (!trimmed) return trimmed;
  const prefixed = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;
  if (prefixed.length === 4) {
    const r = prefixed[1];
    const g = prefixed[2];
    const b = prefixed[3];
    if (!r || !g || !b) return prefixed;
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return prefixed;
}

const FAMILY_BY_SHADE = new Map<string, BaseColorFamily>();
const SHADE_LEVEL_BY_COLOR = new Map<string, BaseShadeLevel>();
for (const family of BASE_COLOR_FAMILIES) {
  const light = normalizeHex(family.light);
  const light3 = normalizeHex(family.light3);
  const bright = normalizeHex(family.bright);
  const dusty = normalizeHex(family.dusty);
  FAMILY_BY_SHADE.set(light, family);
  FAMILY_BY_SHADE.set(light3, family);
  FAMILY_BY_SHADE.set(bright, family);
  FAMILY_BY_SHADE.set(dusty, family);
  SHADE_LEVEL_BY_COLOR.set(light, "light");
  SHADE_LEVEL_BY_COLOR.set(light3, "light");
  SHADE_LEVEL_BY_COLOR.set(bright, "bright");
  SHADE_LEVEL_BY_COLOR.set(dusty, "dusty");
  for (const [index, aliasRaw] of (family.aliases ?? []).entries()) {
    const alias = normalizeHex(aliasRaw);
    FAMILY_BY_SHADE.set(alias, family);
    if (index === 0) SHADE_LEVEL_BY_COLOR.set(alias, "light");
    if (index === 1) SHADE_LEVEL_BY_COLOR.set(alias, "bright");
  }
}

function toRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!/^#[0-9a-f]{6}$/i.test(normalized)) return null;
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function toHex(value: number): string {
  const clamped = Math.max(0, Math.min(255, Math.round(value)));
  return clamped.toString(16).padStart(2, "0");
}

function darken(hex: string, amount: number): string {
  const rgb = toRgb(hex);
  if (!rgb) return hex;
  const ratio = Math.max(0, Math.min(1, amount));
  return `#${toHex(rgb.r * (1 - ratio))}${toHex(rgb.g * (1 - ratio))}${toHex(rgb.b * (1 - ratio))}`;
}

export function resolveBaseColorFamily(baseColor: string | null | undefined): BaseColorFamily | null {
  if (!baseColor) return null;
  return FAMILY_BY_SHADE.get(normalizeHex(baseColor)) ?? null;
}

export function getBaseShadeLevel(baseColor: string | null | undefined): BaseShadeLevel | null {
  if (!baseColor) return null;
  return SHADE_LEVEL_BY_COLOR.get(normalizeHex(baseColor)) ?? null;
}

export function getBaseTableBarColor(baseColor: string | null | undefined): string {
  const family = resolveBaseColorFamily(baseColor);
  if (family) return family.light3;
  return baseColor ?? "#ffeab6";
}

export function getBaseTableBarBorderColor(baseColor: string | null | undefined): string {
  return darken(getBaseTableBarColor(baseColor), 0.14);
}

export function getContrastTextColor(background: string): "#1d1f25" | "#ffffff" {
  const rgb = toRgb(background);
  if (!rgb) return "#1d1f25";
  const luminance = (0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b) / 255;
  return luminance > 0.72 ? "#1d1f25" : "#ffffff";
}

export function getBaseIconForegroundColor(baseColor: string): "#1d1f25" | "#ffffff" {
  const shade = getBaseShadeLevel(baseColor);
  if (shade === "dusty") return "#ffffff";
  if (shade === "light") return "#1d1f25";

  const family = resolveBaseColorFamily(baseColor);
  if (shade === "bright") {
    if (family && ["yellow", "teal", "cyan"].includes(family.id)) {
      return "#1d1f25";
    }
    return "#ffffff";
  }

  return getContrastTextColor(baseColor);
}
