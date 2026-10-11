import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/site-url";
import { alert, btn } from "@/components/ui";
import { Logo } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { REGISTRATION_FORM_URL } from "@/lib/constants";
import { signInWithGoogle } from "./actions";

export const metadata: Metadata = { title: "เข้าสู่ระบบ" };

const ERRORS: Record<string, string> = {
  google: "เข้าสู่ระบบด้วย Google ไม่สำเร็จ กรุณาลองใหม่",
  callback: "เกิดข้อผิดพลาดในการเข้าสู่ระบบ กรุณาลองใหม่",
};

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = safeNextPath(typeof sp.next === "string" ? sp.next : undefined);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(next);

  return (
    <main className="relative flex flex-1 items-center justify-center px-6 py-16">
      <ThemeToggle className="absolute top-4 right-4 border border-line bg-surface/80 shadow-soft backdrop-blur" />
      <div className="w-full max-w-sm space-y-8">
        <div className="space-y-2 text-center">
          <Logo className="mx-auto text-brand" />
          <p className="text-xs font-semibold uppercase tracking-widest text-pink">
            KawaiiMedicine
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            เข้าสู่ระบบ
          </h1>
        </div>

        {error && (
          <p role="alert" className={alert.error}>
            {error}
          </p>
        )}

        <div className="space-y-6">
          <form action={signInWithGoogle}>
            <input type="hidden" name="next" value={next} />
            <button type="submit" className={`${btn.secondary} w-full gap-3`}>
              <GoogleIcon />
              เข้าสู่ระบบด้วย Google
            </button>
          </form>

          <div className="rounded-2xl border border-line bg-surface/70 p-4 text-center text-xs text-ink-2 space-y-2.5">
            <p className="font-semibold text-ink">ยังไม่ได้เป็นสมาชิกคลาสเรียน?</p>
            <div className="flex items-center justify-center">
              <a
                href={REGISTRATION_FORM_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${btn.secondary} text-xs py-1.5 px-3`}
              >
                สมัครผ่าน Google Forms ➔
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}


function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.5 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.7 6c4.5-4.2 6.9-10.3 6.9-17.7z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.6A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.1.8-4.6l-7.9-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
