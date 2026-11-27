"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Cloudflare Turnstile, the bot check Supabase Auth verifies (tier 1 of the
// creator-launch build; set-up in docs/setup/captcha.md).
//
// With captcha on in Supabase, sign-up, password sign-in and "send a new code"
// each need a fresh token: a token works once. Call reset() after every
// attempt. Without NEXT_PUBLIC_TURNSTILE_SITE_KEY nothing renders and the
// token stays undefined, so local development works with captcha off.
//
// The widget only shows when Cloudflare wants a tap ("interaction-only");
// most people never see it.

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit&onload=__vcTurnstileReady";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
    __vcTurnstileReady?: () => void;
  }
}

let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      window.__vcTurnstileReady = () => resolve(window.turnstile!);
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        loading = null;
        script.remove();
        reject(new Error("Turnstile failed to load"));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

export const captchaEnabled = Boolean(SITE_KEY);

// const captcha = useCaptcha();
// <Captcha {...captcha.props} />, then pass captcha.token as captchaToken and
// call captcha.reset() once the request is done.
export function useCaptcha() {
  const [token, setToken] = useState<string | undefined>();
  const [round, setRound] = useState(0);
  const [failed, setFailed] = useState(false);
  const reset = useCallback(() => {
    setToken(undefined);
    setFailed(false);
    setRound((r) => r + 1);
  }, []);
  return {
    token,
    // Waiting for a token: keep the submit button busy
    pending: captchaEnabled && !token && !failed,
    failed,
    reset,
    props: { round, onToken: setToken, onFail: () => setFailed(true) },
  };
}

export function Captcha({
  round,
  onToken,
  onFail,
}: {
  round: number;
  onToken: (token: string | undefined) => void;
  onFail: () => void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  // A new round renders a new widget, so a new token
  useEffect(() => {
    if (!SITE_KEY || !box.current) return;
    let id: string | undefined;
    let cancelled = false;
    setError(false);
    loadTurnstile()
      .then((api) => {
        if (cancelled || !box.current) return;
        id = api.render(box.current, {
          sitekey: SITE_KEY,
          appearance: "interaction-only",
          theme: "light",
          size: "flexible",
          callback: (t: string) => onToken(t),
          "expired-callback": () => onToken(undefined),
          "error-callback": () => {
            setError(true);
            onFail();
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        onFail();
      });
    return () => {
      cancelled = true;
      if (id) window.turnstile?.remove(id);
    };
    // onToken and onFail are state setters from useCaptcha, stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  if (!SITE_KEY) return null;
  return (
    <div>
      <div ref={box} />
      {error && (
        <p role="alert" className="mt-2 text-sm text-error">
          We couldn&apos;t load the security check. Check your connection, then reload this page.
        </p>
      )}
    </div>
  );
}
