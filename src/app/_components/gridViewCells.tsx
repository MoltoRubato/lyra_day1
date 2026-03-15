import { useRef, useState } from "react";
import { FIELD_TYPES, FIELD_TYPE_GROUPS } from "~/app/_components/tableUtils";

export type SelectOption = { id: string; label: string; color: string; order: number; columnId: string };

const OPTION_COLORS = [
  "#2d7b6b", "#7c3aed", "#ef4444", "#f97316",
  "#eab308", "#22c55e", "#06b6d4", "#ec4899",
];

export function FieldTypePicker({ current, onSelect }: { current: string; onSelect: (t: string) => void }) {
  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-[#e2e5e9] rounded-xl shadow-xl p-1 w-52 max-h-72 overflow-y-auto">
      {FIELD_TYPE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="text-[9px] uppercase tracking-widest text-[#9ca3af] px-2 pt-2 pb-1">{group.label}</p>
          {group.types.map((t) => {
            const f = FIELD_TYPES[t]!;
            return (
              <button key={t} onClick={() => onSelect(t)}
                className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors ${
                  current === t ? "bg-[#e8f5f1] text-[#166254]" : "text-[#4b5563] hover:bg-[#f5f6f8] hover:text-[#1f2937]"
                }`}>
                <span className="w-4 text-center text-[#9ca3af]">{f.icon}</span> {f.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function OptionsPanel({ columnId: _columnId, options, onAdd, onDelete, onUpdate }: {
  columnId: string;
  options: SelectOption[];
  onAdd: (label: string, color: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, label: string, color: string) => void;
}) {
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(OPTION_COLORS[0]!);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [showPalette, setShowPalette] = useState(false);

  return (
    <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-[#e2e5e9] rounded-xl shadow-xl p-3 w-64"
      onClick={(e) => e.stopPropagation()}>
      <p className="text-[9px] uppercase tracking-widest text-[#9ca3af] mb-2">Options</p>

      <div className="space-y-1 mb-3 max-h-48 overflow-y-auto">
        {options.map((opt) => (
          <div key={opt.id} className="flex items-center gap-2 group/opt">
            {editingId === opt.id ? (
              <input autoFocus
                className="flex-1 bg-white border border-[#166254] rounded-lg px-2 py-0.5 text-xs outline-none text-[#1f2937]"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={() => { onUpdate(opt.id, editLabel, opt.color); setEditingId(null); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { onUpdate(opt.id, editLabel, opt.color); setEditingId(null); }
                  if (e.key === "Escape") setEditingId(null);
                }}/>
            ) : (
              <>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: opt.color }}/>
                <span className="flex-1 text-xs text-[#4b5563] cursor-pointer"
                  onDoubleClick={() => { setEditingId(opt.id); setEditLabel(opt.label); }}>
                  {opt.label}
                </span>
                <div className="hidden group-hover/opt:flex gap-0.5">
                  {OPTION_COLORS.map((c) => (
                    <button key={c} onClick={() => onUpdate(opt.id, opt.label, c)}
                      className="w-2.5 h-2.5 rounded-full transition-transform hover:scale-125 border border-white/50"
                      style={{ background: c }}/>
                  ))}
                </div>
                <button onClick={() => onDelete(opt.id)}
                  className="opacity-0 group-hover/opt:opacity-100 text-[#9ca3af] hover:text-red-500 text-[10px] ml-1 transition-all">✕</button>
              </>
            )}
          </div>
        ))}
        {options.length === 0 && <p className="text-xs text-[#9ca3af] italic">No options yet</p>}
      </div>

      <div className="flex items-center gap-1 border-t border-[#e2e5e9] pt-2">
        <div className="relative">
          <div className="w-5 h-5 rounded-full cursor-pointer border border-[#e2e5e9]"
            style={{ background: newColor }}
            onClick={(e) => { e.stopPropagation(); setShowPalette((p) => !p); }}/>
          {showPalette && (
            <div className="absolute bottom-full mb-1 left-0 flex gap-0.5 bg-white border border-[#e2e5e9] rounded-lg p-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}>
              {OPTION_COLORS.map((c) => (
                <button key={c} onClick={() => { setNewColor(c); setShowPalette(false); }}
                  className="w-4 h-4 rounded-full hover:scale-110 transition-transform border border-white/50"
                  style={{ background: c }}/>
              ))}
            </div>
          )}
        </div>
        <input
          className="flex-1 bg-white border border-[#e2e5e9] rounded-lg px-2 py-0.5 text-xs outline-none focus:border-[#166254] text-[#1f2937] placeholder-[#9ca3af]"
          placeholder="New option…"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newLabel.trim()) { onAdd(newLabel.trim(), newColor); setNewLabel(""); }
          }}/>
        <button
          onClick={() => { if (newLabel.trim()) { onAdd(newLabel.trim(), newColor); setNewLabel(""); } }}
          className="px-2 py-0.5 bg-[#166254] hover:bg-[#124f43] text-white rounded-lg text-xs transition-colors">
          +
        </button>
      </div>
    </div>
  );
}

export function SelectCell({ cellId, openSelectCell, setOpenSelectCell, value, options, multi, onSelect }: {
  cellId: string;
  openSelectCell: string | null;
  setOpenSelectCell: (id: string | null) => void;
  value: string;
  options: SelectOption[];
  multi: boolean;
  onSelect: (v: string) => void;
}) {
  const isOpen = openSelectCell === cellId;
  const selected = multi
    ? value.split(",").map((s) => s.trim()).filter(Boolean)
    : value ? [value] : [];

  function toggle(label: string) {
    if (multi) {
      const next = selected.includes(label)
        ? selected.filter((s) => s !== label)
        : [...selected, label];
      onSelect(next.join(", "));
    } else {
      onSelect(selected[0] === label ? "" : label);
      setOpenSelectCell(null);
    }
  }

  return (
    <div className="relative" onClick={(e) => { e.stopPropagation(); setOpenSelectCell(isOpen ? null : cellId); }}>
      <div className="flex flex-wrap gap-1 min-h-[18px] cursor-pointer">
        {selected.map((lbl) => {
          const opt = options.find((o) => o.label === lbl);
          return (
            <span key={lbl} className="text-[10px] px-1.5 py-0.5 rounded font-medium"
              style={{
                background: (opt?.color ?? "#166254") + "1a",
                color: opt?.color ?? "#166254",
                border: `1px solid ${opt?.color ?? "#166254"}40`,
              }}>
              {lbl}
            </span>
          );
        })}
        {selected.length === 0 && <span className="text-[#d1d5db] text-[11px]">—</span>}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1 bg-white border border-[#e2e5e9] rounded-xl shadow-xl p-1 w-48 max-h-56 overflow-y-auto"
          onClick={(e) => e.stopPropagation()}>
          {options.length === 0 && (
            <p className="text-xs text-[#9ca3af] p-2">No options — use the ⚙ icon to add some.</p>
          )}
          {options.map((opt) => (
            <button key={opt.id} onClick={() => toggle(opt.label)}
              className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-[#f5f6f8]">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: opt.color }}/>
              <span className="text-xs text-[#1f2937] flex-1">{opt.label}</span>
              {selected.includes(opt.label) && <span className="text-[#166254] text-xs">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AttachmentCell({ value, onUpload }: { value: string; onUpload: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json() as { url: string; name: string };
      onUpload(data.url);
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(value);
    return (
      <div className="flex items-center gap-1 text-xs">
        {isImage
          ? <img src={value} alt="attachment" className="h-6 w-6 object-cover rounded"/>
          : <span className="text-[10px]">📎</span>}
        <a href={value} target="_blank" rel="noopener noreferrer"
          className="text-[#166254] hover:underline truncate max-w-[120px] text-[11px]"
          onClick={(e) => e.stopPropagation()}>
          {value.split("/").pop()}
        </a>
        <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
          className="text-[#9ca3af] hover:text-[#4b5563] text-[10px] ml-auto transition-colors">↑</button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile}/>
      </div>
    );
  }

  return (
    <button onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
      className="flex items-center gap-1 text-[11px] text-[#9ca3af] hover:text-[#4b5563] transition-colors">
      {uploading ? "Uploading…" : <><span>📎</span> Upload</>}
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile}/>
    </button>
  );
}
