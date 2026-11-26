import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export async function proxy(req: NextRequest) {
  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: "next-auth.session-token",
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

  // ── Domain (from env: "lvh.me:3000" locally, "myschoolapp.com" online)
  const host = hostname.toLowerCase();
  const mainDomain = (process.env.MAIN_DOMAIN || "lvh.me:3000").toLowerCase();
  const isLocal = host.includes("lvh.me") || host.includes("localhost");
  const protocol = isLocal ? "http" : "https";

  const isMainDomain =
    host === mainDomain ||
    host === `www.${mainDomain}` ||
    host === "localhost:3000" ||
    host === "lvh.me:3000" ||
    host.endsWith(".vercel.app");

  // School slug from the subdomain ("" on the main domain)
  let currentHost = "";
  if (!isMainDomain) {
    for (const root of [mainDomain, "localhost:3000"]) {
      if (host.endsWith(`.${root}`)) {
        currentHost = host.slice(0, -(root.length + 1));
        break;
      }
    }
  }

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

  // ── Super-admin APIs: other roles may only READ their OWN school ──
  if (pathname.startsWith("/api/superadmin") && role !== "super_admin") {
    const sp = req.nextUrl.searchParams;
    const ownSchoolId = String(token.schoolId || "");
    const isRead = req.method === "GET";

    const ownSchool =
      (sp.get("id") && sp.get("id") === ownSchoolId) ||
      (sp.get("slug") && sp.get("slug") === userSchoolSlug);

    const allowed =
      isRead &&
      // School info (Topbar, logo, export headers, forms) — own school only
      ((pathname === "/api/superadmin/schools" && ownSchool) ||
        // Dashboard payment warning — own invoices only
        (pathname === "/api/superadmin/invoices" && sp.get("schoolId") === ownSchoolId));

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (role === "super_admin") {
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