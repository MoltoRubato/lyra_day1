"use client";
import { useState } from "react";
import { BASE_ICONS } from "~/app/_components/baseIcons";

const COLOR_PALETTE = [
  ["#ffdce5", "#fde8d8", "#fdf5d4", "#d1f7c4", "#c2f5e9", "#d0effd", "#cfdfff", "#fce4f9", "#ede2fe", "#e8e8e8"],
  ["#f82b60", "#ff6f2c", "#fcb400", "#20c933", "#00b2a0", "#18bfff", "#2d7ff9", "#ff08c2", "#8b46ff", "#444444"],
];

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3 style='font-size:13px;font-weight:700;margin:12px 0 4px'>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2 style='font-size:15px;font-weight:700;margin:14px 0 4px'>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1 style='font-size:17px;font-weight:700;margin:16px 0 6px'>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code style='background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:11px;font-family:monospace'>$1</code>")
    .replace(/\[(.+?)\]\((.+?)\)/g, "<a href='$2' target='_blank' style='color:#0069ff;text-decoration:underline'>$1</a>")
    .replace(/^[-*] (.+)$/gm, "<li style='margin:2px 0;padding-left:4px'>$1</li>")
    .replace(/(<li[\s\S]*?<\/li>)/g, "<ul style='padding-left:16px;list-style:disc;margin:6px 0'>$1</ul>")
    .replace(/\n\n/g, "</p><p style='margin:6px 0'>")
    .replace(/\n/g, "<br/>");
}

export function AppearancePanel({
  base,
  onClose,
  onUpdateColor,
  onUpdateIcon,
  onUpdateGuide,
  onToggleStar,
}: {
  base: { name: string; color: string; icon: string; guide: string | null; starred: boolean };
  onClose: () => void;
  onUpdateColor: (c: string) => void;
  onUpdateIcon: (i: string) => void;
  onUpdateGuide: (g: string) => void;
  onToggleStar: () => void;
}) {
  const [tab, setTab] = useState<"color" | "icon">("color");
  const [iconSearch, setIconSearch] = useState("");
  const [guideOpen, setGuideOpen] = useState(true);
  const [guideMode, setGuideMode] = useState<"view" | "edit">("view");
  const DEFAULT_GUIDE = "Use this space to share the goals and details of your base with your team.\n\nStart by outlining your goal.\n\nNext, share details about key information in your base:\n\nThis table contains...\n\nThis view shows...\n\nThis link contains...";
  const [guideText, setGuideText] = useState(base.guide ?? DEFAULT_GUIDE);

  const filteredIcons = BASE_ICONS.filter((i) =>
    !iconSearch.trim() || i.label.toLowerCase().includes(iconSearch.toLowerCase())
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed left-[52px] top-[52px] z-50 w-[480px] bg-white border border-[#e0e0e0] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 flex items-center justify-between border-b border-[#f0f0f0]">
          <span className="text-[17px] font-semibold text-[#172b4d]">{base.name}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleStar}
              className={`transition-colors ${base.starred ? "text-yellow-400" : "text-[#bbb] hover:text-yellow-400"}`}
              title="Star"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                <path d="M10 2.5l2.2 4.6 5.1.5-3.9 3.3 1.2 5-4.6-2.6-4.6 2.6 1.2-5-3.9-3.3 5.1-.5L10 2.5z" />
              </svg>
            </button>
            <button className="text-[#999] hover:text-[#555] transition-colors">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="13" cy="8" r="1.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-120px)]">
          <div className="px-5 py-4">
            <div className="flex items-center gap-1.5 mb-4">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="#172b4d" strokeWidth="1.4">
                <path d="M7 1a6 6 0 100 12A6 6 0 007 1zM2.5 9C4 8 5.5 7.5 7 7.5s3 .5 4.5 1.5" />
                <circle cx="7" cy="5" r="1.5" />
              </svg>
              <span className="text-[13px] font-bold text-[#172b4d]">Appearance</span>
            </div>

            <div className="flex mb-4 border border-[#e0e0e0] rounded overflow-hidden w-fit">
              {(["color", "icon"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-1.5 text-[13px] transition-colors capitalize ${
                    tab === t ? "bg-white text-[#172b4d] font-medium border border-[#0069ff] -m-px rounded z-10" : "bg-[#f8f8f8] text-[#666] hover:bg-[#f0f0f0]"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {tab === "color" && (
              <div className="space-y-2">
                {COLOR_PALETTE.map((row, ri) => (
                  <div key={ri} className="flex gap-2">
                    {row.map((hex) => (
                      <button
                        key={hex}
                        onClick={() => onUpdateColor(hex)}
                        title={hex}
                        className="w-8 h-8 rounded flex items-center justify-center transition-transform hover:scale-110 flex-shrink-0"
                        style={{ background: hex }}
                      >
                        {base.color === hex && (
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                            <path d="M2 7l4 4 6-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {tab === "icon" && (
              <div>
                <div className="flex items-center gap-2 border border-[#e0e0e0] rounded px-3 py-1.5 mb-3">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#aaa" strokeWidth="1.5">
                    <circle cx="5" cy="5" r="3.5" />
                    <path d="M8 8l2.5 2.5" />
                  </svg>
                  <input
                    className="flex-1 text-[12px] outline-none text-[#172b4d] placeholder-[#aaa]"
                    placeholder="Search icons"
                    value={iconSearch}
                    onChange={(e) => setIconSearch(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {filteredIcons.map((icon) => (
                    <button
                      key={icon.id}
                      onClick={() => onUpdateIcon(icon.id)}
                      title={icon.label}
                      className={`w-9 h-9 rounded flex items-center justify-center transition-all hover:scale-110 ${
                        base.icon === icon.id ? "ring-2 ring-[#0069ff] ring-offset-1" : "hover:bg-[#f5f5f4]"
                      }`}
                      style={{ background: base.icon === icon.id ? base.color : undefined }}
                    >
                      {icon.path ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 16 16"
                          fill="none"
                          stroke={base.icon === icon.id ? "white" : "#555"}
                          strokeWidth="1.3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d={icon.path} />
                        </svg>
                      ) : (
                        <span className="text-[10px] font-bold" style={{ color: base.icon === icon.id ? "white" : "#666" }}>Un</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#f0f0f0]">
            <button
              className="w-full flex items-center gap-2 px-5 py-3 hover:bg-[#f8f8f8] transition-colors"
              onClick={() => setGuideOpen((p) => !p)}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="#555"
                strokeWidth="1.5"
                className={`transition-transform ${guideOpen ? "rotate-90" : ""}`}
              >
                <path d="M4 2l4 4-4 4" />
              </svg>
              <span className="text-[13px] font-bold text-[#172b4d]">Base guide</span>
            </button>

            {guideOpen && (
              <div className="px-5 pb-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] text-[#888]">Supports Markdown</span>
                  <div className="flex items-center gap-1">
                    {guideMode === "view" ? (
                      <button
                        onClick={() => setGuideMode("edit")}
                        className="text-[12px] text-[#0069ff] hover:underline px-2 py-0.5 rounded hover:bg-[#f0f7ff] transition-colors"
                      >
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setGuideMode("view")}
                          className="text-[12px] text-[#888] hover:text-[#555] px-2 py-0.5 rounded hover:bg-[#f5f5f5] transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onUpdateGuide(guideText);
                            setGuideMode("view");
                          }}
                          className="text-[12px] bg-[#0069ff] hover:bg-[#0055d4] text-white px-3 py-0.5 rounded transition-colors"
                        >
                          Save
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {guideMode === "edit" ? (
                  <textarea
                    autoFocus
                    rows={8}
                    className="w-full border border-[#e0e0e0] rounded p-3 text-[13px] text-[#172b4d] outline-none focus:border-[#0069ff] resize-none font-mono leading-relaxed"
                    value={guideText}
                    onChange={(e) => setGuideText(e.target.value)}
                  />
                ) : (
                  <div
                    className="text-[13px] text-[#444] leading-relaxed min-h-[60px] cursor-text"
                    onClick={() => setGuideMode("edit")}
                    dangerouslySetInnerHTML={{ __html: `<p style='margin:6px 0'>${renderMarkdown(guideText)}</p>` }}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
