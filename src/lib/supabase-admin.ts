import { createClient } from "@supabase/supabase-js";

/** Server-only Supabase client using the service role key. Never import this from client components. */
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
