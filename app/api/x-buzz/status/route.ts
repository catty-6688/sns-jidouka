import { NextResponse } from "next/server";
import { getXProviderStatus } from "@/app/lib/x-buzz/providers";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getXProviderStatus());
}
