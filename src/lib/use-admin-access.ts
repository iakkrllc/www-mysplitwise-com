"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./auth-store";
import { supabase } from "./supabase";
import type { PermissionKey, StaffMember } from "./permissions";

interface AdminAccess {
  loading: boolean;
  staff: StaffMember | null;
  permissions: PermissionKey[];
  error: string | null;
}

/** Calls an /api/admin/* route with the current session's bearer token. */
export async function callAdminApi(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch(path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export function useAdminAccess(): AdminAccess {
  const { user, loading: authLoading } = useAuth();
  const [state, setState] = useState<AdminAccess>({
    loading: true,
    staff: null,
    permissions: [],
    error: null,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setState({ loading: false, staff: null, permissions: [], error: "Not signed in" });
      return;
    }
    let cancelled = false;
    callAdminApi("/api/admin/me")
      .then((json) => {
        if (cancelled) return;
        setState({ loading: false, staff: json.staff, permissions: json.permissions, error: null });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({ loading: false, staff: null, permissions: [], error: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, [user, authLoading]);

  return state;
}
