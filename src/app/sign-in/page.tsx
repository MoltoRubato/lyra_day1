"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";

import { BrowserPageMetadata, DEFAULT_FAVICON_HREF } from "~/app/_components/BrowserPageMetadata";
import styles from "./sign-in.module.css";

const OMNI_APP_BUILDING_URL = "https://www.airtable.com/platform/app-building";

function AirtableLogoMark() {
  return (
    <svg
      width="42"
      height="35.699999999999996"
      viewBox="0 0 200 170"
      style={{ shapeRendering: "geometricPrecision" }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g>
        <path
          fill="rgb(255, 186, 5)"
          d="M90.0389,12.3675 L24.0799,39.6605 C20.4119,41.1785 20.4499,46.3885 24.1409,47.8515 L90.3759,74.1175 C96.1959,76.4255 102.6769,76.4255 108.4959,74.1175 L174.7319,47.8515 C178.4219,46.3885 178.4609,41.1785 174.7919,39.6605 L108.8339,12.3675 C102.8159,9.8775 96.0559,9.8775 90.0389,12.3675"
        />
        <path
          fill="rgb(57, 202, 255)"
          d="M105.3122,88.4608 L105.3122,154.0768 C105.3122,157.1978 108.4592,159.3348 111.3602,158.1848 L185.1662,129.5368 C186.8512,128.8688 187.9562,127.2408 187.9562,125.4288 L187.9562,59.8128 C187.9562,56.6918 184.8092,54.5548 181.9082,55.7048 L108.1022,84.3528 C106.4182,85.0208 105.3122,86.6488 105.3122,88.4608"
        />
        <path
          fill="rgb(220, 4, 59)"
          d="M88.0781,91.8464 L66.1741,102.4224 L63.9501,103.4974 L17.7121,125.6524 C14.7811,127.0664 11.0401,124.9304 11.0401,121.6744 L11.0401,60.0884 C11.0401,58.9104 11.6441,57.8934 12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"
        />
        <path
          fill="rgba(0, 0, 0, 0.25)"
          d="M88.0781,91.8464 L66.1741,102.4224 L12.4541,57.1274 C12.7921,56.7884 13.1751,56.5094 13.5731,56.2884 C14.6781,55.6254 16.2541,55.4484 17.5941,55.9784 L87.7101,83.7594 C91.2741,85.1734 91.5541,90.1674 88.0781,91.8464"
        />
      </g>
    </svg>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2045c0-.6381-.0573-1.2518-.1637-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7163v2.2582h2.9086c1.7019-1.5668 2.6837-3.8741 2.6837-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.4673-.8059 5.9564-2.1805l-2.9087-2.2582c-.8059.54-1.8368.8591-3.0477.8591-2.3441 0-4.3282-1.5832-5.0359-3.7105H.9573v2.3318C2.4382 15.9832 5.4818 18 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.9641 10.71A5.3153 5.3153 0 0 1 3.6818 9c0-.5932.1023-1.17.2823-1.71V4.9582H.9573A8.9598 8.9598 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418l3.0068-2.3318z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.3459l2.5813-2.5814C13.4632.8918 11.4259 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582l3.0068 2.3318C4.6718 5.1627 6.6559 3.5795 9 3.5795z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleMark() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="19 19 18 18"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M28.2227 20.3846c.832 0 1.875-.5798 2.4961-1.3528.5625-.7006.9727-1.679  .9727-2.6573 0-.1329-.0117-.2657-.0352-.3745-.9258.0362-2.0391.6402-2.707 1.4495-.5273.616-1.0078 1.5823-1.0078 2.5728 0 .1449.0234.2898.0352.3382.0586.0121.1523.0241.246.0241Zm-2.9297 14.6154c1.1367 0 1.6406-.7851 3.0586-.7851 1.4414 0 1.7578.7609 3.0234.7609 1.2422 0 2.0742-1.1837 2.8594-2.3433.8789-1.3287 1.2422-2.6332 1.2656-2.6936-.082-.0242-2.4609-1.0267-2.4609-3.8411 0-2.4399 1.875-3.5391 1.9805-3.6236-1.2422-1.836-3.1289-1.8843-3.6445-1.8843-1.3945 0-2.5312.8697-3.2461.8697-.7734 0-1.793-.8214-3-.8214-2.2969 0-4.6289 1.9568-4.6289 5.6529 0 2.295  .8672 4.7228 1.9336 6.2931.9141 1.3287 1.7109 2.4158 2.8594 2.4158Z"
        fill="#000"
      />
    </svg>
  );
}

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

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const canContinue = useMemo(
    () => /\S+@\S+\.\S+/.test(normalizedEmail),
    [normalizedEmail],
  );

  async function handleContinue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canContinue) return;

    setMessage(null);
    setIsChecking(true);

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = (await res.json()) as {
        exists?: boolean;
        hasPassword?: boolean;
        message?: string;
      };

      if (!res.ok) {
        setMessage(data.message ?? "Please enter a valid email address.");
        return;
      }

      const encodedEmail = encodeURIComponent(normalizedEmail);
      const encodedCallback = encodeURIComponent(callbackUrl);

      if (!data.exists) {
        router.push(
          `/sign-up?email=${encodedEmail}&callbackUrl=${encodedCallback}`,
        );
        return;
      }

      if (!data.hasPassword) {
        setMessage(
          "This account uses Google sign-in. Please continue with Google.",
        );
        return;
      }

      router.push(
        `/sign-in/password?email=${encodedEmail}&callbackUrl=${encodedCallback}`,
      );
    } catch {
      setMessage("We could not continue. Please try again.");
    } finally {
      setIsChecking(false);
    }
  }

  async function handleGoogleSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!googleConfigured) {
      setMessage(
        "Google sign-in is not configured yet. Add AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET.",
      );
      return;
    }

    setMessage(null);
    setGoogleBusy(true);
    await signIn("google", { callbackUrl });
    setGoogleBusy(false);
  }

  function handleSsoSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("Single Sign On is coming soon.");
  }

  function handleAppleSignIn(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("Apple sign-in is coming soon.");
  }

  function openOmniPanel() {
    window.open(OMNI_APP_BUILDING_URL, "_blank", "noopener,noreferrer");
  }

  return (
    <main className={styles.authSignInPage}>
      <BrowserPageMetadata
        title="Sign in - Airtable"
        iconHref={DEFAULT_FAVICON_HREF}
      />
      <div className="css-1bjff3s">
        <div className="css-s928rf">
          <div className="css-1pxgmwj">
            <div className="css-j12dl9">
              <div className="css-1p4pfxa">
                <AirtableLogoMark />
              </div>

              <h1 className="css-2k51sp">Sign in to Airtable</h1>

              <div className="authWrapper line-height-3 xs-py0 lg-items-center md-items-center sm-items-center xs-col-12 flex justify-center">
                <div className="formContainer rounded-big huge xs-px0 z2 sm-max-width-2 colors-background-default col-12"></div>
              </div>

              <div>
                <div>
                  <div className="lg-rounded-big md-rounded-big sm-rounded-big mb1 col-12 overflow-hidden">
                    <form
                      id="signInEmailForm"
                      method="post"
                      onSubmit={handleContinue}
                    >
                      <input
                        type="hidden"
                        name="urlToRedirectTo"
                        value={callbackUrl}
                      />
                      <input type="hidden" name="countryCode" value="" />
                      <input
                        type="hidden"
                        name="didConsentToMarketing"
                        value=""
                      />

                      <div id="sign-in-form-fields-root" className="col-12">
                        <div className="mb2-and-half p-quarter relative block">
                          <label
                            htmlFor="emailLogin"
                            className="heading-size-xsmall"
                          >
                            Email
                          </label>
                          <div className="mt1"></div>
                          <div style={{ width: "100%" }}>
                            <input
                              type="email"
                              className="css-1bdipsb ignore-baymax-defaults width-full stroked-blue-inset-outset-focus"
                              id="emailLogin"
                              name="email"
                              placeholder="Email address"
                              spellCheck={false}
                              aria-invalid="false"
                              autoFocus
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              data-testid="emailInput"
                              required
                            />
                          </div>
                        </div>

                        <button
                          className="pointer border-box text-decoration-none print-color-exact focus-visible rounded-big ignore-baymax-defaults font-weight-strong colors-background-primary-control shadow-elevation-low shadow-elevation-low-hover px2 button-size-large flex-inline css-1qd8c56 items-center justify-center border-none text-white"
                          type="submit"
                          disabled={!canContinue || isChecking}
                          aria-disabled={!canContinue || isChecking}
                        >
                          <span className="noevents button-text-label no-user-select truncate">
                            {isChecking ? "Checking..." : "Continue"}
                          </span>
                        </button>
                      </div>
                    </form>
                  </div>

                  <div>
                    <form action="/sso/login" onSubmit={handleSsoSignIn}>
                      <input type="hidden" name="countryCode" value="" />
                      <input
                        type="hidden"
                        name="didConsentToMarketing"
                        value=""
                      />
                      <div className="my2-and-half flex items-center justify-center">
                        <p className="huge colors-foreground-subtle center flex items-center">
                          or
                        </p>
                      </div>

                      <button
                        className="pointer border-box text-decoration-none print-color-exact focus-visible rounded-big ignore-baymax-defaults colors-foreground-default colors-background-raised-control shadow-elevation-low shadow-elevation-low-hover px1-and-half button-size-default flex-inline width-full items-center justify-center border-none"
                        type="submit"
                        aria-disabled="false"
                      >
                        <span className="noevents button-text-label no-user-select truncate">
                          <p className="font-family-default text-size-large text-color-default line-height-4 font-weight-default ml1">
                            Sign in with{" "}
                            <span className="css-35ezg3">Single Sign On</span>
                          </p>
                        </span>
                      </button>
                    </form>

                    <form
                      action="/auth/googleLogin"
                      onSubmit={handleGoogleSignIn}
                    >
                      <input type="hidden" name="countryCode" value="" />
                      <input
                        type="hidden"
                        name="didConsentToMarketing"
                        value=""
                      />
                      <div className="css-1v3caum">
                        <button
                          className="pointer border-box text-decoration-none print-color-exact focus-visible rounded-big ignore-baymax-defaults colors-foreground-default colors-background-raised-control shadow-elevation-low shadow-elevation-low-hover px1-and-half button-size-default flex-inline width-full items-center justify-center border-none"
                          type="submit"
                          aria-disabled={googleBusy}
                          disabled={googleBusy}
                        >
                          <span className="gap1-and-quarter noevents button-text-label no-user-select flex items-center truncate">
                            <div className="css-wenr2e">
                              <GoogleMark />
                            </div>
                            <p className="font-family-default text-size-large text-color-default line-height-4 font-weight-default">
                              {googleBusy ? "Connecting to " : "Continue with "}
                              <span className="css-35ezg3">Google</span>
                            </p>
                          </span>
                        </button>
                      </div>
                    </form>

                    <div>
                      <div className="items-end">
                        <div>
                          <form
                            action="/auth/appleLogin"
                            className="pb1"
                            onSubmit={handleAppleSignIn}
                          >
                            <input type="hidden" name="countryCode" value="" />
                            <input
                              type="hidden"
                              name="didConsentToMarketing"
                              value=""
                            />
                            <div className="css-1v3caum">
                              <button
                                className="pointer border-box text-decoration-none print-color-exact focus-visible rounded-big ignore-baymax-defaults colors-foreground-default colors-background-raised-control shadow-elevation-low shadow-elevation-low-hover px1-and-half button-size-default flex-inline width-full items-center justify-center border-none"
                                type="submit"
                                aria-disabled="false"
                              >
                                <span className="gap1-and-quarter noevents button-text-label no-user-select flex items-center truncate">
                                  <div className="css-wenr2e">
                                    <AppleMark />
                                  </div>
                                  <p className="font-family-default text-size-large text-color-default line-height-4 font-weight-default">
                                    Continue with{" "}
                                    <span className="css-35ezg3">Apple ID</span>
                                  </p>
                                </span>
                              </button>
                            </div>
                          </form>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {message ? (
                <p className={styles.inlineMessage}>{message}</p>
              ) : null}

              <p className={`css-1ibshur ${styles.newToAirtableLine}`}>
                New to Airtable?{" "}
                <Link href="/sign-up" className="css-1mxpef6">
                  Create an account
                </Link>{" "}
                instead
              </p>
              <p className="css-1ibshur">
                Manage your cookie preferences{" "}
                <button
                  type="button"
                  className="css-1xm46ll"
                  onClick={() =>
                    setMessage("Cookie preference management is coming soon.")
                  }
                >
                  here
                </button>
              </p>
            </div>
          </div>

          <div className="justify-left mt3-and-half lg-justify-center xs-hide sm-hide md-hide flex items-center">
            <div
              tabIndex={0}
              role="button"
              className={`focus-visible ${styles.heroFocusWrap}`}
              aria-label="Learn more about app building"
              onClick={openOmniPanel}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  openOmniPanel();
                }
              }}
            >
              <div className="css-1v9h1jy"></div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
