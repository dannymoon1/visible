import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { verificationAgent } from "@/lib/agents/verification/graph";

export async function POST(req) {
  try {
    // 1. Only admins can run verification
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admins only." }, { status: 403 });
    }

    // 2. Run the agent
    const { submissionId } = await req.json();

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required." }, { status: 400 });
    }

    const result = await verificationAgent.invoke({ submissionId });

    return NextResponse.json({
      verdict: result.verdict,
      engagement_status: result.engagement.status,
      quality_score: result.quality?.score ?? null,
      verification_flags: result.flags,
      verification_summary: result.summary,
    });
  } catch (error) {
    console.error("Verification Agent Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
