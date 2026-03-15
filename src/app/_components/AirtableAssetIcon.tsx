import type { CSSProperties } from "react";

type AirtableAssetIconProps = {
  asset: number;
  alt?: string;
  className?: string;
  size?: number;
  style?: CSSProperties;
};

export function AirtableAssetIcon({
  asset,
  alt = "",
  className,
  size,
  style,
}: AirtableAssetIconProps) {
  const fileName = `Asset ${asset}Airtable.svg`;
  const src = `/airtable_assets/${encodeURIComponent(fileName)}`;
  const dimensionStyle = size ? { width: size, height: size } : undefined;

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={{ ...dimensionStyle, ...style }}
      draggable={false}
      loading="lazy"
    />
  );
}
