import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { suggestPosts } from "@/lib/agents/post/assistant";
import { taskPlatforms } from "@/components/PlatformIcon";

const MAX_NOTE_LENGTH = 500;

export async function POST(req) {
  try {
    // 1. Only logged-in users can use the assistant
    //    (middleware skips /api routes, so we check here)
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll() {
            // Not needed: this route only reads the session
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in." }, { status: 401 });
    }

    // 2. Validate the input
    const body = await req.json();
    const note = String(body.note || "").trim();

    if (!body.taskId) {
      return NextResponse.json({ error: "Missing campaign." }, { status: 400 });
    }

    if (note.length > MAX_NOTE_LENGTH) {
      return NextResponse.json(
        { error: `Your note is too long (max ${MAX_NOTE_LENGTH} characters).` },
        { status: 400 }
      );
    }

    // 3. Load the brief from the database, not the browser, so the
    //    drafts always match what the advertiser actually paid for
    const { data: task, error } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", body.taskId)
      .maybeSingle();

    if (error || !task) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const platforms = taskPlatforms(task);
    const platform = platforms.includes(body.platform) ? body.platform : platforms[0] || "Social media";
    const languages = task.languages?.length ? task.languages : ["English"];
    const language = languages.includes(body.language) ? body.language : languages[0];

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is missing.");
      return NextResponse.json(
        { error: "Post assistant is not configured." },
        { status: 500 }
      );
    }

    // 4. Run the agent
    const { suggestions, references } = await suggestPosts({ task, platform, language, note });

    return NextResponse.json({ suggestions, references });
  } catch (error) {
    console.error("Post Assistant Error:", error.message);
    return NextResponse.json(
      { error: "Could not generate post ideas. Please try again." },
      { status: 500 }
    );
  }
}
