"use client";

import Script from "next/script";
import { useEffect, useMemo, useState } from "react";

declare global {
  interface Window {
    Paddle?: {
      Environment?: {
        set: (environment: "sandbox" | "production") => void;
      };
      Initialize: (input: {
        token: string;
        eventCallback?: (event: { name?: string }) => void;
      }) => void;
      Checkout: {
        open: (input: {
          transactionId: string;
          settings?: {
            displayMode?: "overlay";
            theme?: "dark";
            successUrl?: string;
          };
        }) => void;
      };
    };
  }
}

type PaddleCheckoutClientProps = {
  transactionId: string;
  clientToken: string;
  environment: "sandbox" | "production";
  successUrl: string;
  cancelUrl: string;
};

export function PaddleCheckoutClient({
  transactionId,
  clientToken,
  environment,
  successUrl,
  cancelUrl
}: PaddleCheckoutClientProps) {
  const [scriptReady, setScriptReady] = useState(false);
  const [checkoutOpened, setCheckoutOpened] = useState(false);
  const [error, setError] = useState("");

  const normalizedSuccessUrl = useMemo(() => successUrl, [successUrl]);

  useEffect(() => {
    if (!scriptReady || checkoutOpened) {
      return;
    }

    if (!window.Paddle) {
      setError("Paddle checkout could not be loaded. Please refresh and try again.");
      return;
    }

    try {
      if (environment === "sandbox") {
        window.Paddle.Environment?.set("sandbox");
      }

      window.Paddle.Initialize({
        token: clientToken,
        eventCallback: (event) => {
          if (event?.name === "checkout.closed") {
            window.location.assign(cancelUrl);
          }
        }
      });

      window.Paddle.Checkout.open({
        transactionId,
        settings: {
          displayMode: "overlay",
          theme: "dark",
          successUrl: normalizedSuccessUrl
        }
      });

      setCheckoutOpened(true);
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Paddle checkout could not be opened. Please try again."
      );
    }
  }, [cancelUrl, checkoutOpened, clientToken, environment, normalizedSuccessUrl, scriptReady, transactionId]);

  return (
    <>
      <Script
        src="https://cdn.paddle.com/paddle/v2/paddle.js"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
        onError={() => setError("Paddle checkout script failed to load. Please try again.")}
      />

      <div className="rounded-[2rem] border border-emerald-400/20 bg-[radial-gradient(circle_at_top,_rgba(52,211,153,0.16),_rgba(0,0,0,0.95)_62%)] p-7 text-center shadow-[0_0_36px_rgba(74,222,128,0.08)] md:p-9">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Card / Paddle Checkout</p>
        <h1 className="mt-3 text-3xl font-semibold text-white md:text-4xl">Opening secure checkout...</h1>
        <p className="mt-3 text-base leading-8 text-zinc-300">
          Your Paddle checkout should open automatically. If it doesn&apos;t, refresh this page and try again.
        </p>
        {error ? <p className="mt-5 text-sm font-medium text-rose-300">{error}</p> : null}
      </div>
    </>
  );
}
