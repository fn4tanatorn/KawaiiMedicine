import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Signed URLs are minted per click, so they can be very short-lived. */
const DOWNLOAD_URL_TTL_SECONDS = 60;

/**
 * Download a course file: checks access under the caller's session (RLS hides
 * unpublished files), then redirects to a short-lived signed URL.
 */
export async function GET(
  request: NextRequest,
  ctx: RouteContext<"/learn/files/[fileId]">,
) {
  const { fileId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const login = new URL("/login", request.nextUrl.origin);
    login.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(login);
  }

  const { data: file } = await supabase
    .from("course_files")
    .select("title, storage_path")
    .eq("id", fileId)
    .maybeSingle();
  if (!file) return new NextResponse("Not found", { status: 404 });

  const filename = `${file.title.replace(/[\\/:*?"<>|]+/g, "-")}.pdf`;
  const { data, error } = await supabase.storage
    .from("course-files")
    .createSignedUrl(file.storage_path, DOWNLOAD_URL_TTL_SECONDS, {
      download: filename,
    });
  if (error || !data?.signedUrl)
    return new NextResponse("Not found", { status: 404 });

  return NextResponse.redirect(data.signedUrl);
}
