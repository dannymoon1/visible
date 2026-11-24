import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/types";
import { verificationAgent } from "@/lib/agents/verification/graph";

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // 1. Only admins can run verification
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .single();

    if (!profile?.is_admin) {
      return NextResponse.json({ error: "Admins only." }, { status: 403 });
    }

    // 2. Run the agent
    const body: unknown = await req.json();
    // A null body threw on destructuring before; keep that 500 path
    if (body === null) throw new TypeError("Invalid request body");
    const submissionId =
      typeof body === "object" && "submissionId" in body ? body.submissionId : undefined;

    if (!submissionId) {
      return NextResponse.json({ error: "submissionId is required." }, { status: 400 });
    }

    const result = await verificationAgent.invoke({ submissionId: String(submissionId) });

    return NextResponse.json({
      verdict: result.verdict,
      engagement_status: result.engagement.status,
      quality_score: result.quality?.score ?? null,
      verification_flags: result.flags,
      verification_summary: result.summary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Verification Agent Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
