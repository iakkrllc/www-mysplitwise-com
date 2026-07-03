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
    if (!error) logEvent(data.session?.access_token, "signup");
    return { error: error?.message ?? null };
  };

  const signIn: AuthContextValue["signIn"] = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!error) logEvent(data.session?.access_token, "login");
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
    }
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    const { data } = await supabase.auth.getSession();
    logEvent(data.session?.access_token, "logout");
    await supabase.auth.signOut();
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
