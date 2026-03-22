function AssetIco({
  asset,
  size = 15,
  width,
  height,
  className = "",
  style,
}: {
  asset: number;
  size?: number;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const fileName = `Asset ${asset}Airtable.svg`;
  const src = `/airtable_assets/${encodeURIComponent(fileName)}`;
  return (
    <img
      src={src}
      alt=""
      width={width ?? size}
      height={height ?? size}
      className={className}
      style={style}
      draggable={false}
    />
  );
}

function NavIconFrame({ children }: { children: React.ReactNode }) {
  return <span className="inline-flex h-[20px] w-[20px] items-center justify-center">{children}</span>;
}

export const HomeIco = () => (
  <NavIconFrame>
    <AssetIco asset={217} width={15} height={15.4} />
  </NavIconFrame>
);
export const SidebarStarIco = () => (
  <NavIconFrame>
    <AssetIco asset={70} width={17.5} height={16.87} />
  </NavIconFrame>
);
export const StarIco = ({ size = 15, active = false, className = "" }: { size?: number; active?: boolean; className?: string }) => (
  active ? (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} fill="#f7b500" aria-hidden="true">
      <path d="M8 1.9l1.8 3.66 4.04.59-2.92 2.84.69 4.01L8 11.18l-3.61 1.9.69-4.01L2.16 6.15l4.04-.59L8 1.9z" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" width={size} height={size} className={className} fill="none" stroke="#838A95" strokeWidth="1.35" aria-hidden="true">
      <path d="M8 2.3l1.72 3.5 3.86.56-2.79 2.72.66 3.84L8 11.1l-3.45 1.82.66-3.84L2.42 6.36l3.86-.56L8 2.3z" />
    </svg>
  )
);
export const SharedIco = () => (
  <NavIconFrame>
    <AssetIco asset={96} width={16.25} height={13.75} />
  </NavIconFrame>
);
export const WsIco = ({ size }: { size?: number } = {}) =>
  size ? (
    <AssetIco asset={14} size={size} />
  ) : (
    <NavIconFrame>
      <AssetIco asset={14} width={19.38} height={14.04} />
    </NavIconFrame>
  );
export const PencilIco = ({ size = 11 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M8.5 1.5L10.5 3.5L4 10H2V8L8.5 1.5Z" strokeLinejoin="round"/></svg>;
export const MoveIco = ({ size = 11 }: { size?: number }) => <AssetIco asset={152} size={size + 4} />;
export const TrashIco = ({ size = 11 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.3"><path d="M2 2L10 10M10 2L2 10" strokeLinecap="round"/></svg>;
export const ChevronRight = ({ className = "" }: { className?: string }) => (
  <AssetIco asset={345} width={5} height={9} className={`opacity-45 ${className}`} />
);
export const ListIco = () => <AssetIco asset={187} size={14} />;
export const GridIco = () => <AssetIco asset={234} size={14} />;
export const ThreeDotsIco = ({ size = 14, className = "" }: { size?: number; className?: string }) => (
  <AssetIco asset={152} size={size} className={className} />
);
export const RenameMenuIco = ({ size = 14 }: { size?: number }) => <AssetIco asset={141} size={size} />;
export const DuplicateMenuIco = ({ size = 14 }: { size?: number }) => <AssetIco asset={320} size={size} />;
export const MoveMenuIco = ({ size = 14 }: { size?: number }) => <AssetIco asset={434} size={size} />;
export const GoToWorkspaceMenuIco = ({ size = 14 }: { size?: number }) => <AssetIco asset={14} size={size} />;
export const CustomizeMenuIco = ({ size = 14 }: { size?: number }) => <AssetIco asset={150} size={size} />;
export const DeleteMenuIco = ({ size = 14 }: { size?: number }) => <AssetIco asset={32} size={size} />;
