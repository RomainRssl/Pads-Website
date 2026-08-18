import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;

  if (nextUrl.pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    if (session.user?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  if (nextUrl.pathname.startsWith("/endurance")) {
    if (!session) {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
    if (!session.user?.enduranceAccess && session.user?.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/", nextUrl));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/admin/:path*", "/endurance/:path*"],
};
