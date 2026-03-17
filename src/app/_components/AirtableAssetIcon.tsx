import type { CSSProperties } from "react";

type AirtableAssetIconProps = {
  asset: number;
  alt?: string;
  className?: string;
  size?: number;
  tintColor?: string;
  style?: CSSProperties;
};

export function AirtableAssetIcon({
  asset,
  alt = "",
  className,
  size,
  tintColor,
  style,
}: AirtableAssetIconProps) {
  const fileName = `Asset ${asset}Airtable.svg`;
  const src = `/airtable_assets/${encodeURIComponent(fileName)}`;
  const dimensionStyle = size ? { width: size, height: size } : undefined;
  const mergedStyle = { ...dimensionStyle, ...style };

  if (tintColor) {
    return (
      <span
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        className={className}
        style={{
          display: "inline-block",
          backgroundColor: tintColor,
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskSize: "contain",
          maskSize: "contain",
          WebkitMaskRepeat: "no-repeat",
          maskRepeat: "no-repeat",
          WebkitMaskPosition: "center",
          maskPosition: "center",
          ...mergedStyle,
        }}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={mergedStyle}
      draggable={false}
      loading="lazy"
    />
  );
}
