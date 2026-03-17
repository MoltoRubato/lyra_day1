"use client";

import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

type UserAccountMenuProps = {
  showBell?: boolean;
};

type MenuItem = {
  label: string;
  icon: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
};

function Row({
  item,
  placeholder = false,
}: {
  item: MenuItem;
  placeholder?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={item.onClick}
      className={`flex h-[52px] w-full items-center gap-3 px-5 text-left transition-colors ${
        placeholder
          ? "cursor-default text-[#3d4147]"
          : "text-[#34383f] hover:bg-[#f5f6f8]"
      }`}
    >
      <span className="flex h-5 w-5 items-center justify-center text-[#4b4f57]">{item.icon}</span>
      <span className="flex-1 text-[14px] font-normal leading-none">{item.label}</span>
      {item.trailing ? <span className="ml-2">{item.trailing}</span> : null}
    </button>
  );
}

function MenuDivider() {
  return <div className="mx-5 h-px bg-[#e8e9ed]" />;
}

function HelpIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="6.4" />
      <path d="M6.55 6.25a1.7 1.7 0 013.2.82c0 1.1-1.5 1.34-1.72 2.5" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r=".5" fill="currentColor" stroke="none" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M8 2.4a4.2 4.2 0 00-4.2 4.2v1.5L2.4 10h11.2L12.2 8V6.6A4.2 4.2 0 008 2.4z" />
      <path d="M6.4 11.8a1.6 1.6 0 003.2 0" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.55">
      <circle cx="8" cy="5.2" r="2.6" />
      <path d="M3.5 13a4.6 4.6 0 019 0" strokeLinecap="round" />
    </svg>
  );
}

function GroupIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.45">
      <circle cx="5.3" cy="5.8" r="2" />
      <circle cx="10.6" cy="6.2" r="1.7" />
      <path d="M2.4 12.8a3.2 3.2 0 015.8 0M8.2 12.8a2.9 2.9 0 015 0" strokeLinecap="round" />
    </svg>
  );
}

function NotificationIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M8 2.6a3.6 3.6 0 00-3.6 3.6v1.3L3.2 9.3h9.6l-1.2-1.8V6.2A3.6 3.6 0 008 2.6z" />
      <path d="M6.8 10.8a1.2 1.2 0 002.4 0" />
    </svg>
  );
}

function LanguageIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.45">
      <path d="M2.4 3.3h8M6.3 3.3a12.8 12.8 0 01-3 6.3M4 7.2c1.3 0 3.1.7 4.2 1.9" strokeLinecap="round" />
      <path d="M9.4 9.4l2.2-5 2.1 5M10.2 7.5H13" strokeLinecap="round" />
    </svg>
  );
}

function PaletteIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.35">
      <path d="M8 2.3A5.7 5.7 0 102.3 8c0 1 .8 1.8 1.8 1.8h1.8a1.3 1.3 0 011.3 1.3 2.6 2.6 0 105.2 0A8.8 8.8 0 008 2.3z" />
      <circle cx="5.2" cy="6.1" r=".7" fill="currentColor" stroke="none" />
      <circle cx="7.4" cy="5.2" r=".7" fill="currentColor" stroke="none" />
      <circle cx="9.6" cy="6.2" r=".7" fill="currentColor" stroke="none" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.45">
      <rect x="2.2" y="3.3" width="11.6" height="9.4" rx="1.4" />
      <path d="M2.8 4.5L8 8.2l5.2-3.7" />
    </svg>
  );
}

function UpgradeIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <circle cx="8" cy="8" r="7" />
      <path d="M8 4.2v5.1M5.5 6.8L8 4.2l2.5 2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IntegrationsIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6.2 5.4a2.6 2.6 0 013.6-3.7l.8.8a2.6 2.6 0 010 3.7L9.4 7.4M6.6 8.6L5.4 9.8a2.6 2.6 0 000 3.7l.8.8a2.6 2.6 0 003.7 0l1.3-1.3" />
    </svg>
  );
}

function BuilderIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.45">
      <path d="M9.9 3.1l-2 2 .8.8 2-2a2 2 0 10-.8-.8z" />
      <path d="M6.2 7.8l-3.7 3.7 2 2 3.7-3.7M9.1 10.7l3.1 3.1" strokeLinecap="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M3.4 4.1h9.2M6.1 4.1v-1h3.8v1M5.1 5.2v6.7M8 5.2v6.7M10.9 5.2v6.7" strokeLinecap="round" />
      <rect x="4.2" y="4.1" width="7.6" height="8.8" rx="1.1" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M9.8 13.2H4.1a1.3 1.3 0 01-1.3-1.3V4.1a1.3 1.3 0 011.3-1.3h5.7" />
      <path d="M8.7 8h4.5M11.6 5.5L14 8l-2.4 2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ChevronRight() {
  return (
    <svg viewBox="0 0 10 10" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M3 1.6L6.8 5 3 8.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BetaPill() {
  return (
    <span className="rounded-full bg-[#f4cf81] px-2 py-[2px] text-[12px] font-medium leading-none text-[#8a5a08]">
      Beta
    </span>
  );
}

function BusinessPill() {
  return (
    <span className="rounded-full bg-[#caebff] px-2 py-[2px] text-[12px] font-medium leading-none text-[#1277b0]">
      <span className="mr-1 inline-block h-[6px] w-[6px] rounded-full bg-[#1283c0]" />
      Business
    </span>
  );
}

export function UserAccountMenu({ showBell = true }: UserAccountMenuProps) {
  const router = useRouter();
  const { data } = useSession();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const displayEmail = data?.user?.email ?? "ryan0130@outlook.com";
  const displayName = useMemo(() => {
    const name = data?.user?.name?.trim();
    if (name) return name;
    return displayEmail.split("@")[0] ?? "ryan";
  }, [data?.user?.name, displayEmail]);

  const avatarLetter = (displayName[0] ?? "R").toUpperCase();

  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function normalizeRedirectUrl(url: string | null | undefined, fallback: string) {
    if (!url) return fallback;

    try {
      const parsed = new URL(url, window.location.origin);
      if (parsed.origin !== window.location.origin) return fallback;
      return `${parsed.pathname}${parsed.search}${parsed.hash}` || fallback;
    } catch {
      return fallback;
    }
  }

  async function handleLogout() {
    setOpen(false);
    const result = await signOut({ callbackUrl: "/sign-in", redirect: false });
    router.push(normalizeRedirectUrl(result?.url, "/sign-in"));
  }

  const firstBlock: MenuItem[] = [
    {
      label: "Account",
      icon: <UserIcon />,
      onClick: () => {
        setOpen(false);
        router.push("/account");
      },
    },
    { label: "Manage groups", icon: <GroupIcon />, trailing: <BusinessPill /> },
    { label: "Notification preferences", icon: <NotificationIcon />, trailing: <ChevronRight /> },
    { label: "Language preferences", icon: <LanguageIcon />, trailing: <ChevronRight /> },
    {
      label: "Appearance",
      icon: <PaletteIcon />,
      trailing: (
        <span className="flex items-center gap-3">
          <BetaPill />
          <ChevronRight />
        </span>
      ),
    },
  ];

  const secondBlock: MenuItem[] = [
    { label: "Contact sales", icon: <MailIcon /> },
    { label: "Upgrade", icon: <UpgradeIcon /> },
    { label: "Tell a friend", icon: <MailIcon /> },
  ];

  const thirdBlock: MenuItem[] = [
    { label: "Integrations", icon: <IntegrationsIcon /> },
    { label: "Builder hub", icon: <BuilderIcon /> },
  ];

  return (
    <div className="relative flex items-center gap-2" ref={wrapRef}>
      <button
        className="flex h-[28px] items-center gap-1.5 rounded-full px-2 text-[17px] text-[#3c4045] transition-colors hover:bg-[#f5f6f8]"
        title="Help"
        type="button"
      >
        <HelpIcon />
        <span className="font-medium">Help</span>
      </button>

      {showBell ? (
        <button
          className="flex h-[36px] w-[36px] items-center justify-center rounded-full border border-[#dbdde1] text-[#454a51] transition-colors hover:bg-[#f5f6f8]"
          type="button"
        >
          <BellIcon />
        </button>
      ) : null}

      <button
        type="button"
        title="Account"
        onClick={() => setOpen((p) => !p)}
        className="flex h-[40px] w-[40px] items-center justify-center rounded-full bg-[#1f73d8] text-[20px] font-medium text-white"
      >
        {avatarLetter}
      </button>

      {open ? (
        <div className="absolute right-0 top-[50px] z-50 max-h-[calc(100vh-84px)] w-[360px] overflow-y-scroll rounded-[10px] border border-[#d7d9de] bg-white pb-2 pt-1 shadow-[0_12px_28px_rgba(16,24,40,0.16)]">
          <div className="px-5 pb-4 pt-3 text-[#2d3138]">
            <p className="text-[16px] font-medium leading-[1.2]">{displayName}</p>
            <p className="mt-1 text-[14px] leading-[1.35] text-[#3f434b]">{displayEmail}</p>
          </div>

          <MenuDivider />
          <div className="py-1">
            {firstBlock.map((item) => (
              <Row key={item.label} item={item} placeholder={!item.onClick} />
            ))}
          </div>

          <MenuDivider />
          <div className="py-1">
            {secondBlock.map((item) => (
              <Row key={item.label} item={item} placeholder />
            ))}
          </div>

          <MenuDivider />
          <div className="py-1">
            {thirdBlock.map((item) => (
              <Row key={item.label} item={item} placeholder />
            ))}
          </div>

          <MenuDivider />
          <div className="py-1">
            <Row item={{ label: "Trash", icon: <TrashIcon /> }} placeholder />
            <Row item={{ label: "Log out", icon: <LogoutIcon />, onClick: () => void handleLogout() }} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
