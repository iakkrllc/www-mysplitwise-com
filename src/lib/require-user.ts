import type { NextRequest } from "next/server";
import { getSupabaseAdmin } from "./supabase-admin";

/** Verifies the request's bearer token and returns the signed-in Supabase user, or null. */
export async function requireUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
