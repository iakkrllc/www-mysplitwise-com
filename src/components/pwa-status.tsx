"use client";

import { useEffect, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";
import { MysplitwiseMark } from "./mysplitwise-logo";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PWAStatus() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [showInstall, setShowInstall] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const onBIP = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (localStorage.getItem("pwa-install-dismissed") !== "1") {
        setShowInstall(true);
      }
    };
    const onInstalled = () => {
      setShowInstall(false);
      setDeferred(null);
    };
    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);

    window.addEventListener("beforeinstallprompt", onBIP);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    setOffline(typeof navigator !== "undefined" && !navigator.onLine);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBIP);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setShowInstall(false);
    setDeferred(null);
  };

  const dismiss = () => {
    setShowInstall(false);
    try {
      localStorage.setItem("pwa-install-dismissed", "1");
    } catch {
      /* ignore */
    }
  };

  return (
    <>
      {offline && (
        <div className="fixed left-1/2 top-3 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-full bg-sw-charcoal px-3.5 py-1.5 text-xs font-semibold text-white shadow-lg animate-fade-up">
          <WifiOff className="h-3.5 w-3.5" />
          You&apos;re offline — changes save on this device
        </div>
      )}

      {showInstall && deferred && (
        <div className="fixed bottom-4 left-1/2 z-50 w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 animate-fade-up">
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-xl">
            <MysplitwiseMark size={36} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-sw-charcoal">
                Install mysplitwise
              </p>
              <p className="text-xs text-muted-foreground">
                Add to your home screen for one-tap access &amp; offline use.
              </p>
            </div>
            <button
              type="button"
              onClick={install}
              className="flex shrink-0 items-center gap-1.5 rounded-lg bg-[hsl(var(--sw-green-strong))] px-3 py-2 text-sm font-bold text-white"
            >
              <Download className="h-4 w-4" /> Install
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
