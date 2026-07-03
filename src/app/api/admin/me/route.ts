import { NextRequest, NextResponse } from "next/server";
import { requireCallerStaff } from "@/lib/staff-admin";

export async function GET(req: NextRequest) {
  const result = await requireCallerStaff(req);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }
  return NextResponse.json({ staff: result.staff, permissions: result.permissions });
}
