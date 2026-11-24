import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";
import { suggestPosts } from "@/lib/agents/post/assistant";
import { taskPlatforms } from "@/components/PlatformIcon";

const MAX_NOTE_LENGTH = 500;

interface SuggestionRequest {
  taskId?: unknown;
  platform?: unknown;
  language?: unknown;
  note?: unknown;
}

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // 1. Only logged-in users can use the assistant
    //    (middleware skips /api routes, so we check here)
    const cookieStore = await cookies();
    // A missing URL/key makes createServerClient throw (caught below), as before
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
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
    const json: unknown = await req.json();
    // A null body threw on property access before; keep that 500 path
    if (json === null) throw new TypeError("Invalid request body");
    const body: SuggestionRequest = typeof json === "object" ? json : {};
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
      .eq("id", String(body.taskId))
      .maybeSingle();

    if (error || !task) {
      return NextResponse.json({ error: "Campaign not found." }, { status: 404 });
    }

    const platforms = taskPlatforms(task);
    const requestedPlatform = typeof body.platform === "string" ? body.platform : "";
    const platform = platforms.includes(requestedPlatform) ? requestedPlatform : platforms[0] || "Social media";
    const languages = task.languages?.length ? task.languages : ["English"];
    const requestedLanguage = typeof body.language === "string" ? body.language : "";
    // languages is never empty here, so languages[0] is defined
    const language = languages.includes(requestedLanguage) ? requestedLanguage : languages[0]!;

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
    console.error("Post Assistant Error:", error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: "Could not generate post ideas. Please try again." },
      { status: 500 }
    );
  }
}
