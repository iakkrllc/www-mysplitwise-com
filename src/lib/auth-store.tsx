"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    name: string,
  ) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  sendPhoneOtp: (
    phone: string,
    name?: string,
  ) => Promise<{ error: string | null }>;
  verifyPhoneOtp: (
    phone: string,
    token: string,
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  startPhoneChange: (phone: string) => Promise<{ error: string | null }>;
  confirmPhoneChange: (
    phone: string,
    code: string,
  ) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function logEvent(accessToken: string | undefined, eventType: "login" | "signup" | "logout") {
  if (!accessToken) return;
  fetch("/api/log-activity", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ eventType }),
  }).catch(() => {});
}

// Ensures the caller has a profile row and re-attributes any placeholder
// profile (a friend added them by email before they'd joined) onto their
// real account. Fire-and-forget, same as logEvent above, and — like that
// call — deliberately done from application code after a successful auth
// response rather than a DB trigger on auth.users/auth.sessions.
function claimInvitesEvent(accessToken: string | undefined) {
  if (!accessToken) return;
  fetch("/api/sync/claim-invites", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => {});
}

// A failed login has no session/token — logged without auth, purely for the
// security activity log's visibility. Never blocks or slows down the actual
// sign-in attempt.
function logFailedLoginEvent(email: string) {
  fetch("/api/log-activity", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventType: "login_failed", attemptedEmail: email }),
  }).catch(() => {});
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
      },
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  const signUp: AuthContextValue["signUp"] = async (email, password, name) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    if (!error) {
      logEvent(data.session?.access_token, "signup");
      claimInvitesEvent(data.session?.access_token);
    }
    return { error: error?.message ?? null };
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) {
      logEvent(data.session?.access_token, "login");
      claimInvitesEvent(data.session?.access_token);
    } else {
      logFailedLoginEvent(email);
    }
    return { error: error?.message ?? null };
  };

  const sendPhoneOtp: AuthContextValue["sendPhoneOtp"] = async (
    phone,
    name,
  ) => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
      options: name ? { data: { name } } : undefined,
    });
    return { error: error?.message ?? null };
  };

  const verifyPhoneOtp: AuthContextValue["verifyPhoneOtp"] = async (
    phone,
    token,
  ) => {
    const { data, error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: "sms",
    });
    if (!error) {
      const isNewAccount = data.user && Date.now() - new Date(data.user.created_at).getTime() < 60_000;
      logEvent(data.session?.access_token, isNewAccount ? "signup" : "login");
      claimInvitesEvent(data.session?.access_token);
    }
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    const { data } = await supabase.auth.getSession();
    logEvent(data.session?.access_token, "logout");
    await supabase.auth.signOut();
  };

  const updatePassword: AuthContextValue["updatePassword"] = async (newPassword) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    return { error: error?.message ?? null };
  };

  // Texts an OTP to the NEW number for an already-signed-in user — different
  // from sendPhoneOtp above, which is the sign-in/sign-up flow.
  const startPhoneChange: AuthContextValue["startPhoneChange"] = async (phone) => {
    const { error } = await supabase.auth.updateUser({ phone });
    return { error: error?.message ?? null };
  };

  const confirmPhoneChange: AuthContextValue["confirmPhoneChange"] = async (
    phone,
    code,
  ) => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token: code,
      type: "phone_change",
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider
      value={{
        user: session?.user ?? null,
        session,
        loading,
        signUp,
        signIn,
        sendPhoneOtp,
        verifyPhoneOtp,
        signOut,
        updatePassword,
        startPhoneChange,
        confirmPhoneChange,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
