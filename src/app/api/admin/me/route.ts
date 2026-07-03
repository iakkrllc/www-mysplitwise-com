import { NextRequest, NextResponse } from "next/server";
import { requireCallerStaff } from "@/lib/staff-admin";

export async function GET(req: NextRequest) {
  try {
    const result = await requireCallerStaff(req);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ staff: result.staff, permissions: result.permissions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
