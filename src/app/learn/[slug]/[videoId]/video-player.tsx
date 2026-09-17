"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { reportVideoIssue, saveVideoProgress } from "@/app/learn/actions";
import { btn, input } from "@/components/ui";

const SAVE_EVERY_MS = 10_000;
const COMPLETE_AT = 0.9;

// Minimal typing for the YouTube IFrame Player API we use.
type YTPlayer = { getCurrentTime(): number; getDuration(): number };
type YTNamespace = {
  Player: new (
    el: HTMLIFrameElement,
    opts: {
      events: {
        onReady: () => void;
        onStateChange: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}
const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;

let youtubeApi: Promise<YTNamespace> | null = null;
function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  youtubeApi ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return youtubeApi;
}

/** enablejsapi lets the IFrame API attach; start resumes an unfinished video. */
function youtubeEmbedSrc(id: string, resumeAt: number) {
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1",
    enablejsapi: "1",
  });
  if (resumeAt > 0) params.set("start", String(Math.floor(resumeAt)));
  return `https://www.youtube-nocookie.com/embed/${id}?${params}`;
}

type Props = {
  videoId: string;
  source:
    | { kind: "file"; url: string }
    | { kind: "youtube"; id: string }
    | { kind: "external"; url: string };
  initialSeconds: number;
  initialCompleted: boolean;
  /** Whether this is the last published video in its course. */
  isLastVideo: boolean;
  /** Whether the caller already gave feedback for this course. */
  hasCourseFeedback: boolean;
  courseHref: string;
  courseId: string;
  courseSlug: string;
};

export function VideoPlayer({
  videoId,
  source,
  initialSeconds,
  initialCompleted,
  isLastVideo,
  hasCourseFeedback,
  courseHref,
}: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const ytFrame = useRef<HTMLIFrameElement>(null);
  const ytPlayer = useRef<YTPlayer | null>(null);
  const lastSave = useRef(0);
  const completedRef = useRef(initialCompleted);
  const [completed, setCompleted] = useState(initialCompleted);
  const [saving, setSaving] = useState(false);

  async function persist(seconds: number, done: boolean) {
    setSaving(true);
    const res = await saveVideoProgress({
      videoId,
      secondsWatched: seconds,
      completed: done,
    });
    setSaving(false);
    if (res.ok && done) {
      completedRef.current = true;
      setCompleted(true);
    }
  }

  const reached = (current: number, duration: number) =>
    duration > 0 && current / duration >= COMPLETE_AT;

  /** While playing: save every SAVE_EVERY_MS, or right away on reaching COMPLETE_AT. */
  function onPlaying(current: number, duration: number) {
    const now = Date.now();
    const done = reached(current, duration);
    if (
      now - lastSave.current > SAVE_EVERY_MS ||
      (done && !completedRef.current)
    ) {
      lastSave.current = now;
      void persist(current, done);
    }
  }

  function onPaused(current: number, duration: number) {
    lastSave.current = Date.now();
    void persist(current, reached(current, duration));
  }

  useEffect(() => {
    const el = ref.current;
    if (!el || source.kind === "youtube") return;

    const onLoaded = () => {
      if (initialSeconds > 0 && initialSeconds < el.duration - 5)
        el.currentTime = initialSeconds;
    };
    const onTime = () => onPlaying(el.currentTime, el.duration);
    const onPause = () => onPaused(el.currentTime, el.duration);
    const onEnded = () => void persist(el.duration, true);

    el.addEventListener("loadedmetadata", onLoaded);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, source.kind]);

  // YouTube has no timeupdate event: attach the IFrame Player API to the
  // iframe and poll while it plays. If the API script can't load (blocked,
  // offline) the iframe still plays, just without tracking.
  useEffect(() => {
    const frame = ytFrame.current;
    if (!frame || source.kind !== "youtube") return;

    let cancelled = false;
    let poll: ReturnType<typeof setInterval> | undefined;
    const stopPolling = () => clearInterval(poll);

    loadYouTubeApi().then((YT) => {
      if (cancelled) return;
      const player = new YT.Player(frame, {
        events: {
          // Methods like getCurrentTime only exist once the player is ready.
          onReady: () => {
            if (!cancelled) ytPlayer.current = player;
          },
          onStateChange: (e) => {
            const t = player.getCurrentTime();
            const d = player.getDuration();
            stopPolling();
            if (e.data === YT_PLAYING) {
              poll = setInterval(
                () => onPlaying(player.getCurrentTime(), player.getDuration()),
                1000,
              );
            } else if (e.data === YT_PAUSED) {
              onPaused(t, d);
            } else if (e.data === YT_ENDED) {
              void persist(d, true);
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      stopPolling();
      ytPlayer.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, source.kind]);

  const currentTime = () =>
    ytPlayer.current?.getCurrentTime() ?? ref.current?.currentTime ?? 0;

  const showFeedbackNudge = completed && isLastVideo && !hasCourseFeedback;

  return (
    <div className="space-y-3">
      <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
        {source.kind === "file" && (
          <video
            ref={ref}
            src={source.url}
            controls
            controlsList="nodownload"
            playsInline
            className="h-full w-full"
          />
        )}
        {source.kind === "youtube" && (
          <iframe
            ref={ytFrame}
            src={youtubeEmbedSrc(
              source.id,
              initialCompleted ? 0 : initialSeconds,
            )}
            title="วิดีโอบทเรียน"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="h-full w-full"
          />
        )}
        {source.kind === "external" && (
          <video
            ref={ref}
            src={source.url}
            controls
            playsInline
            className="h-full w-full"
          />
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span className="text-ink-2">
          {completed
            ? "✓ ดูจบแล้ว"
            : saving
              ? "กำลังบันทึก…"
              : "ระบบจะบันทึกความคืบหน้าอัตโนมัติ"}
        </span>
        <div className="flex items-center gap-3">
          <ReportIssueButton videoId={videoId} />
          {!completed && (
            <button
              type="button"
              onClick={() => persist(currentTime(), true)}
              className={btn.secondary}
            >
              ทำเครื่องหมายว่าดูจบแล้ว
            </button>
          )}
        </div>
      </div>

      {showFeedbackNudge && (
        <p className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-lemon/40 bg-lemon-soft px-4 py-3 text-sm text-lemon">
          <span>ดูจบคอร์สนี้แล้ว! ขอ feedback สักครู่ได้ไหม</span>
          <Link
            href={`${courseHref}/feedback`}
            className="font-medium underline underline-offset-4"
          >
            ให้ feedback คอร์สนี้
          </Link>
        </p>
      )}
    </div>
  );
}

/** Small always-available "report an issue with this video" affordance. */
function ReportIssueButton({ videoId }: { videoId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    setState("sending");
    const res = await reportVideoIssue({ videoId, message });
    if (res.ok) {
      setState("sent");
      setMessage("");
    } else {
      setState("error");
    }
  }

  if (state === "sent") {
    return <span className="text-sm text-mint">ขอบคุณสำหรับการแจ้งปัญหา</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm text-ink-2 underline-offset-4 hover:text-danger hover:underline"
      >
        แจ้งปัญหาวิดีโอนี้
      </button>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center"
    >
      <input
        autoFocus
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="เช่น เสียงเบา ภาพไม่ชัด เนื้อหาข้ามช่วง"
        maxLength={1000}
        disabled={state === "sending"}
        className={`${input} sm:w-64`}
      />
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={state === "sending" || !message.trim()}
          className={btn.secondary}
        >
          {state === "sending" ? "กำลังส่ง…" : "ส่ง"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-ink-2 hover:text-ink"
        >
          ยกเลิก
        </button>
      </div>
      {state === "error" && (
        <span className="text-danger">ส่งไม่สำเร็จ กรุณาลองใหม่</span>
      )}
    </form>
  );
}
