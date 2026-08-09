import { withdrawalAgent } from "./src/lib/agents/withdrawal/graph.js";
import dotenv from "dotenv";
import path from "path";

// 1. Manually point to your .env.local file
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function test() {
  console.log("🚀 Starting Agent Test...");
  
  // 2. Double check the keys are loaded in the console
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("❌ Error: NEXT_PUBLIC_SUPABASE_URL is missing from .env.local");
    return;
  }

  try {
    // Replace this with a real ID from your withdrawals table in Supabase
    const testId = "89d68e64-28df-41a6-bcf8-5e7fcc071af8"; 

    const result = await withdrawalAgent.invoke({
      withdrawalId: testId
    });

    console.log("✅ Agent Result:", JSON.stringify(result, null, 2));
  } catch (error) {
    console.error("❌ Agent Failed:", error.message);
  }
}

test();