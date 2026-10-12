/**
 * Non-blocking client-side telemetry for menu and navigation clicks.
 * Uses navigator.sendBeacon or fetch with keepalive to ensure delivery even
 * when the user is transitioning pages.
 */
export function trackMenuClick(
  menuKey: string,
  path: string,
  source: string = "nav",
) {
  try {
    if (typeof window === "undefined") return;

    const send = () => {
      try {
        const payload = JSON.stringify({ menuKey, path, source });

        if (
          typeof navigator !== "undefined" &&
          typeof navigator.sendBeacon === "function"
        ) {
          const blob = new Blob([payload], { type: "application/json" });
          const sent = navigator.sendBeacon("/api/telemetry/menu", blob);
          if (sent) return;
        }

        // Fallback if sendBeacon failed or is unavailable
        fetch("/api/telemetry/menu", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Fire-and-forget; silent error
        });
      } catch {
        // Silent error
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      window.requestIdleCallback(send, { timeout: 1000 });
    } else {
      setTimeout(send, 0);
    }
  } catch {
    // Never interrupt user experience for analytics
  }
}
