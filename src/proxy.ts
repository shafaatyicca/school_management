import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";

export const proxy = async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const { pathname } = req.nextUrl;

  if (
    pathname.includes(".") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const role = token.role;
  const userSchoolId = token.schoolId;

  const pathSegments = pathname.split("/");
  const urlSchoolId = pathSegments[1];

  if (role === "super_admin") {
    return NextResponse.next();
  }

  if (role === "school_admin") {
    if (pathname.startsWith("/superadmin")) {
      return NextResponse.redirect(new URL(`/${userSchoolId}`, req.url));
    }
    if (
      urlSchoolId &&
      urlSchoolId !== userSchoolId &&
      urlSchoolId !== "superadmin" &&
      urlSchoolId !== "api"
    ) {
      return NextResponse.redirect(new URL(`/${userSchoolId}`, req.url));
    }
  }

  return NextResponse.next();
};

// Ye middleware kin paths par apply hoga
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - login (login page)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!login|api/auth|_next/static|_next/image|favicon.ico|.*\\.(?:jpg|jpeg|gif|png|svg|ico)$|.*\\.js$|.*\\.css$).*)",
  ],
};
