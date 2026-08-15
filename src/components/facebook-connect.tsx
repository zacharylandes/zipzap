"use client";

import { useState } from "react";

type Status = {
  connected: boolean;
  message: string;
};

export function FacebookConnect({ enabled }: { enabled: boolean }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);

  if (!enabled) return null;

  async function refresh() {
    try {
      const res = await fetch("/api/facebook/status");
      if (!res.ok) {
        setStatus({ connected: false, message: "Facebook adapter unavailable" });
        return;
      }
      setStatus(await res.json());
    } catch {
      setStatus({ connected: false, message: "Unable to check Facebook status" });
    }
  }

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/facebook/session", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to open Facebook login window");
        return;
      }
      setLoginOpen(true);
      setStatus({ connected: false, message: data.message });
    } catch {
      setError("Failed to open Facebook login window");
    } finally {
      setBusy(false);
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/facebook/session", { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to save Facebook session");
        return;
      }
      setLoginOpen(false);
      setStatus({ connected: data.connected, message: data.message });
    } catch {
      setError("Failed to save Facebook session");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="hs-facebook" aria-label="Facebook Marketplace connection">
      <div>
        <p className="hs-eyebrow">Experimental</p>
        <h2 className="hs-heading hs-heading--sm">Facebook Marketplace</h2>
        <p className="hs-copy">
          {status?.message ||
            "Runs locally in your own Chrome. Step 1 opens a Chrome window on your machine \u2014 sign in to Facebook there. Step 2 saves the session so future searches reuse it."}
        </p>
        {error ? <p className="hs-error">{error}</p> : null}
      </div>
      <div className="hs-facebook__actions">
        <button
          className="hs-btn hs-btn--outline"
          type="button"
          onClick={connect}
          disabled={busy}
        >
          {busy ? "Opening\u2026" : "1. Open Facebook login"}
        </button>
        <button
          className="hs-btn hs-btn--outline"
          type="button"
          onClick={finish}
          disabled={busy || !loginOpen}
        >
          2. I&rsquo;m signed in
        </button>
        <button
          className="hs-btn hs-btn--ghost"
          type="button"
          onClick={() => void refresh()}
        >
          Refresh status
        </button>
      </div>
    </section>
  );
}
