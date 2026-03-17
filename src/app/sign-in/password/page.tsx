"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { AirtableMark } from "~/app/_components/auth/AuthIcons";

export default function PasswordSignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [ready, setReady] = useState(false);

  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") ?? "");
    setCallbackUrl(params.get("callbackUrl") ?? "/");
    setReady(true);
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

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const result = await signIn("credentials", {
      email,
      password,
      callbackUrl,
      redirect: false,
    });

    setBusy(false);

    if (!result || result.error) {
      setError("Incorrect email or password.");
      return;
    }

    router.push(normalizeRedirectUrl(result.url, callbackUrl));
  }

  if (!ready) return null;

  if (!email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4">
        <p className="text-sm text-[#374151]">
          Missing email address. <Link href="/sign-in" className="text-[#2563eb] underline">Go back</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <section className="mx-auto max-w-[600px] px-6 pt-20">
        <AirtableMark className="h-9 w-12" />
        <h1 className="mt-12 text-[48px] font-medium leading-tight text-[#111827]">Welcome back</h1>

        <p className="mt-3 text-[18px] text-[#6b7280]">Signing in as {email}</p>

        <form onSubmit={handleSubmit} className="mt-10">
          <label htmlFor="password" className="mb-2 block text-[18px] text-[#111827]">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            className="h-12 w-full rounded-[8px] border border-[#d6d8db] px-4 text-[18px] text-[#111827] outline-none transition-colors focus:border-[#3b82f6]"
            required
          />

          <button
            type="submit"
            disabled={busy}
            className="mt-8 h-12 w-full rounded-[8px] bg-[#2670d8] text-[18px] font-semibold text-white transition-colors hover:bg-[#1f63c2] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {error ? <p className="mt-4 text-sm text-[#b91c1c]">{error}</p> : null}

        <p className="mt-12 text-[15px] text-[#6b7280]">
          Not you?{" "}
          <Link href="/sign-in" className="font-medium text-[#2563eb] underline">
            Use another account
          </Link>
        </p>
      </section>
    </main>
  );
}
