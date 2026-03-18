"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState } from "react";

import { AirtableMark, AppleIcon, GoogleIcon, SsoIcon } from "~/app/_components/auth/AuthIcons";
import { AuthSocialButton } from "~/app/_components/auth/AuthSocialButton";

export default function SignUpPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [message, setMessage] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [googleConfigured, setGoogleConfigured] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setEmail(params.get("email") ?? "");
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

  function handleContinueWithEmail(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const encodedEmail = encodeURIComponent(email.trim().toLowerCase());
    const encodedCallback = encodeURIComponent(callbackUrl);
    router.push(`/sign-up/profile?email=${encodedEmail}&callbackUrl=${encodedCallback}`);
  }

  async function handleGoogleSignUp() {
    if (!googleConfigured) {
      setMessage("Google sign-in is not configured yet. Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.");
      return;
    }

    setGoogleBusy(true);
    setMessage(null);
    await signIn("google", { callbackUrl });
    setGoogleBusy(false);
  }

  return (
    <main className="min-h-screen bg-white" style={{ fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif" }}>
      <section className="mx-auto max-w-[680px] px-6 pb-16 pt-6">
        <AirtableMark className="h-10 w-14" />

        <h1 className="mt-16 text-[50px] font-medium leading-tight text-[#111827]">Welcome to Airtable</h1>

        <form onSubmit={handleContinueWithEmail} className="mt-14">
          <label htmlFor="email" className="mb-2 block text-[18px] text-[#111827]">
            Work email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@company.com"
            className="h-12 w-full rounded-[8px] border border-[#d6d8db] px-4 text-[18px] text-[#111827] outline-none transition-colors placeholder:text-[#9ca3af] focus:border-[#8ab0de]"
            required
          />

          <button
            type="submit"
            className="mt-7 h-12 w-full rounded-[8px] bg-[#89ace0] text-[17px] font-semibold text-white transition-colors hover:bg-[#769fd8]"
          >
            Continue with email
          </button>
        </form>

        <p className="my-7 text-center text-[18px] text-[#6b7280]">or</p>

        <div className="space-y-4">
          <AuthSocialButton
            type="button"
            icon={<SsoIcon className="h-4 w-4 text-[#64748b]" />}
            onClick={() => setMessage("Single Sign On is coming soon.")}
          >
            <span>Continue with </span>
            <span className="font-semibold">Single Sign On</span>
          </AuthSocialButton>

          <AuthSocialButton
            type="button"
            icon={<GoogleIcon className="h-5 w-5" />}
            onClick={() => void handleGoogleSignUp()}
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
            <span className="font-semibold">Apple</span>
          </AuthSocialButton>
        </div>

        {message ? (
          <p className="mt-5 rounded-md bg-[#fef3c7] px-3 py-2 text-[14px] text-[#92400e]">{message}</p>
        ) : null}

        <div className="mt-10 space-y-6 text-[14px] leading-relaxed text-[#4b5563]">
          <p>
            By creating an account, you agree to the{" "}
            <button type="button" className="text-[#2563eb] underline">
              Terms of Service
            </button>{" "}
            and{" "}
            <button type="button" className="text-[#2563eb] underline">
              Privacy Policy
            </button>
            .
          </p>

          <p>
            Manage your cookie preferences{" "}
            <button type="button" className="text-[#2563eb] underline">
              here
            </button>
          </p>

          <label className="flex items-start gap-3 text-[14px] leading-7 text-[#4b5563]">
            <input type="checkbox" className="mt-1.5 h-5 w-5 rounded border-[#9ca3af]" />
            <span>
              By checking this box, I agree to receive marketing communications about Airtable products and events.
              I understand that I can manage my preferences at any time by following the instructions in the
              communications received.
            </span>
          </label>

          <p>
            Already have an account?{" "}
            <Link href="/sign-in" className="font-semibold text-[#2563eb] underline">
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
