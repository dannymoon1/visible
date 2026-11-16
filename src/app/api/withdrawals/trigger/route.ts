import { NextResponse } from "next/server";
import { withdrawalAgent } from "@/lib/agents/withdrawal/graph"; // Adjust path if needed

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

export async function POST(req: Request): Promise<NextResponse> {
  try {
    // 1. OPEN the envelope first!
    const body: unknown = await req.json();
    console.log("🔔 Webhook received:", body);

    // 2. Make sure there is actually a record inside
    const record = isRecord(body) ? body.record : undefined;
    if (!isRecord(record) || !record.id) {
      console.log("⚠️ No record ID found in webhook body");
      return NextResponse.json({ error: "No ID found" }, { status: 400 });
    }

    const withdrawalId = String(record.id);
    console.log("🚀 Starting Agent for ID:", withdrawalId);

    // 3. Run the "Brain" (The Agent)
    const result = await withdrawalAgent.invoke({
      withdrawalId: withdrawalId
    });

    console.log("✅ Agent Finished! Verified:", result.isVerified);

    return NextResponse.json({ message: "Agent processed successfully" });

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Agent Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}