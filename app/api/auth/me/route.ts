import { NextResponse } from "next/server";
import { getAuthUserFromCookies } from "@/lib/auth";

const unauthorizedMessage = "\u063a\u064a\u0631\u0020\u0645\u0635\u0631\u062d";

export async function GET() {
  const user = await getAuthUserFromCookies();

  if (!user) {
    return NextResponse.json({ message: unauthorizedMessage }, { status: 401 });
  }

  return NextResponse.json({ user });
}
