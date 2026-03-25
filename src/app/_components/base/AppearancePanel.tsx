"use client";
import { useEffect, useMemo, useState } from "react";
import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";
import { BASE_ICONS } from "~/app/_components/baseIcons";
import {
  BASE_COLOR_SWATCH_ROWS,
  getBaseIconForegroundColor,
  getContrastTextColor,
} from "~/app/_components/baseAppearanceColors";

const DEFAULT_GUIDE =
  "Teammates will see this when they first open the base - add a description, goals, links, things like that.";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderInlineMarkdown(text: string): string {
  const codeTokens: string[] = [];
  let html = text.replace(/`([^`]+)`/g, (_m, code: string) => {
    const idx = codeTokens.push(code) - 1;
    return `@@CODE_${idx}@@`;
  });
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, "<a href=\"$2\" target=\"_blank\" rel=\"noreferrer\" style=\"color:#2d7ff9;text-decoration:underline\">$1</a>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  html = html.replace(/@@CODE_(\d+)@@/g, (_m, idxRaw: string) => {
    const idx = Number.parseInt(idxRaw, 10);
    const code = codeTokens[idx] ?? "";
    return `<code style="background:#eef1f5;border-radius:4px;padding:1px 4px;font-size:12px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${code}</code>`;
  });
  return html;
}

function renderMarkdownToHtml(markdown: string): string {
  const lines = escapeHtml(markdown).split(/\r?\n/);
  const chunks: string[] = [];
  let inList = false;

  const closeList = () => {
    if (inList) {
      chunks.push("</ul>");
      inList = false;
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      chunks.push("<div style=\"height:8px\"></div>");
      continue;
    }

    const listMatch = /^[-*]\s+(.+)$/.exec(trimmed);
    if (listMatch) {
      if (!inList) {
        inList = true;
        chunks.push("<ul style=\"margin:0;padding-left:18px;list-style:disc\">");
      }
      chunks.push(`<li style="margin:2px 0;line-height:1.45">${renderInlineMarkdown(listMatch[1] ?? "")}</li>`);
      continue;
    }

    closeList();
    const headingMatch = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (headingMatch) {
      const level = headingMatch[1]?.length ?? 1;
      const text = renderInlineMarkdown(headingMatch[2] ?? "");
      if (level === 1) chunks.push(`<h1 style="margin:2px 0 6px;font-size:20px;line-height:1.3;font-weight:600">${text}</h1>`);
      else if (level === 2) chunks.push(`<h2 style="margin:2px 0 6px;font-size:18px;line-height:1.35;font-weight:600">${text}</h2>`);
      else chunks.push(`<h3 style="margin:2px 0 6px;font-size:16px;line-height:1.35;font-weight:600">${text}</h3>`);
      continue;
    }

    chunks.push(`<p style="margin:0;line-height:20.8px">${renderInlineMarkdown(trimmed)}</p>`);
  }

  closeList();
  return chunks.join("");
}

function SectionChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`transition-transform ${open ? "rotate-90" : ""}`}
    >
      <path d="M6 4l4 4-4 4" />
    </svg>
  );
}

export function AppearancePanel({
  base,
  onClose,
  onRename,
  onUpdateColor,
  onUpdateIcon,
  onUpdateGuide,
  onToggleStar,
}: {
  base: { name: string; color: string; icon: string; guide: string | null; starred: boolean };
  onClose: () => void;
  onRename: (name: string) => void;
  onUpdateColor: (c: string) => void;
  onUpdateIcon: (i: string) => void;
  onUpdateGuide: (g: string) => void;
  onToggleStar: () => void;
}) {
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(true);
  const [tab, setTab] = useState<"color" | "icon">("color");
  const [iconSearch, setIconSearch] = useState("");
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState(base.name);
  const [isRenaming, setIsRenaming] = useState(false);
  const [guideMode, setGuideMode] = useState<"view" | "edit">("view");
  const [guideText, setGuideText] = useState(base.guide ?? DEFAULT_GUIDE);

  useEffect(() => {
    setNameDraft(base.name);
  }, [base.name]);

  useEffect(() => {
    setGuideText(base.guide ?? DEFAULT_GUIDE);
  }, [base.guide]);

  const filteredIcons = useMemo(
    () =>
      BASE_ICONS.filter((icon) =>
        !iconSearch.trim() || icon.label.toLowerCase().includes(iconSearch.toLowerCase())
      ),
    [iconSearch]
  );

  function commitRename() {
    const trimmed = nameDraft.trim();
    if (!trimmed) {
      setNameDraft(base.name);
      setIsRenaming(false);
      return;
    }
    if (trimmed !== base.name) {
      onRename(trimmed);
    }
    setIsRenaming(false);
  }

  function saveGuide() {
    const next = guideText.trim() || DEFAULT_GUIDE;
    setGuideText(next);
    onUpdateGuide(next);
    setGuideMode("view");
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        role="menu"
        aria-label="Base settings menu"
        className="fixed left-[64px] top-[56px] z-50 w-[400px] rounded-[10px] border border-[#d3d8df] bg-white p-4 shadow-[0_16px_36px_rgba(16,24,40,0.2)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex w-full items-start border-b border-[#d7dce3] pb-3">
          <div className="w-[304px] flex-none">
            <div
              className={`h-11 rounded-[4px] transition-colors ${
                isRenaming ? "bg-[#f2f4f8] ring-2 ring-[#8db4ff]" : "hover:bg-[#eef1f5]"
              }`}
            >
              <input
                aria-label="rename base"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                onFocus={() => setIsRenaming(true)}
                onBlur={commitRename}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                  if (event.key === "Escape") {
                    setNameDraft(base.name);
                    setIsRenaming(false);
                    event.currentTarget.blur();
                  }
                }}
                className="h-full w-full rounded-[4px] border-none bg-transparent px-2 text-[20px] font-normal text-[#1d1f25] outline-none transition-colors hover:bg-[#eef1f5] focus:bg-[#f2f4f8]"
              />
            </div>
          </div>

          <div className="relative ml-auto flex h-11 w-[64px] items-center justify-end">
            <button
              onClick={onToggleStar}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-[6px] transition-colors ${
                base.starred
                  ? "text-[#f4b400] hover:bg-[#fff3c8]"
                  : "text-[#2d323a] hover:bg-[#eceff4] hover:text-[#1d1f25]"
              }`}
              title={base.starred ? "Unstar base" : "Star base"}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill={base.starred ? "currentColor" : "none"}
                stroke="currentColor"
                strokeWidth="1.2"
                strokeLinejoin="round"
              >
                <path d="M10 2.5l2.2 4.6 5.1.5-3.9 3.3 1.2 5-4.6-2.6-4.6 2.6 1.2-5-3.9-3.3 5.1-.5L10 2.5z" />
              </svg>
            </button>

            <div className="relative">
              <button
                onClick={() => setMoreMenuOpen((open) => !open)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-[6px] text-[#2d323a] transition-colors hover:bg-[#eceff4]"
                aria-label="Open base actions"
                aria-haspopup="menu"
                aria-expanded={moreMenuOpen}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="3" cy="8" r="1.2" />
                  <circle cx="8" cy="8" r="1.2" />
                  <circle cx="13" cy="8" r="1.2" />
                </svg>
              </button>

              {moreMenuOpen && (
                <>
                  <button
                    type="button"
                    className="fixed inset-0 z-[55] cursor-default"
                    onClick={() => setMoreMenuOpen(false)}
                    aria-label="Close base actions"
                  />
                  <ul
                    role="menu"
                    className="absolute left-0 top-[36px] z-[60] w-[240px] rounded-[10px] border border-[#c9ced7] bg-white p-3 shadow-[0_12px_26px_rgba(16,24,40,0.2)]"
                  >
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex h-[34px] w-full items-center gap-3 rounded-[6px] px-2 text-left text-[13px] text-[#2a2e35] transition-colors hover:bg-[#eef1f5]"
                      >
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                          <AirtableAssetIcon asset={320} alt="" size={12} />
                        </span>
                        Duplicate base
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex h-[34px] w-full items-center gap-3 rounded-[6px] px-2 text-left text-[13px] text-[#2a2e35] transition-colors hover:bg-[#eef1f5]"
                      >
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                          <AirtableAssetIcon asset={85} alt="" size={13} />
                        </span>
                        Slack notifications
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        role="menuitem"
                        className="flex h-[34px] w-full items-center gap-3 rounded-[6px] px-2 text-left text-[13px] text-[#c1204b] transition-colors hover:bg-[#fdeff3]"
                      >
                        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center">
                          <AirtableAssetIcon asset={32} alt="" style={{ width: 12, height: 13 }} />
                        </span>
                        Delete base
                      </button>
                    </li>
                  </ul>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="border-b border-[#d7dce3] py-4">
          <button
            type="button"
            onClick={() => setAppearanceOpen((open) => !open)}
            className="flex w-full items-center gap-2 text-left text-[17px] font-semibold leading-[18px] text-[#1d1f25]"
          >
            <span className="inline-flex w-4 items-center justify-center text-[#2e3440]">
              <SectionChevron open={appearanceOpen} />
            </span>
            Appearance
          </button>

          {appearanceOpen && (
            <div className="pt-4">
              <div className="border-b border-[#d7dce3]">
                <div className="flex h-9 items-end gap-4" role="tablist" aria-label="Appearance tabs">
                  {(["color", "icon"] as const).map((currentTab) => (
                    <button
                      key={currentTab}
                      type="button"
                      role="tab"
                      aria-selected={tab === currentTab}
                      onClick={() => setTab(currentTab)}
                      className={`h-full border-b-2 px-0 pb-1 text-left text-[14.4px] leading-[20px] transition-colors ${
                        tab === currentTab
                          ? "border-[#2d7ff9] font-semibold text-[#1d1f25]"
                          : "border-transparent font-normal text-[#616670] hover:text-[#303440]"
                      }`}
                    >
                      {currentTab.charAt(0).toUpperCase() + currentTab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {tab === "color" && (
                <div className="space-y-3 pt-6">
                  {BASE_COLOR_SWATCH_ROWS.map((row, rowIndex) => (
                    <div key={`row-${rowIndex}`} className="flex gap-[10px]">
                      {row.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => onUpdateColor(hex)}
                          title={hex}
                          className={`inline-flex h-6 w-[26px] flex-shrink-0 items-center justify-center rounded-[8px] border border-black/10 transition-transform hover:scale-[1.03] ${
                            base.color.toLowerCase() === hex.toLowerCase()
                              ? "ring-2 ring-[#8eb2f9] ring-offset-1 ring-offset-white"
                              : ""
                          }`}
                          style={{ backgroundColor: hex }}
                        >
                          {base.color.toLowerCase() === hex.toLowerCase() && (
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                              <path
                                d="M2.2 7.1l2.7 2.7L11.8 3"
                                stroke={getContrastTextColor(hex)}
                                strokeWidth="1.8"
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
                <div className="pt-4">
                  <div className="mb-3 flex items-center gap-2 rounded-[8px] border border-[#cdd3dc] bg-white px-3 py-2">
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#8a9099" strokeWidth="1.5">
                      <circle cx="7" cy="7" r="4.5" />
                      <path d="M11 11l3 3" strokeLinecap="round" />
                    </svg>
                    <input
                      value={iconSearch}
                      onChange={(event) => setIconSearch(event.target.value)}
                      placeholder="Search icons"
                      className="w-full border-none bg-transparent text-[13px] text-[#303440] outline-none placeholder:text-[#8f96a1]"
                    />
                  </div>

                  <div className="grid grid-cols-10 gap-[10px]">
                    {filteredIcons.slice(0, 40).map((icon) => {
                      const active = base.icon === icon.id;
                      const iconColor = active
                        ? (icon.path ? getContrastTextColor(base.color) : getBaseIconForegroundColor(base.color))
                        : "#4f5561";
                      return (
                        <button
                          key={icon.id}
                          type="button"
                          onClick={() => onUpdateIcon(icon.id)}
                          title={icon.label}
                          className={`inline-flex h-6 w-[26px] items-center justify-center rounded-[8px] border transition-colors ${
                            active
                              ? "border-transparent ring-2 ring-[#8eb2f9] ring-offset-1 ring-offset-white"
                              : "border-black/10 hover:bg-[#eef1f5]"
                          }`}
                          style={{ backgroundColor: active ? base.color : "#ffffff" }}
                        >
                          {icon.path ? (
                            <svg
                              width="13"
                              height="13"
                              viewBox="0 0 16 16"
                              fill="none"
                              stroke={iconColor}
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d={icon.path} />
                            </svg>
                          ) : (
                            <AirtableAssetIcon
                              asset={453}
                              alt=""
                              size={13}
                              tintColor={active ? iconColor : "#4f5561"}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="py-4">
          <button
            type="button"
            onClick={() => setGuideOpen((open) => !open)}
            className="flex w-full items-center gap-2 text-left text-[17px] font-semibold leading-[18px] text-[#1d1f25]"
          >
            <span className="inline-flex w-4 items-center justify-center text-[#2e3440]">
              <SectionChevron open={guideOpen} />
            </span>
            Base guide
          </button>

          {guideOpen && (
            <div className="pt-4">
              {guideMode === "edit" ? (
                <>
                  <textarea
                    value={guideText}
                    onChange={(event) => setGuideText(event.target.value)}
                    onBlur={saveGuide}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setGuideText(base.guide ?? DEFAULT_GUIDE);
                        setGuideMode("view");
                      }
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        saveGuide();
                      }
                    }}
                    autoFocus
                    rows={3}
                    className="w-full rounded-[10px] border border-[#8db4ff] bg-white px-3 py-2 text-[16px] outline-none"
                    style={{
                      minHeight: 102,
                      color: "#1d1f25",
                      lineHeight: 1.5,
                    }}
                  />
                  <div className="mt-3 space-y-3">
                    <div className="flex items-center gap-2 text-[11px] text-[#8d93a0]">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 opacity-80">
                        <rect x="2.5" y="1.625" width="11" height="12.75" rx="1.5" stroke="#8d93a0" strokeWidth="1.2" />
                        <path d="M5.5 5.5h5M5.5 8h5M5.5 10.5h3" stroke="#8d93a0" strokeWidth="1" strokeLinecap="round" />
                      </svg>
                      <span>styling with markdown is supported</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <AirtableAssetIcon asset={11} alt="" size={18} className="mt-[1px] shrink-0 text-[#6e7581]" tintColor="#6e7581" />
                      <span className="text-[13px]" style={{ color: "#5f6673", lineHeight: 1.45 }}>
                        Base guide will be shown the first time someone opens this base.
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setGuideMode("edit")}
                  className="w-full rounded-[8px] border border-transparent px-2 py-1 text-left transition-colors hover:bg-[#eef1f5]"
                >
                  <div
                    className="m-0 block break-words whitespace-pre-wrap p-0"
                    style={{
                      color: "rgb(97, 102, 112)",
                      fontFamily:
                        '-apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"',
                      fontSize: "13px",
                      fontWeight: 400,
                      lineHeight: "20.8px",
                      width: "336px",
                      minHeight: "41.5833px",
                      margin: 0,
                      padding: 0,
                      overflowWrap: "break-word",
                      cursor: "pointer",
                    }}
                    dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(guideText || DEFAULT_GUIDE) }}
                  />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
