"use client";

import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { UserAccountMenu } from "~/app/_components/home/UserAccountMenu";

type AccountOverviewClientProps = {
  displayName: string;
  email: string;
  hasPassword: boolean;
};

function PencilIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4">
      <path d="M10.9 2.2l2.9 2.9-7.7 7.7-3.4.5.5-3.4 7.7-7.7z" />
      <path d="M9.6 3.5l2.9 2.9" />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <path d="M8 2.2L14.5 13H1.5L8 2.2z" />
      <path d="M8 6.1v3.8M8 11.7v.5" strokeLinecap="round" />
    </svg>
  );
}

function WorkspaceIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.3">
      <circle cx="5.2" cy="6.1" r="2.2" />
      <circle cx="10.8" cy="6.1" r="2.2" />
      <path d="M1.9 13.5a3.3 3.3 0 016.6 0M7.5 13.5a3.3 3.3 0 016.6 0" strokeLinecap="round" />
    </svg>
  );
}

function DeleteIcon() {
  return (
    <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.4">
      <rect x="3.3" y="4.2" width="9.4" height="9.4" rx="1.2" />
      <path d="M6.1 4.2V3h3.8v1.2M2.4 4.2h11.2" />
    </svg>
  );
}

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

export function AccountOverviewClient({
  displayName,
  email,
  hasPassword,
}: AccountOverviewClientProps) {
  const router = useRouter();
  const initial = (displayName[0] ?? "R").toUpperCase();

  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error">("success");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function handleUpdatePassword() {
    setFeedback(null);

    if (newPassword.length < 8) {
      setFeedbackType("error");
      setFeedback("New password must be at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setFeedbackType("error");
      setFeedback("New password and confirmation do not match.");
      return;
    }

    setPasswordBusy(true);

    try {
      const res = await fetch("/api/auth/update-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;

      if (!res.ok) {
        setFeedbackType("error");
        setFeedback(data?.message ?? "Could not update your password.");
        return;
      }

      setFeedbackType("success");
      setFeedback("Password updated successfully.");
      setPasswordModalOpen(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setFeedbackType("error");
      setFeedback("Could not update your password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") return;

    setDeleteBusy(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/auth/delete-account", { method: "DELETE" });
      const data = (await res.json().catch(() => null)) as { message?: string } | null;

      if (!res.ok) {
        setFeedbackType("error");
        setFeedback(data?.message ?? "Could not delete your account.");
        setDeleteBusy(false);
        return;
      }

      const signOutResult = await signOut({ callbackUrl: "/sign-in", redirect: false });
      router.push(normalizeRedirectUrl(signOutResult?.url, "/sign-in"));
    } catch {
      setFeedbackType("error");
      setFeedback("Could not delete your account.");
      setDeleteBusy(false);
    }
  }

  return (
    <div
      className="min-h-screen bg-[#f6f7f9]"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
    >
      <header className="sticky top-0 z-30 h-[68px] border-b border-[#d8dbe1] bg-white">
        <div className="flex h-full items-center justify-between px-8">
          <button type="button" onClick={() => router.push("/")} className="block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/airtable_assets/Airtable_Logo.svg.png" alt="Airtable" style={{ width: 103, height: 22.5 }} />
          </button>
          <UserAccountMenu showBell={false} />
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-68px)]">
        <aside className="w-[436px] border-r border-[#d8dbe1] bg-[#f6f7f9] px-4 py-5">
          <p className="px-4 text-[15px] text-[#8b9099]">Account settings</p>

          <div className="mt-4 space-y-1 border-b border-[#d9dde3] pb-4">
            <button
              type="button"
              className="h-[52px] w-full rounded-[7px] bg-[#e3e6ec] px-4 text-left text-[16px] font-semibold text-[#1d2430]"
            >
              Overview
            </button>
            <button type="button" className="h-[52px] w-full rounded-[7px] px-4 text-left text-[16px] font-semibold text-[#1d2430] hover:bg-[#eceff4]">
              Referrals and credits
            </button>
            <button type="button" className="h-[52px] w-full rounded-[7px] px-4 text-left text-[16px] font-semibold text-[#1d2430] hover:bg-[#eceff4]">
              Recent activity
            </button>
          </div>

          <p className="mt-5 px-4 text-[15px] text-[#8b9099]">Workspace settings</p>
          <button type="button" className="mt-3 flex h-[52px] w-full items-center gap-3 rounded-[7px] px-4 text-left text-[16px] text-[#1d2430] hover:bg-[#eceff4]">
            <span className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#ecedf1] text-[#384152]">
              <WorkspaceIcon />
            </span>
            <span>My First Workspace</span>
          </button>
        </aside>

        <main className="flex-1 px-16 py-12">
          <div className="max-w-[1260px]">
            <h1 className="text-[30px] font-semibold leading-[1.1] text-[#1d2430]">Account overview</h1>

            <section className="mt-8 flex items-start gap-6">
              <div className="relative">
                <div className="flex h-[96px] w-[96px] items-center justify-center rounded-full bg-[#1f73d8] text-[36px] text-white">
                  {initial}
                </div>
                <button type="button" className="absolute bottom-[2px] right-[2px] rounded-full bg-white text-[#8a8f98]">
                  <PencilIcon />
                </button>
              </div>

              <div className="pt-2">
                <div className="flex items-center gap-4">
                  <p className="text-[15px] font-medium leading-none text-[#2a2f37]">
                    {displayName}
                  </p>
                  <button type="button" className="flex items-center gap-1 text-[15px] text-[#8a8f98] hover:text-[#5f6672]">
                    <PencilIcon />
                    Edit name
                  </button>
                </div>

                <div className="mt-4 flex items-center gap-4">
                  <p className="text-[15px] leading-none text-[#343a45]">
                    {email}
                  </p>
                  <button type="button" className="flex items-center gap-1 text-[15px] text-[#8a8f98] hover:text-[#5f6672]">
                    <PencilIcon />
                    Edit email
                  </button>
                </div>

                <div className="mt-6 flex items-center gap-8 text-[15px]">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(true)}
                    className="flex items-center gap-1 font-semibold text-[#2571d8] hover:underline"
                  >
                    <PencilIcon />
                    Update password
                  </button>
                  <button type="button" className="font-semibold text-[#85b1ea]">Set up two-factor authentication</button>
                </div>

                {feedback ? (
                  <p className={`mt-4 text-[14px] ${feedbackType === "error" ? "text-[#b42318]" : "text-[#067647]"}`}>
                    {feedback}
                  </p>
                ) : null}
              </div>
            </section>

            <section className="mt-14">
              <h2 className="text-[21px] font-semibold text-[#252b35]">Credits</h2>
              <p className="mt-4 text-[15px] text-[#5a616d]">You have $0.00 in credit.</p>
              <p className="mt-3 text-[15px] text-[#5a616d]">Get $10 in credit for every person you invite.</p>
              <p className="mt-3 text-[15px] text-[#5a616d]">Get $2 in credit for installing the mobile app.</p>
              <button type="button" className="mt-5 rounded-[8px] bg-[#eceef2] px-4 py-2 text-[15px] font-semibold text-[#2e333c]">
                Learn more about referrals and credits
                <span className="ml-2">-&gt;</span>
              </button>
            </section>

            <section className="mt-12">
              <h2 className="text-[21px] font-semibold text-[#252b35]">API</h2>
              <div className="mt-4 flex items-center justify-between gap-8 rounded-[8px] bg-[#f5ebcc] px-6 py-5">
                <div>
                  <p className="flex items-center gap-2 text-[16px] font-semibold text-[#2f3034]">
                    <span className="text-[#cf7b00]">
                      <WarningIcon />
                    </span>
                    API keys will be deprecated by the end of January 2024
                  </p>
                  <p className="mt-3 text-[15px] text-[#3e4149]">
                    After this date, API keys will stop working and you will have to migrate to personal access tokens.
                    Personal access tokens allow you to more securely grant API access to Airtable data.{' '}
                    <button type="button" className="font-semibold text-[#1f73d8]">Learn more</button>
                  </p>
                </div>
                <button type="button" className="rounded-[9px] border border-[#cfd1d6] bg-white px-5 py-2 text-[14px] text-[#353a42]">
                  Go to developer hub
                </button>
              </div>
            </section>

            <section className="mt-12 pb-16">
              <h2 className="text-[18px] font-semibold text-[#252b35]">Google Drive integration</h2>
              <div className="mt-4 flex items-center gap-3 text-[#3f4651]">
                <button
                  type="button"
                  aria-label="Google Drive integration"
                  className="relative h-5 w-9 rounded-full bg-[#e8eaef]"
                >
                  <span className="absolute left-[2px] top-[2px] h-4 w-4 rounded-full bg-white shadow-sm" />
                </button>
                <div>
                  <p className="text-[15px] leading-[1.25]">Link your Airtable account to Google Drive.</p>
                  <p className="mt-1 text-[14px] text-[#8b9099]">You&apos;ll be able to create and open Airtable bases from Google Drive</p>
                </div>
              </div>

              <h2 className="mt-12 text-[18px] font-semibold text-[#252b35]">Privacy</h2>
              <p className="mt-3 text-[15px] text-[#3f4651]">Manage your cookie preferences and privacy settings.</p>
              <div className="mt-3 space-y-1 text-[14px] text-[#6a7280]">
                <button type="button" className="block hover:underline">Cookie Preferences</button>
                <button type="button" className="block hover:underline">Do Not Sell/Share My Personal Information</button>
                <button type="button" className="block hover:underline">Privacy Policy</button>
                <button type="button" className="block hover:underline">Cookie Policy</button>
              </div>

              <button
                type="button"
                onClick={() => setDeleteModalOpen(true)}
                className="mt-8 flex items-center gap-2 rounded-[7px] bg-[#ea2748] px-4 py-2.5 text-[14px] font-semibold text-white"
              >
                <DeleteIcon />
                Delete your Airtable user account
              </button>
            </section>
          </div>
        </main>
      </div>

      {passwordModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4" onClick={() => setPasswordModalOpen(false)}>
          <div className="w-full max-w-[520px] rounded-[10px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[24px] font-semibold text-[#1f2937]">Update password</h3>
            <p className="mt-2 text-[14px] text-[#6b7280]">Use at least 8 characters to keep your account secure.</p>

            <div className="mt-5 space-y-4">
              {hasPassword ? (
                <label className="block">
                  <span className="mb-1 block text-[14px] text-[#344054]">Current password</span>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="h-[42px] w-full rounded-[8px] border border-[#d0d5dd] px-3 text-[15px] outline-none focus:border-[#2670d8]"
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="mb-1 block text-[14px] text-[#344054]">New password</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-[42px] w-full rounded-[8px] border border-[#d0d5dd] px-3 text-[15px] outline-none focus:border-[#2670d8]"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[14px] text-[#344054]">Confirm new password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-[42px] w-full rounded-[8px] border border-[#d0d5dd] px-3 text-[15px] outline-none focus:border-[#2670d8]"
                />
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setPasswordModalOpen(false)} className="rounded-[8px] px-4 py-2 text-[14px] text-[#4b5563] hover:bg-[#f3f4f6]">
                Cancel
              </button>
              <button
                type="button"
                disabled={passwordBusy}
                onClick={() => void handleUpdatePassword()}
                className="rounded-[8px] bg-[#2670d8] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#1f63c2] disabled:opacity-70"
              >
                {passwordBusy ? "Updating..." : "Update password"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4" onClick={() => setDeleteModalOpen(false)}>
          <div className="w-full max-w-[560px] rounded-[10px] bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-[24px] font-semibold text-[#1f2937]">Delete Airtable account</h3>
            <p className="mt-2 text-[14px] text-[#6b7280]">
              This action is permanent. Type <span className="font-semibold text-[#111827]">DELETE</span> to confirm.
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="mt-4 h-[42px] w-full rounded-[8px] border border-[#d0d5dd] px-3 text-[15px] outline-none focus:border-[#d92d20]"
            />

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setDeleteModalOpen(false)} className="rounded-[8px] px-4 py-2 text-[14px] text-[#4b5563] hover:bg-[#f3f4f6]">
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteBusy || deleteConfirmText.trim().toUpperCase() !== "DELETE"}
                onClick={() => void handleDeleteAccount()}
                className="rounded-[8px] bg-[#d92d20] px-4 py-2 text-[14px] font-semibold text-white hover:bg-[#b42318] disabled:opacity-70"
              >
                {deleteBusy ? "Deleting..." : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
