import Image from "next/image";
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
  const width =
    typeof mergedStyle.width === "number" ? mergedStyle.width : (size ?? 16);
  const height =
    typeof mergedStyle.height === "number" ? mergedStyle.height : (size ?? 16);

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
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      unoptimized
      className={className}
      style={mergedStyle}
      draggable={false}
    />
  );
}
