import { NextResponse } from "next/server";
import { withdrawalAgent } from "@/lib/agents/withdrawal/graph"; // Adjust path if needed

export async function POST(req) {
  try {
    // 1. OPEN the envelope first!
    const body = await req.json();
    console.log("🔔 Webhook received:", body);

    // 2. Make sure there is actually a record inside
    if (!body.record || !body.record.id) {
      console.log("⚠️ No record ID found in webhook body");
      return NextResponse.json({ error: "No ID found" }, { status: 400 });
    }

    const withdrawalId = body.record.id;
    console.log("🚀 Starting Agent for ID:", withdrawalId);

    // 3. Run the "Brain" (The Agent)
    const result = await withdrawalAgent.invoke({
      withdrawalId: withdrawalId
    });

    console.log("✅ Agent Finished! Verified:", result.isVerified);

    return NextResponse.json({ message: "Agent processed successfully" });

  } catch (error) {
    console.error("❌ Agent Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}