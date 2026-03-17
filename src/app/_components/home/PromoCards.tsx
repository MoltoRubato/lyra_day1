import type { ReactNode } from "react";

import { AirtableAssetIcon } from "~/app/_components/AirtableAssetIcon";

type PromoCard = {
  title: string;
  description: string;
  icon: ReactNode;
};

const promoCards: PromoCard[] = [
  {
    title: "Start with Omni",
    description: "Use AI to build a custom app tailored to your workflow",
    icon: <AirtableAssetIcon asset={455} alt="Omni" className="h-4 w-4" />,
  },
  {
    title: "Start with templates",
    description: "Select a template to get started and customize as you go.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#6f4eb6" strokeWidth="1.4">
        <rect x="1.8" y="1.8" width="12.4" height="12.4" rx="1.8" />
        <path d="M2 7.9h12M8 2v12" />
      </svg>
    ),
  },
  {
    title: "Quickly upload",
    description: "Easily migrate your existing projects in just a few minutes.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#0b8a7d" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 12.8V2.8" />
        <path d="M4.8 6 8 2.8 11.2 6" />
      </svg>
    ),
  },
  {
    title: "Build an app on your own",
    description: "Start with a blank app and build your ideal workflow.",
    icon: (
      <svg width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#3e67bc" strokeWidth="1.3">
        <rect x="1.4" y="2.2" width="13.2" height="11.6" rx="1.8" />
        <path d="M1.8 6h12.4M1.8 9h12.4M6.1 2.5v11" />
      </svg>
    ),
  },
];

export function PromoCards() {
  return (
    <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {promoCards.map((card) => (
        <button
          key={card.title}
          type="button"
          className="min-h-[144px] rounded-[10px] border border-[#d8dadd] bg-white px-6 py-5 text-left transition-colors hover:bg-[#fbfbfb]"
        >
          <div className="flex items-center gap-3 text-[#172b4d]">
            <span className="flex h-6 w-6 items-center justify-center">{card.icon}</span>
            <span className="text-[17px] font-semibold leading-none">{card.title}</span>
          </div>
          <p className="mt-3 text-[15px] leading-[1.45] text-[#5f6b7c]">{card.description}</p>
        </button>
      ))}
    </div>
  );
}
