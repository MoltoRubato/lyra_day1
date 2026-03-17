"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { AuthHeroPanel } from "~/app/_components/auth/AuthHeroPanel";
import { AirtableMark, AppleIcon, GoogleIcon, SsoIcon } from "~/app/_components/auth/AuthIcons";
import { AuthSocialButton } from "~/app/_components/auth/AuthSocialButton";

export default function SignInPage() {
  const router = useRouter();
  const [callbackUrl, setCallbackUrl] = useState("/");

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setCallbackUrl(params.get("callbackUrl") ?? "/");

    let mounted = true;
    void fetch("/api/auth/providers")
      .then((res) => res.json() as Promise<Record<string, unknown>>)
      .then((providers) => {
        if (mounted) setGoogleConfigured(Boolean(providers.google));
      })
      .catch(() => {
        if (mounted) setGoogleConfigured(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  async function handleContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);
    setIsChecking(true);

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { exists?: boolean; hasPassword?: boolean; message?: string };

      if (!res.ok) {
        setMessage(data.message ?? "Please enter a valid email address.");
        return;
      }

      const normalizedEmail = encodeURIComponent(email.trim().toLowerCase());
      const encodedCallback = encodeURIComponent(callbackUrl);

      if (!data.exists) {
        router.push(`/sign-up?email=${normalizedEmail}&callbackUrl=${encodedCallback}`);
        return;
      }

      if (!data.hasPassword) {
        setMessage("This account uses Google sign-in. Please continue with Google.");
        return;
      }

      router.push(`/sign-in/password?email=${normalizedEmail}&callbackUrl=${encodedCallback}`);
    } catch {
      setMessage("We could not continue. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!googleConfigured) {
      setMessage("Google sign-in is not configured yet. Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.");
      return;
    }

    setMessage(null);
    setGoogleBusy(true);
    await signIn("google", { callbackUrl });
    setGoogleBusy(false);
  }

  return (
    <div
      className="min-h-screen bg-[#f3f4f6]"
      style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}
    >
      <div className="mx-auto flex min-h-screen max-w-[1700px] items-center gap-14 px-8 py-10 lg:px-16 xl:gap-20">
        <section className="mx-auto w-full max-w-[780px] lg:mx-0 lg:flex-1 lg:pr-4">
          <AirtableMark className="h-9 w-12" />

          <h1 className="mt-14 text-[41px] font-medium leading-[1.12] text-[#111827]">Sign in to Airtable</h1>

          <form onSubmit={handleContinue} className="mt-16">
            <label htmlFor="email" className="mb-2 block text-[16px] text-[#1f2937]">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="h-[52px] w-full rounded-[10px] border border-[#d6d8db] px-4 text-[16px] text-[#1f2937] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#7aa2d8]"
              required
            />

            <button
              type="submit"
              disabled={isChecking}
              className="mt-8 h-[52px] w-full rounded-[10px] bg-[#89ace0] text-[17px] font-semibold text-white transition-colors hover:bg-[#769fd8] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isChecking ? "Checking..." : "Continue"}
            </button>
          </form>

          <p className="my-8 text-center text-[16px] text-[#6b7280]">or</p>

          <div className="space-y-4">
            <AuthSocialButton
              type="button"
              icon={<SsoIcon className="h-4 w-4 text-[#64748b]" />}
              onClick={() => setMessage("Single Sign On is coming soon.")}
            >
              <span>Sign in with </span>
              <span className="font-semibold">Single Sign On</span>
            </AuthSocialButton>

            <AuthSocialButton
              type="button"
              icon={<GoogleIcon className="h-5 w-5" />}
              onClick={() => void handleGoogleSignIn()}
              disabled={googleBusy}
            >
              <span>Continue with </span>
              <span className="font-semibold">Google</span>
            </AuthSocialButton>

            <AuthSocialButton
              type="button"
              icon={<AppleIcon className="h-5 w-5" />}
              onClick={() => setMessage("Apple sign-in is coming soon.")}
            >
              <span>Continue with </span>
              <span className="font-semibold">Apple ID</span>
            </AuthSocialButton>
          </div>

          {message ? (
            <p className="mt-5 rounded-md bg-[#fef3c7] px-3 py-2 text-[14px] text-[#92400e]">{message}</p>
          ) : null}

          <div className="mt-20 space-y-6 text-[14px] text-[#6b7280]">
            <p>
              New to Airtable?{" "}
              <Link href="/sign-up" className="font-semibold text-[#2563eb] underline decoration-[1px] underline-offset-2">
                Create an account
              </Link>{" "}
              instead
            </p>
            <p>
              Manage your cookie preferences{" "}
              <button type="button" className="font-semibold text-[#2563eb] underline decoration-[1px] underline-offset-2">
                here
              </button>
            </p>
          </div>
        </section>

        <AuthHeroPanel />
      </div>
    </div>
  );
}
