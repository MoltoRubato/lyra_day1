"use client";
import type { ViewType } from "@prisma/client";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { StarIco } from "~/app/_components/home/icons";

const HollowStar = ({ size = 13 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
    <path d="M12 3l2.7 5.7 6.3.9-4.5 4.4 1.1 6.2L12 17l-5.6 3 1.1-6.2L3 9.6l6.3-.9L12 3z" />
  </svg>
);

type CreateViewMenuProps = {
  open: boolean;
  left: number;
  top: number;
  onClose: () => void;
  onSelectType: (type: ViewType) => void;
};

export function CreateViewMenu({
  open,
  left,
  top,
  onClose,
  onSelectType,
}: CreateViewMenuProps) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div
        className="fixed z-30 w-[240px] bg-white border border-[#e0e0e0] rounded-xl shadow-xl overflow-hidden text-[13px]"
        style={{ left, top }}
      >
        <div className="py-2">
          {[
            { id: "GRID", label: "Grid", asset: 236, color: "#2d7ff9" },
            { id: "CAL", label: "Calendar", asset: 375, color: "#f97316" },
            { id: "GAL", label: "Gallery", asset: 233, color: "#8b5cf6" },
            { id: "KANBAN", label: "Kanban", asset: 207, color: "#22c55e" },
            { id: "TIMELINE", label: "Timeline", asset: 39, color: "#ef4444", team: true },
            { id: "LIST", label: "List", asset: 184, color: "#3b82f6" },
            { id: "GANTT", label: "Gantt", asset: 252, color: "#14b8a6", team: true, dividerAfter: true },
            { id: "FORM", label: "Form", asset: 259, color: "#ec4899", dividerAfter: true },
            { id: "SECTION", label: "Section", asset: 63, color: "#111827", team: true },
          ].map((item) => (
            <div key={item.id}>
              <button
                onClick={() => onSelectType(item.id as ViewType)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-[#f8f8f8] text-left"
              >
                <AirtableAssetIcon asset={item.asset} alt="" size={16} tintColor={item.color} />
                <span>{item.label}</span>
                {item.team && (
                  <span className="ml-auto text-[10px] text-[#1d4ed8] bg-[#e0f2fe] px-2 py-0.5 rounded-full">Team</span>
                )}
              </button>
              {item.dividerAfter && <div className="border-t border-[#f0f0f0] my-1" />}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

type AddViewModalProps = {
  open: boolean;
  name: string;
  setName: (v: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  left: number;
};

export function AddViewModal({ open, name, setName, onClose, onSubmit, left }: AddViewModalProps) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-30" onClick={onClose} />
      <div
        className="fixed z-40 top-[140px] w-[400px] bg-white border border-[#e0e0e0] rounded-xl shadow-2xl p-4"
        style={{ left }}
      >
        <input
          autoFocus
          value={name}
          placeholder="View name..."
          className="w-full bg-white rounded p-1 text-[18px] font-semibold outline-none"
          style={{ border: "2px solid #2d7ff9", boxShadow: "0 0 0 2px rgba(45,127,249,0.15)" }}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
            if (e.key === "Escape") onClose();
          }}
        />

        <div className="mt-4 text-[15px] font-semibold text-[#111827]">Who can edit</div>
        <div className="mt-2 flex items-center justify-between text-[13px] text-[#1f2937]">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <span className="w-4 h-4 rounded-full border border-[#bcd6ff] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[#2d7ff9]" />
            </span>
            <AirtableAssetIcon asset={14} alt="" style={{ width: 15.5, height: 11.2 }} />
            Collaborative
          </label>
          <label className="flex items-center gap-1.5 text-[#9aa0a6]">
            <span className="w-4 h-4 rounded-full border border-[#d7dbe0]" />
            <AirtableAssetIcon asset={19} alt="" style={{ width: 13.12, height: 12.5 }} />
            Personal
            <span className="ml-0.5 text-[10px] text-[#2d7ff9] border border-[#2d7ff9] rounded-full w-4 h-4 flex items-center justify-center">★</span>
          </label>
          <label className="flex items-center gap-1.5 text-[#9aa0a6]">
            <span className="w-4 h-4 rounded-full border border-[#d7dbe0]" />
            <AirtableAssetIcon asset={181} alt="" style={{ width: 12, height: 13.5 }} />
            Locked
            <span className="ml-0.5 text-[10px] text-[#2d7ff9] border border-[#2d7ff9] rounded-full w-4 h-4 flex items-center justify-center">★</span>
          </label>
        </div>
        <div className="text-[13px] opacity-75" style={{ color: "rgb(29, 31, 37)", marginTop: 8, lineHeight: "18px" }}>All collaborators can edit the configuration</div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button onClick={onClose} className="text-[13px] text-[#555] px-2 py-1.5">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="text-[13px] bg-[#2d7ff9] hover:bg-[#2569d4] text-white px-4 py-2 rounded-lg font-medium"
          >
            Create new view
          </button>
        </div>
      </div>
    </>
  );
}

type ViewOptionsMenuProps = {
  open: boolean;
  left: number;
  top: number;
  favorites: Record<string, boolean>;
  viewId: string;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onRename: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => boolean;
  canDelete: boolean;
};

export function ViewOptionsMenu({
  open,
  left,
  top,
  favorites,
  viewId,
  onClose,
  onToggleFavorite,
  onRename,
  onDuplicate,
  onDelete,
  canDelete,
}: ViewOptionsMenuProps) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onClose} />
      <div
        className="fixed z-30 w-[240px] bg-white border border-[#e0e0e0] rounded-xl shadow-xl overflow-hidden text-[13px]"
        style={{ left, top }}
      >
        <button
          onClick={() => {
            onToggleFavorite(viewId);
            onClose();
          }}
          className="w-full text-left px-4 py-2.5 hover:bg-[#f8f8f8] flex items-center gap-2"
        >
          {favorites[viewId] ? <StarIco/> : <HollowStar/>}
          {favorites[viewId] ? "Remove from My favorites" : "Add to My favorites"}
        </button>
        <div className="border-t border-[#f0f0f0] my-1" />
        <button
          onClick={() => {
            onRename(viewId);
            onClose();
          }}
          className="w-full text-left px-4 py-2.5 hover:bg-[#f8f8f8] flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M10.5 2.5L13.5 5.5L6 13H3V10L10.5 2.5Z" strokeLinejoin="round" />
          </svg>
          Rename view
        </button>
        <button
          onClick={() => {
            onDuplicate(viewId);
            onClose();
          }}
          className="w-full text-left px-4 py-2.5 hover:bg-[#f8f8f8] flex items-center gap-2"
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <rect x="2" y="2" width="8" height="8" rx="1" />
            <rect x="6" y="6" width="8" height="8" rx="1" />
          </svg>
          Duplicate view
        </button>
        <button
          onClick={() => onDelete(viewId)}
          className={`w-full text-left px-4 py-2.5 flex items-center gap-2 ${
            canDelete ? "text-[#e5484d] hover:bg-[#fef2f2]" : "text-[#f0b4b6] cursor-not-allowed"
          }`}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
            <path d="M4 5l1 9h6l1-9M3 5h10M6 5V3h4v2" strokeLinecap="round" />
          </svg>
          Delete view
        </button>
      </div>
    </>
  );
}

