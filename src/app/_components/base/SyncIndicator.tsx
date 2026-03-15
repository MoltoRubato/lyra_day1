"use client";
import { useEffect, useRef, useState } from "react";
import { useIsMutating } from "@tanstack/react-query";

export function SyncIndicator() {
  const isMutating = useIsMutating();
  const [showSaved, setShowSaved] = useState(false);
  const wasActive = useRef(false);

  useEffect(() => {
    if (isMutating > 0) {
      wasActive.current = true;
      setShowSaved(false);
    } else if (wasActive.current) {
      wasActive.current = false;
      setShowSaved(true);
      const t = setTimeout(() => setShowSaved(false), 2200);
      return () => clearTimeout(t);
    }
  }, [isMutating]);

  if (isMutating > 0) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[#888] select-none">
        <div className="w-3 h-3 border-[1.5px] border-[#ccc] border-t-[#555] rounded-full animate-spin flex-shrink-0" />
        <span>Saving</span>
      </div>
    );
  }
  if (showSaved) {
    return (
      <div className="flex items-center gap-1.5 text-[11px] text-[#22c55e] select-none">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>All changes saved</span>
      </div>
    );
  }
  return null;
}
