import { type NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const authSecret = process.env.AUTH_SECRET ?? "dev-auth-secret-change-me";

const AUTH_PAGES = new Set([
  "/sign-in",
  "/sign-in/password",
  "/sign-up",
  "/sign-up/profile",
]);

export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const token = await getToken({ req, secret: authSecret });
  const isSignedIn = Boolean(token);
  const isAuthPage = AUTH_PAGES.has(pathname);

  if (!isSignedIn && !isAuthPage) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }

  if (isSignedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
