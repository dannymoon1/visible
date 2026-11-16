// Runs the withdrawal agent once against a real withdrawal row.
// Usage: node --experimental-strip-types test-agent.ts <withdrawal-id>
// It acts on live data, so only run it against a test withdrawal.
import path from "node:path";
import dotenv from "dotenv";
import { withdrawalAgent } from "./src/lib/agents/withdrawal/graph.ts";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function test(): Promise<void> {
  const withdrawalId = process.argv[2];
  if (!withdrawalId) {
    console.error("Pass a withdrawal ID: node --experimental-strip-types test-agent.ts <id>");
    process.exitCode = 1;
    return;
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("NEXT_PUBLIC_SUPABASE_URL is missing from .env.local");
    process.exitCode = 1;
    return;
  }

  console.log("Starting agent test...");
  try {
    const result = await withdrawalAgent.invoke({ withdrawalId });
    console.log("Agent result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("Agent failed:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}

void test();
