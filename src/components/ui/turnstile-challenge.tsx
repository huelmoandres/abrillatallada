"use client";

import Script from "next/script";
import { useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import type { Ref } from "react";
import { CONSULTATION_TURNSTILE_ACTION, CONSULTATION_TURNSTILE_TOKEN_LIMIT } from "@/lib/consultation-security-contract";
import "./turnstile-challenge.css";

type WidgetSize = "flexible" | "compact";
type WidgetPhase = "loading" | "ready" | "verified" | "expired" | "error" | "unavailable";
type TurnstileApi = {
  render: (container: HTMLElement, options: {
    sitekey: string;
    action: string;
    theme: "light";
    language: "es";
    size: WidgetSize;
    retry: "never";
    "refresh-expired": "manual";
    "refresh-timeout": "manual";
    "response-field": false;
    callback: (token: string) => void;
    "expired-callback": () => void;
    "timeout-callback": () => void;
    "error-callback": () => boolean;
  }) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileChallengeHandle = { reset: () => void };

type TurnstileChallengeProps = {
  onTokenChange: (token: string) => void;
  fallbackHref: string;
  ref?: Ref<TurnstileChallengeHandle>;
};

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
const PHASE_MESSAGE: Record<WidgetPhase, string> = {
  loading: "Preparando la verificación…",
  ready: "Completá la verificación para enviar tu consulta.",
  verified: "Verificación completada.",
  expired: "La verificación venció. Volvé a completarla antes de enviar.",
  error: "No pudimos completar la verificación. Podés intentarlo de nuevo o escribirnos por email.",
  unavailable: "La verificación no está disponible en este momento. Podés escribirnos por email.",
};

export function TurnstileChallenge({ onTokenChange, fallbackHref, ref }: TurnstileChallengeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const widgetSizeRef = useRef<WidgetSize | null>(null);
  const generationRef = useRef(0);
  const [phase, setPhase] = useState<WidgetPhase>("loading");

  const removeWidget = useCallback(() => {
    const widgetId = widgetIdRef.current;
    widgetIdRef.current = null;
    widgetSizeRef.current = null;
    generationRef.current++;
    if (widgetId !== null) {
      try { window.turnstile?.remove(widgetId); } catch { /* A removed widget has no reusable token. */ }
    }
  }, []);

  const renderWidget = useCallback(() => {
    const container = containerRef.current;
    const api = window.turnstile;
    if (!SITE_KEY || !container || !api) return;
    const width = container.getBoundingClientRect().width;
    if (width <= 0) return;
    const size: WidgetSize = width < 300 ? "compact" : "flexible";
    if (widgetIdRef.current !== null && widgetSizeRef.current === size) return;
    removeWidget();
    onTokenChange("");
    const generation = generationRef.current;
    const current = () => generation === generationRef.current;
    const invalidate = (next: WidgetPhase) => {
      if (!current()) return;
      onTokenChange("");
      setPhase(next);
    };
    setPhase("ready");
    try {
      widgetSizeRef.current = size;
      widgetIdRef.current = api.render(container, {
        sitekey: SITE_KEY,
        action: CONSULTATION_TURNSTILE_ACTION,
        theme: "light",
        language: "es",
        size,
        retry: "never",
        "refresh-expired": "manual",
        "refresh-timeout": "manual",
        "response-field": false,
        callback: (token) => {
          if (!current()) return;
          if (!token || token.length > CONSULTATION_TURNSTILE_TOKEN_LIMIT) {
            invalidate("error");
            return;
          }
          onTokenChange(token);
          setPhase("verified");
        },
        "expired-callback": () => invalidate("expired"),
        "timeout-callback": () => invalidate("expired"),
        "error-callback": () => { invalidate("error"); return true; },
      });
    } catch {
      widgetSizeRef.current = null;
      invalidate("error");
    }
  }, [onTokenChange, removeWidget]);

  const resetWidget = useCallback(() => {
    onTokenChange("");
    const api = window.turnstile;
    if (!api) {
      setPhase("unavailable");
      return;
    }
    const widgetId = widgetIdRef.current;
    if (widgetId === null) {
      renderWidget();
      return;
    }
    try {
      api.reset(widgetId);
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [onTokenChange, renderWidget]);

  useImperativeHandle(ref, () => ({ reset: resetWidget }), [resetWidget]);

  useEffect(() => {
    if (!SITE_KEY) return;
    let active = true;
    const observer = new ResizeObserver(() => { if (active) renderWidget(); });
    if (containerRef.current) observer.observe(containerRef.current);
    const startupTimeout = setTimeout(() => {
      if (active) setPhase((previous) => previous === "loading" ? "unavailable" : previous);
    }, 12_000);
    return () => {
      active = false;
      clearTimeout(startupTimeout);
      observer.disconnect();
      removeWidget();
    };
  }, [renderWidget, removeWidget]);

  const visiblePhase = SITE_KEY ? phase : "unavailable";
  const retry = visiblePhase === "error" || visiblePhase === "expired";
  const fallback = retry || visiblePhase === "unavailable";

  return (
    <section className="turnstile-challenge" aria-label="Verificación de seguridad">
      <p className="turnstile-challenge-label">Verificación de seguridad</p>
      {SITE_KEY ? <div className="turnstile-challenge-widget" ref={containerRef} /> : null}
      <p className="turnstile-challenge-status" role="status" aria-live="polite">{PHASE_MESSAGE[visiblePhase]}</p>
      {fallback ? <div className="turnstile-challenge-actions">
        {retry ? <button type="button" className="text-link" onClick={resetWidget}>Volver a verificar</button> : null}
        <a className="text-link" href={fallbackHref}>Escribir por email</a>
      </div> : null}
      {SITE_KEY ? <Script
        id="consultation-turnstile-script"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={() => { onTokenChange(""); setPhase("unavailable"); }}
      /> : null}
    </section>
  );
}
