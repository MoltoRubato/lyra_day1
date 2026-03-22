import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { FIELD_TYPES, FIELD_TYPE_GROUPS } from "~/app/_components/tableUtils";
import { FieldTypeIcon } from "~/app/_components/gridView/tableShared";

export type SelectOption = {
  id: string;
  label: string;
  color: string;
  order: number;
  columnId: string;
};

const OPTION_COLORS = [
  "#2d7b6b",
  "#7c3aed",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#ec4899",
];

export function FieldTypePicker({
  current,
  onSelect,
}: {
  current: string;
  onSelect: (t: string) => void;
}) {
  return (
    <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-52 overflow-y-auto rounded-xl border border-[#e2e5e9] bg-white p-1 shadow-xl">
      {FIELD_TYPE_GROUPS.map((group) => (
        <div key={group.label}>
          <p className="px-2 pb-1 pt-2 text-[9px] uppercase tracking-widest text-[#9ca3af]">
            {group.label}
          </p>
          {group.types.map((t) => {
            const f = FIELD_TYPES[t]!;
            return (
              <button
                key={t}
                onClick={() => onSelect(t)}
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13px] transition-colors ${
                  current === t
                    ? "bg-[#e8f5f1] text-[#166254]"
                    : "text-[#4b5563] hover:bg-[#f5f6f8] hover:text-[#1f2937]"
                }`}
              >
                <span className="inline-flex w-4 items-center justify-center">
                  <FieldTypeIcon type={t} className="text-[#9ca3af]" />
                </span>
                {f.label}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function OptionsPanel({
  columnId: _columnId,
  options,
  onAdd,
  onDelete,
  onUpdate,
}: {
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
    <div
      className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-[#e2e5e9] bg-white p-3 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <p className="mb-2 text-[9px] uppercase tracking-widest text-[#9ca3af]">Options</p>

      <div className="mb-3 max-h-48 space-y-1 overflow-y-auto">
        {options.map((opt) => (
          <div key={opt.id} className="group/opt flex items-center gap-2">
            {editingId === opt.id ? (
              <input
                autoFocus
                className="flex-1 rounded-lg border border-[#166254] bg-white px-2 py-0.5 text-[13px] text-[#1f2937] outline-none"
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                onBlur={() => {
                  onUpdate(opt.id, editLabel, opt.color);
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    onUpdate(opt.id, editLabel, opt.color);
                    setEditingId(null);
                  }
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <>
                <span
                  className="h-3 w-3 flex-shrink-0 rounded-full"
                  style={{ background: opt.color }}
                />
                <span
                  className="flex-1 cursor-pointer text-[13px] text-[#4b5563]"
                  onDoubleClick={() => {
                    setEditingId(opt.id);
                    setEditLabel(opt.label);
                  }}
                >
                  {opt.label}
                </span>
                <div className="hidden gap-0.5 group-hover/opt:flex">
                  {OPTION_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => onUpdate(opt.id, opt.label, c)}
                      className="h-2.5 w-2.5 rounded-full border border-white/50 transition-transform hover:scale-125"
                      style={{ background: c }}
                    />
                  ))}
                </div>
                <button
                  onClick={() => onDelete(opt.id)}
                  className="ml-1 text-[10px] text-[#9ca3af] opacity-0 transition-all group-hover/opt:opacity-100 hover:text-red-500"
                >
                  x
                </button>
              </>
            )}
          </div>
        ))}
        {options.length === 0 && (
          <p className="text-[13px] italic text-[#9ca3af]">No options yet</p>
        )}
      </div>

      <div className="flex items-center gap-1 border-t border-[#e2e5e9] pt-2">
        <div className="relative">
          <div
            className="h-5 w-5 cursor-pointer rounded-full border border-[#e2e5e9]"
            style={{ background: newColor }}
            onClick={(e) => {
              e.stopPropagation();
              setShowPalette((p) => !p);
            }}
          />
          {showPalette && (
            <div
              className="absolute bottom-full left-0 mb-1 flex gap-0.5 rounded-lg border border-[#e2e5e9] bg-white p-1 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {OPTION_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => {
                    setNewColor(c);
                    setShowPalette(false);
                  }}
                  className="h-4 w-4 rounded-full border border-white/50 transition-transform hover:scale-110"
                  style={{ background: c }}
                />
              ))}
            </div>
          )}
        </div>
        <input
          className="flex-1 rounded-lg border border-[#e2e5e9] bg-white px-2 py-0.5 text-[13px] text-[#1f2937] outline-none placeholder-[#9ca3af] focus:border-[#166254]"
          placeholder="New option..."
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newLabel.trim()) {
              onAdd(newLabel.trim(), newColor);
              setNewLabel("");
            }
          }}
        />
        <button
          onClick={() => {
            if (newLabel.trim()) {
              onAdd(newLabel.trim(), newColor);
              setNewLabel("");
            }
          }}
          className="rounded-lg bg-[#166254] px-2 py-0.5 text-[13px] text-white transition-colors hover:bg-[#124f43]"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function SelectCell({
  cellId,
  openSelectCell,
  setOpenSelectCell,
  value,
  options,
  multi,
  onSelect,
}: {
  cellId: string;
  openSelectCell: string | null;
  setOpenSelectCell: (id: string | null) => void;
  value: string;
  options: SelectOption[];
  multi: boolean;
  onSelect: (v: string) => void;
}) {
  const isOpen = openSelectCell === cellId;
  const [query, setQuery] = useState("");
  const selected = multi
    ? value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : value
      ? [value]
      : [];
  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!isOpen) setQuery("");
  }, [isOpen]);

  function toggle(label: string) {
    if (multi) {
      const next = selected.includes(label)
        ? selected.filter((s) => s !== label)
        : [...selected, label];
      onSelect(next.join(", "));
      return;
    }

    onSelect(selected[0] === label ? "" : label);
    setOpenSelectCell(null);
  }

  return (
    <div
      className="relative h-full w-full"
      onClick={(e) => {
        e.stopPropagation();
        setOpenSelectCell(isOpen ? null : cellId);
      }}
    >
      <div
        className={`flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded border px-2 transition-colors ${
          isOpen
            ? "border-[#1f7ae0] bg-white shadow-[0_0_0_1px_#1f7ae0]"
            : "border-transparent bg-transparent hover:border-[#d3d9e2] hover:bg-white"
        }`}
      >
        <div className="flex min-h-[20px] flex-1 flex-wrap items-center gap-1 overflow-hidden">
          {selected.length === 0 ? (
            <span className="block h-5 w-full" aria-hidden="true" />
          ) : (
            selected.map((lbl) => {
              const opt = options.find((o) => o.label === lbl);
              return (
                <span
                  key={lbl}
                  className="rounded-full px-3 py-1 text-[13px] leading-5 text-[#1d1f25]"
                  style={{ background: `${opt?.color ?? "#166254"}40` }}
                >
                  {lbl}
                </span>
              );
            })
          )}
        </div>
        <svg
          viewBox="0 0 12 12"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          className={`h-3.5 w-3.5 text-[#6b7280] transition-transform ${isOpen ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M2.5 4.5L6 8l3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      {isOpen && (
        <div
          className="absolute left-[-2px] top-full z-50 mt-0 w-[calc(100%+4px)] overflow-hidden rounded-b-md border border-t-0 border-[#cfd5de] bg-white shadow-[0_12px_20px_rgba(15,23,42,0.14)]"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-[#d3d9e2] bg-white px-2 py-1">
            <input
              autoFocus
              role="combobox"
              aria-label="Find an option"
              placeholder="Find an option"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Escape") setOpenSelectCell(null);
              }}
              className="h-8 w-full border-0 bg-transparent px-2 py-0 text-[13px] text-[#1d1f25] outline-none placeholder-[#8a8f99]"
            />
          </div>

          <div className="max-h-60 overflow-y-auto py-2">
            <button
              role="option"
              aria-selected={selected.length === 0}
              onClick={() => {
                onSelect("");
                if (!multi) setOpenSelectCell(null);
              }}
              className="mb-1 flex h-8 w-full items-center rounded px-3 text-left text-[13px] text-transparent hover:bg-[#e8edf5]"
            >
              None
            </button>

            {filteredOptions.map((opt) => (
              <button
                key={opt.id}
                role="option"
                aria-selected={selected.includes(opt.label)}
                onClick={() => toggle(opt.label)}
                className="mb-1 flex w-full items-center rounded px-3 py-1 text-left hover:bg-[#e8edf5]"
              >
                <span
                  className="rounded-full px-3 py-1 text-[13px] leading-5 text-[#1d1f25]"
                  style={{ background: `${opt.color}40` }}
                >
                  {opt.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AttachmentCell({
  value,
  onUpload,
}: {
  value: string;
  onUpload: (url: string) => void;
}) {
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
      const data = (await res.json()) as { url: string; name: string };
      onUpload(data.url);
    } finally {
      setUploading(false);
    }
  }

  if (value) {
    const isImage = /\.(png|jpe?g|gif|webp|svg)$/i.test(value);
    return (
      <div className="flex items-center gap-1 text-[13px]">
        {isImage ? (
          <Image
            src={value}
            alt="attachment"
            width={24}
            height={24}
            unoptimized
            className="h-6 w-6 rounded object-cover"
          />
        ) : (
          <span className="text-[10px]">Attachment</span>
        )}
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="max-w-[120px] truncate text-[11px] text-[#166254] hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {value.split("/").pop()}
        </a>
        <button
          onClick={(e) => {
            e.stopPropagation();
            fileRef.current?.click();
          }}
          className="ml-auto text-[10px] text-[#9ca3af] transition-colors hover:text-[#4b5563]"
        >
          Upload
        </button>
        <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        fileRef.current?.click();
      }}
      className="flex items-center gap-1 text-[11px] text-[#9ca3af] transition-colors hover:text-[#4b5563]"
    >
      {uploading ? "Uploading..." : "Upload"}
      <input ref={fileRef} type="file" className="hidden" onChange={handleFile} />
    </button>
  );
}

