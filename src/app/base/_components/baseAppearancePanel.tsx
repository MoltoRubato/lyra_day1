import { useState } from "react";
import { BASE_ICONS } from "~/app/_components/baseIcons";

export const COLOR_PALETTE = [
  [
    "#ffdce5",
    "#fde8d8",
    "#fdf5d4",
    "#d1f7c4",
    "#c2f5e9",
    "#d0effd",
    "#cfdfff",
    "#fce4f9",
    "#ede2fe",
    "#e8e8e8",
  ],
  [
    "#f82b60",
    "#ff6f2c",
    "#fcb400",
    "#20c933",
    "#00b2a0",
    "#18bfff",
    "#2d7ff9",
    "#ff08c2",
    "#8b46ff",
    "#444444",
  ],
];

function renderMarkdown(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(
      /^### (.+)$/gm,
      "<h3 style='font-size:13px;font-weight:700;margin:12px 0 4px'>$1</h3>",
    )
    .replace(
      /^## (.+)$/gm,
      "<h2 style='font-size:15px;font-weight:700;margin:14px 0 4px'>$1</h2>",
    )
    .replace(
      /^# (.+)$/gm,
      "<h1 style='font-size:17px;font-weight:700;margin:16px 0 6px'>$1</h1>",
    )
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(
      /`(.+?)`/g,
      "<code style='background:#f0f0f0;padding:1px 4px;border-radius:3px;font-size:11px;font-family:monospace'>$1</code>",
    )
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      "<a href='$2' target='_blank' style='color:#0069ff;text-decoration:underline'>$1</a>",
    )
    .replace(
      /^[-*] (.+)$/gm,
      "<li style='margin:2px 0;padding-left:4px'>$1</li>",
    )
    .replace(
      /(<li[\s\S]*?<\/li>)/g,
      "<ul style='padding-left:16px;list-style:disc;margin:6px 0'>$1</ul>",
    )
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
  base: {
    name: string;
    color: string;
    icon: string;
    guide: string | null;
    starred: boolean;
  };
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
  const DEFAULT_GUIDE = `Use this space to share the goals and details of your base with your team.\n\nStart by outlining your goal.\n\nNext, share details about key information in your base:\n\nThis table contains...\n\nThis view shows...\n\nThis link contains...`;
  const [guideText, setGuideText] = useState(base.guide ?? DEFAULT_GUIDE);

  const filteredIcons = BASE_ICONS.filter(
    (i) =>
      !iconSearch.trim() ||
      i.label.toLowerCase().includes(iconSearch.toLowerCase()),
  );

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed top-[52px] left-[52px] z-50 w-[480px] overflow-hidden rounded-xl border border-[#e0e0e0] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#f0f0f0] px-5 pt-5 pb-3">
          <span className="text-[17px] font-semibold text-[#172b4d]">
            {base.name}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleStar}
              className={`text-lg transition-colors ${base.starred ? "text-yellow-400" : "text-[#ccc] hover:text-yellow-400"}`}
            >
              ★
            </button>
            <button className="text-[#999] transition-colors hover:text-[#555]">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <circle cx="3" cy="8" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="13" cy="8" r="1.5" />
              </svg>
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100vh-120px)] overflow-y-auto">
          <div className="px-5 py-4">
            <div className="mb-4 flex items-center gap-1.5">
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="#172b4d"
                strokeWidth="1.4"
              >
                <path d="M7 1a6 6 0 100 12A6 6 0 007 1zM2.5 9C4 8 5.5 7.5 7 7.5s3 .5 4.5 1.5" />
                <circle cx="7" cy="5" r="1.5" />
              </svg>
              <span className="text-[13px] font-bold text-[#172b4d]">
                Appearance
              </span>
            </div>

            <div className="mb-4 flex w-fit overflow-hidden rounded border border-[#e0e0e0]">
              {(["color", "icon"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-5 py-1.5 text-[13px] capitalize transition-colors ${
                    tab === t
                      ? "z-10 -m-px rounded border border-[#0069ff] bg-white font-medium text-[#172b4d]"
                      : "bg-[#f8f8f8] text-[#666] hover:bg-[#f0f0f0]"
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
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded transition-transform hover:scale-110"
                        style={{ background: hex }}
                      >
                        {base.color === hex && (
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                          >
                            <path
                              d="M2 7l4 4 6-7"
                              stroke="white"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
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
                <div className="mb-3 flex items-center gap-2 rounded border border-[#e0e0e0] px-3 py-1.5">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    stroke="#aaa"
                    strokeWidth="1.5"
                  >
                    <circle cx="5" cy="5" r="3.5" />
                    <path d="M8 8l2.5 2.5" />
                  </svg>
                  <input
                    className="flex-1 text-[12px] text-[#172b4d] placeholder-[#aaa] outline-none"
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
                      className={`flex h-9 w-9 items-center justify-center rounded transition-all hover:scale-110 ${
                        base.icon === icon.id
                          ? "ring-2 ring-[#0069ff] ring-offset-1"
                          : "hover:bg-[#f5f5f4]"
                      }`}
                      style={{
                        background:
                          base.icon === icon.id ? base.color : undefined,
                      }}
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
                        <span
                          className="text-[10px] font-bold"
                          style={{
                            color: base.icon === icon.id ? "white" : "#666",
                          }}
                        >
                          Un
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-[#f0f0f0]">
            <button
              className="flex w-full items-center gap-2 px-5 py-3 transition-colors hover:bg-[#f8f8f8]"
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
              <span className="text-[13px] font-bold text-[#172b4d]">
                Base guide
              </span>
            </button>

            {guideOpen && (
              <div className="px-5 pb-5">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[12px] text-[#888]">
                    Supports Markdown
                  </span>
                  <div className="flex items-center gap-1">
                    {guideMode === "view" ? (
                      <button
                        onClick={() => setGuideMode("edit")}
                        className="rounded px-2 py-0.5 text-[12px] text-[#0069ff] transition-colors hover:bg-[#f0f7ff] hover:underline"
                      >
                        Edit
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => setGuideMode("view")}
                          className="rounded px-2 py-0.5 text-[12px] text-[#888] transition-colors hover:bg-[#f5f5f5] hover:text-[#555]"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            onUpdateGuide(guideText);
                            setGuideMode("view");
                          }}
                          className="rounded bg-[#0069ff] px-3 py-0.5 text-[12px] text-white transition-colors hover:bg-[#0055d4]"
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
                    className="w-full resize-none rounded border border-[#e0e0e0] p-3 font-mono text-[13px] leading-relaxed text-[#172b4d] outline-none focus:border-[#0069ff]"
                    value={guideText}
                    onChange={(e) => setGuideText(e.target.value)}
                  />
                ) : (
                  <div
                    className="min-h-[60px] cursor-text text-[13px] leading-relaxed text-[#444]"
                    onClick={() => setGuideMode("edit")}
                    dangerouslySetInnerHTML={{
                      __html: `<p style='margin:6px 0'>${renderMarkdown(guideText)}</p>`,
                    }}
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
