import { serialize } from "cookie";
import { NextResponse } from "next/server";
import { COOKIE_OPTIONS } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({
    message: "Logout successful",
    success: true
  });

  // Clear the auth token cookie using standard options
  response.cookies.set("authToken", "", {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });

  return response;
}
