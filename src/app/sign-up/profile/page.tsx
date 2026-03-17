"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { AirtableMark } from "~/app/_components/auth/AuthIcons";

export default function ProfileSetupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [ready, setReady] = useState(false);

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") ?? "");
    setCallbackUrl(params.get("callbackUrl") ?? "/");
    setReady(true);
  }, []);

  async function handleSignUp(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const registerResponse = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, password }),
      });

      const registerJson = (await registerResponse.json().catch(() => null)) as { message?: string } | null;

      if (!registerResponse.ok) {
        setError(registerJson?.message ?? "Could not create account.");
        setBusy(false);
        return;
      }

      const signInResult = await signIn("credentials", {
        email,
        password,
        callbackUrl,
        redirect: false,
      });

      if (!signInResult || signInResult.error) {
        setError("Account created, but sign-in failed. Please sign in manually.");
        setBusy(false);
        router.push(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`);
        return;
      }

      router.push(signInResult.url ?? callbackUrl);
    } catch {
      setError("Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!email) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f3f4f6] px-4">
        <p className="text-sm text-[#374151]">
          Missing email address. <Link href="/sign-up" className="text-[#2563eb] underline">Go back</Link>
        </p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <section className="mx-auto max-w-[700px] px-6 pt-20">
        <AirtableMark className="h-10 w-14" />

        <h1 className="mt-16 text-[52px] font-medium leading-tight text-[#111827]">Create your profile</h1>

        <form onSubmit={handleSignUp} className="mt-14">
          <label htmlFor="full-name" className="mb-2 block text-[18px] text-[#111827]">
            Full name
          </label>
          <input
            id="full-name"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First and last"
            className="h-12 w-full rounded-[8px] border border-[#d6d8db] px-4 text-[18px] text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#3b82f6]"
            required
          />

          <label htmlFor="password" className="mb-2 mt-6 block text-[18px] text-[#111827]">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="h-12 w-full rounded-[8px] border border-[#d6d8db] px-4 text-[18px] text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#3b82f6]"
            required
            minLength={8}
          />

          <button
            type="submit"
            disabled={busy}
            className="mt-12 h-12 w-full rounded-[8px] bg-[#2670d8] text-[17px] font-semibold text-white transition-colors hover:bg-[#1f63c2] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {busy ? "Signing up..." : "Sign up"}
          </button>
        </form>

        {error ? <p className="mt-4 text-sm text-[#b91c1c]">{error}</p> : null}

        <p className="mt-36 text-[16px] text-[#4b5563]">
          Signing up as <span className="font-semibold">{email}</span>.{" "}
          <Link href="/sign-up" className="text-[#2563eb] underline">
            Not you?
          </Link>
        </p>
      </section>
    </main>
  );
}
