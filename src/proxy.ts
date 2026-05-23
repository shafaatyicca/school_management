import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });
  const { pathname } = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  if (
    pathname.includes(".") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/favicon.ico")
  ) {
    return NextResponse.next();
  }

  const currentHost = hostname
    .replace(".lvh.me:3000", "")
    .replace(".localhost:3000", "")
    .replace("localhost:3000", "")
    .replace("lvh.me:3000", "");

  const isLocal = hostname.includes("lvh.me") || hostname.includes("localhost");
  const protocol = isLocal ? "http" : "https";
  const mainDomain = process.env.MAIN_DOMAIN || "lvh.me:3000";

  const isMainDomain =
    hostname === "localhost:3000" ||
    hostname === "lvh.me:3000" ||
    hostname === mainDomain;

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!pathname.startsWith("/login")) {
      return NextResponse.redirect(
        new URL("/login", `${protocol}://${hostname}`),
      );
    }
    return NextResponse.next();
  }

  const role = token.role;
  const userSchoolSlug = token.schoolSlug;

  if (role === "super_admin" || role === "super-admin") {
    return NextResponse.next();
  }

  if (role === "school_admin") {
    if (pathname.startsWith("/superadmin")) {
      return NextResponse.redirect(
        new URL(`${protocol}://${userSchoolSlug}.${mainDomain}/`),
      );
    }

    if (!isMainDomain && currentHost !== userSchoolSlug) {
      return NextResponse.redirect(
        new URL(`${protocol}://${userSchoolSlug}.${mainDomain}${pathname}`),
      );
    }

    if (isMainDomain && userSchoolSlug) {
      return NextResponse.redirect(
        new URL(`${protocol}://${userSchoolSlug}.${mainDomain}${pathname}`),
      );
    }
  }

  let cleanPath = pathname;
  if (pathname.startsWith("/dashboard")) {
    cleanPath = pathname.replace("/dashboard", "") || "/";
  }

  return NextResponse.rewrite(new URL(cleanPath, req.url));
}

export const config = {
  matcher: [
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico)$|.*\\.js$|.*\\.css$).*)",
  ],
};
