"use client";

import { useLayoutEffect } from "react";

import { getBaseIconForegroundColor } from "~/app/_components/baseAppearanceColors";
import { BASE_ICONS } from "~/app/_components/baseIcons";
import { fallbackColor } from "~/app/_components/home/helpers";

export const DEFAULT_FAVICON_HREF = "/favicon.ico";
export const HOMEPAGE_FAVICON_HREF = "/airtable_assets/AirtableLogoPNG.png";

function upsertHeadLink(rel: string, href: string, type?: string) {
  let link = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement("link");
    link.rel = rel;
    document.head.appendChild(link);
  }

  if (link.getAttribute("href") !== href) {
    link.setAttribute("href", href);
  }

  if (type) {
    if (link.type !== type) {
      link.type = type;
    }
  } else if (link.hasAttribute("type")) {
    link.removeAttribute("type");
  }
}

function getFaviconType(href: string) {
  if (href.startsWith("data:image/svg+xml")) return "image/svg+xml";
  if (href.endsWith(".png")) return "image/png";
  if (href.endsWith(".ico")) return "image/x-icon";
  return undefined;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function getBaseAbbreviation(name: string) {
  if (!name) return "?";
  if (name.length >= 2) {
    return `${name[0]!.toUpperCase()}${name[1]!.toLowerCase()}`;
  }
  return name[0]!.toUpperCase();
}

export function createHomepageStyleBaseFavicon({
  baseId,
  baseName,
  color,
  iconId,
}: {
  baseId: string;
  baseName: string;
  color?: string | null;
  iconId?: string | null;
}) {
  const resolvedColor = color ?? fallbackColor(baseId);
  const foreground = getBaseIconForegroundColor(resolvedColor);
  const icon =
    iconId && iconId !== "default"
      ? BASE_ICONS.find((entry) => entry.id === iconId)
      : null;
  const iconMarkup = icon?.path
    ? `<g transform="translate(12 12) scale(2.5)"><path d="${escapeXml(icon.path)}" fill="none" stroke="${foreground}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></g>`
    : `<text x="32" y="36" text-anchor="middle" dominant-baseline="middle" fill="${foreground}" font-family="Arial, Helvetica, sans-serif" font-size="43" font-weight="500" letter-spacing="-1.1">${escapeXml(getBaseAbbreviation(baseName))}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64"><rect x="1" y="1" width="62" height="62" rx="13" fill="${resolvedColor}" stroke="#0000004d" />${iconMarkup}</svg>`;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function BrowserPageMetadata({
  title,
  iconHref = DEFAULT_FAVICON_HREF,
}: {
  title: string;
  iconHref?: string;
}) {
  useLayoutEffect(() => {
    const type = getFaviconType(iconHref);

    const applyMetadata = () => {
      if (document.title !== title) {
        document.title = title;
      }

      upsertHeadLink("icon", iconHref, type);
      upsertHeadLink("shortcut icon", iconHref, type);
    };

    applyMetadata();
    const animationFrame = window.requestAnimationFrame(applyMetadata);
    const timeout = window.setTimeout(applyMetadata, 50);
    const observer = new MutationObserver(() => {
      applyMetadata();
    });

    observer.observe(document.head, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(timeout);
      observer.disconnect();
    };
  }, [iconHref, title]);

  return null;
}
