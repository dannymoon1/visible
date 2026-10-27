import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { suggestComments } from "@/lib/agents/comment/assistant";

const MAX_POST_LENGTH = 4000;

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
    const postContent = String(body.postContent || "").trim();

    if (!postContent) {
      return NextResponse.json(
        { error: "Paste the post's caption or text first." },
        { status: 400 }
      );
    }

    if (postContent.length > MAX_POST_LENGTH) {
      return NextResponse.json(
        { error: `Post content is too long (max ${MAX_POST_LENGTH} characters).` },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      console.error("GROQ_API_KEY is missing.");
      return NextResponse.json(
        { error: "Comment assistant is not configured." },
        { status: 500 }
      );
    }

    // 3. Run the agent
    const suggestions = await suggestComments({
      postContent,
      platform: body.platform,
      taskTitle: body.taskTitle,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error("Comment Assistant Error:", error.message);
    return NextResponse.json(
      { error: "Could not generate suggestions. Please try again." },
      { status: 500 }
    );
  }
}
