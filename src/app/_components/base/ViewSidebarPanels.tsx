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
            { id: "GRID", label: "Grid", asset: 236 },
            { id: "CAL", label: "Calendar", asset: 375 },
            { id: "GAL", label: "Gallery", asset: 233 },
            { id: "KANBAN", label: "Kanban", asset: 207 },
            { id: "TIMELINE", label: "Timeline", asset: 39, team: true },
            { id: "LIST", label: "List", asset: 184 },
            { id: "GANTT", label: "Gantt", asset: 252, team: true, dividerAfter: true },
            { id: "FORM", label: "Form", asset: 259, dividerAfter: true },
            { id: "SECTION", label: "Section", asset: 63, team: true },
          ].map((item) => (
            <div key={item.id}>
              <button
                onClick={() => onSelectType(item.id as ViewType)}
                className="w-full flex items-center gap-2 px-4 py-2.5 hover:bg-[#f8f8f8] text-left"
              >
                <AirtableAssetIcon asset={item.asset} alt="" size={16} />
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
      <div className="fixed inset-0 z-30 bg-black/10" onClick={onClose} />
      <div
        className="fixed z-40 top-[140px] w-[560px] bg-white border border-[#e0e0e0] rounded-xl shadow-2xl p-5"
        style={{ left }}
      >
        <input
          autoFocus
          value={name}
          placeholder="View name..."
          className="w-full bg-white border-2 border-[#2d7ff9] rounded px-3 py-2.5 text-[14px] outline-none"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") onSubmit();
            if (e.key === "Escape") onClose();
          }}
        />

        <div className="mt-4 text-[15px] font-semibold text-[#111827]">Who can edit</div>
        <div className="mt-2 flex items-center gap-4 text-[13px] text-[#1f2937]">
          <label className="flex items-center gap-2 cursor-pointer">
            <span className="w-4 h-4 rounded-full border border-[#bcd6ff] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-[#2d7ff9]" />
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="6" cy="5" r="2.2" />
                <circle cx="11.5" cy="6" r="1.8" />
                <path d="M2 13c0-2.2 2-3.5 4-3.5s4 1.3 4 3.5" />
              </svg>
              Collaborative
            </span>
          </label>
          <label className="flex items-center gap-2 text-[#9aa0a6]">
            <span className="w-4 h-4 rounded-full border border-[#d7dbe0]" />
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <circle cx="8" cy="5" r="2.4" />
                <path d="M3 13c.2-2.4 2.5-3.6 5-3.6s4.8 1.2 5 3.6" />
              </svg>
              Personal
              <span className="ml-1 text-[10px] text-[#2d7ff9] border border-[#2d7ff9] rounded-full w-4 h-4 flex items-center justify-center">★</span>
            </span>
          </label>
          <label className="flex items-center gap-2 text-[#9aa0a6]">
            <span className="w-4 h-4 rounded-full border border-[#d7dbe0]" />
            <span className="flex items-center gap-1.5">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4">
                <rect x="3.5" y="7" width="9" height="6" rx="1.5" />
                <path d="M5.5 7V5a2.5 2.5 0 015 0v2" />
              </svg>
              Locked
              <span className="ml-1 text-[10px] text-[#2d7ff9] border border-[#2d7ff9] rounded-full w-4 h-4 flex items-center justify-center">★</span>
            </span>
          </label>
        </div>
        <div className="mt-2 text-[12px] text-[#6b7280]">All collaborators can edit the configuration</div>

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
