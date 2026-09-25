import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { menuKey, path, source } = body ?? {};

    if (!menuKey || typeof menuKey !== "string") {
      return NextResponse.json({ error: "Invalid menuKey" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Only record authenticated users
    if (!user) {
      return new Response(null, { status: 204 });
    }

    await supabase.from("menu_click_events").insert({
      user_id: user.id,
      menu_key: menuKey.trim().slice(0, 50),
      path: typeof path === "string" ? path.trim().slice(0, 200) : "",
      source: typeof source === "string" ? source.trim().slice(0, 50) : "nav",
    });

    return new Response(null, { status: 204 });
  } catch {
    return new Response(null, { status: 500 });
  }
}
