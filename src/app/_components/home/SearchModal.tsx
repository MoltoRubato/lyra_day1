import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { timeAgo } from "~/app/_components/home/helpers";
import { StarIco } from "~/app/_components/home/icons";
import type { BaseItem, WsFull } from "~/app/_components/home/types";
import { BaseIcon } from "~/app/_components/home/ui";

export function SearchModal({ bases, workspaces, onClose }: {
  bases: BaseItem[];
  workspaces: WsFull[];
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const q = query.trim().toLowerCase();

  const sortedBases = [...bases].sort((a, b) => {
    const ta = a.lastOpenedAt ? new Date(a.lastOpenedAt as unknown as string).getTime() : 0;
    const tb = b.lastOpenedAt ? new Date(b.lastOpenedAt as unknown as string).getTime() : 0;
    return tb - ta;
  });

  const filteredBases = sortedBases.filter((b) => !q || b.name.toLowerCase().includes(q));
  const filteredWs = workspaces.filter((w) => !q || w.name.toLowerCase().includes(q));

  return (
    <>
      <div className="fixed inset-0 z-50" onClick={onClose}/>

      <div className="fixed left-1/2 -translate-x-1/2 top-[56px] z-50 w-[640px] bg-white rounded-xl shadow-2xl overflow-hidden border border-[#e0e0e0]">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0f0f0]">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="text-[#333] flex-shrink-0" stroke="currentColor" strokeWidth="1.8">
            <circle cx="7.5" cy="7.5" r="5.5"/><path d="M12.5 12.5L16 16" strokeLinecap="round"/>
          </svg>
          <input ref={inputRef}
            className="flex-1 text-[15px] text-[#172b4d] outline-none placeholder-[#aaa] bg-transparent"
            placeholder="Search..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}/>
        </div>

        <div className="max-h-[380px] overflow-y-auto pl-[6px]">
          {!q && (
            <p className="text-[11px] font-semibold text-[#888] px-3 pt-3 pb-1.5">Recently opened</p>
          )}
          {q && filteredWs.length > 0 && filteredWs.map((ws) => (
            <button key={ws.id}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#f5f5f4] transition-colors text-left rounded-lg"
              onClick={onClose}>
              <div className="w-9 h-9 rounded-lg bg-[#c2bce8] flex items-center justify-center flex-shrink-0">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="5" cy="5" r="3" fill="white" fillOpacity="0.9"/>
                  <circle cx="11" cy="5" r="3" fill="white" fillOpacity="0.7"/>
                  <circle cx="5" cy="11" r="3" fill="white" fillOpacity="0.7"/>
                  <circle cx="11" cy="11" r="3" fill="white" fillOpacity="0.5"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-[#172b4d] truncate">{ws.name}</span>
                  {ws.starred && <span className="text-yellow-400 text-[11px]"><StarIco/></span>}
                </div>
                <p className="text-[11px] text-[#888]">Workspace</p>
              </div>
              <span className="text-[11px] text-[#aaa] flex-shrink-0">Last opened just now</span>
            </button>
          ))}
          {filteredBases.map((base) => (
            <Link key={base.id} href={base.id.startsWith("temp-") ? "#" : `/base/${base.id}`}
              className="flex items-center gap-3 px-3 py-2.5 hover:bg-[#f5f5f4] transition-colors rounded-lg"
              onClick={onClose}>
              <BaseIcon base={base} size={36}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-medium text-[#172b4d] truncate">{base.name}</span>
                  {base.starred && <span className="text-yellow-400 text-[11px]"><StarIco/></span>}
                  <span className="text-[13px] text-[#aaa]">- Base</span>
                </div>
                <p className="text-[11px] text-[#888]">{base.workspace?.name ?? "No workspace"}</p>
              </div>
              <span className="text-[11px] text-[#aaa] flex-shrink-0">Last opened {timeAgo(base.lastOpenedAt).replace("Opened ", "")}</span>
            </Link>
          ))}
          {filteredBases.length === 0 && filteredWs.length === 0 && (
            <p className="text-[13px] text-[#888] text-center py-8">No results for &ldquo;{query}&rdquo;</p>
          )}
        </div>

        <div className="border-t border-[#f0f0f0] px-4 py-2.5 flex items-center gap-1.5">
          <span className="text-[13px] text-[#aaa]">Press</span>
          <kbd className="text-[11px] text-[#555] bg-[#f5f5f4] border border-[#e0e0e0] rounded px-1.5 py-0.5 font-mono">CTRL K</kbd>
          <span className="text-[13px] text-[#aaa]">any time to search</span>
        </div>
      </div>
    </>
  );
}


