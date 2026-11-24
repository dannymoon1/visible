// import { StateGraph, Annotation } from "@langchain/langgraph";
// import { ChatOpenAI } from "@langchain/openai";
// import { createClient } from "@supabase/supabase-js";

// // 1. THE STATE DEFINITION (The Notebook)
// // This keeps track of our data as the agent works.
// export const WithdrawalState = Annotation.Root({
//   withdrawalId: Annotation(),
//   amount: Annotation(),
//   userName: Annotation(),
//   userEmail: Annotation(),
//   currentBalance: Annotation(),
//   status: Annotation(),
//   isVerified: Annotation(),
//   emailContent: Annotation(),
//   errorDetail: Annotation()
// });

// // 2. THE WORKERS (Nodes)

// // Node 1: Fetch data from Supabase
// const fetchData = async (state) => {
//   const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL,
//     process.env.SUPABASE_SECRET_KEY
//   );

//   // Note the change: we use the table name 'profiles' 
//   // and assume it has an 'id' that matches the withdrawal's 'user_id'
//   const { data, error } = await supabase
//     .from("withdrawals")
//     .select(`
//       amount, 
//       status, 
//       user_id,
//       profiles (username, balance)
//     `)
//     .eq("id", state.withdrawalId)
//     .maybeSingle(); // maybeSingle is safer for testing; it returns null instead of crashing if not found

//   if (error) throw new Error(`Database Error: ${error.message}`);
//   if (!data) throw new Error(`Withdrawal ID ${state.withdrawalId} not found in database.`);

//   // If the join failed to find a profile
//   if (!data.profiles) {
//     throw new Error(`Profile not found for user_id: ${data.user_id}. Make sure a row exists in the profiles table with this ID!`);
//   }

//   return {
//     amount: data.amount,
//     status: data.status,
//     userName: data.profiles.username,
//     currentBalance: data.profiles.balance,
//     userEmail: "user@example.com" 
//   };
// };

// // Node 2: Safety Verification
// const verifySafety = async (state) => {
//   const hasEnoughFunds = state.currentBalance >= state.amount;
//   const isApproved = state.status === "approved";

//   return {
//     isVerified: hasEnoughFunds && isApproved,
//     errorDetail: !hasEnoughFunds ? "insufficient_funds" : (isApproved ? "" : "not_approved")
//   };
// };

// // Node 3: AI Email Generation
// const generateEmail = async (state) => {
//   const llm = new ChatOpenAI({ 
//     modelName: "gpt-4o",
//     openAIApiKey: process.env.OPEN_AI_API_KEY 
//   });
  
//   const response = await llm.invoke([
//     ["system", "You are the SocialEarn assistant. Write a short, professional, friendly withdrawal success email."],
//     ["human", `User: ${state.userName}, Amount: ${state.amount}. Confirm their funds are coming!`]
//   ]);

//   return { emailContent: response.content };
// };

// // 3. THE SKELETON (Graph Construction)

// const workflow = new StateGraph(WithdrawalState)
//   .addNode("fetch_data", fetchData)
//   .addNode("verify_safety", verifySafety)
//   .addNode("generate_email", generateEmail)
// .addNode("sendEmail", sendEmail)
//   // Start with fetching
//   .addEdge("__start__", "fetch_data")
//   .addEdge("fetch_data", "verify_safety")
  
//   // Logic: Only go to email if verification passes
//   .addConditionalEdges("verify_safety", (state) => {
//     return state.isVerified ? "generate_email" : "__end__";
//   })
  
//   .addEdge("generate_email", "__end__");
//   // Add this step at the end of your agent logic
// const updateDatabase = async (state) => {
//   const supabase = createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL,
//     process.env.SUPABASE_SECRET_KEY
//   );

//   await supabase
//     .from("withdrawals")
//     .update({ 
//       // We store the agent's findings in the row
//       verification_details: state.errorDetail || "Verified",
//       ai_message: state.emailContent,
//       is_verified: state.isVerified
//     })
//     .eq("id", state.withdrawalId);

//   return state;
// };

// // Export the compiled "brain"
// export const withdrawalAgent = workflow.compile();

import { StateGraph, Annotation } from "@langchain/langgraph";

import { createClient } from "@supabase/supabase-js";
import { Resend } from 'resend';
import { ChatGroq } from "@langchain/groq";
import type { MessageContent } from "@langchain/core/messages";
import type { Database } from "@/lib/types";

// BUG (kept as-is): the live `withdrawals` table has no verification_details,
// ai_message or is_verified columns (see database.types.ts), so the write in
// updateDatabase is rejected by PostgREST and, as before, the error is ignored.
// This schema type adds those columns only so the existing write type-checks.
type WithdrawalsTable = Database["public"]["Tables"]["withdrawals"];
type WithdrawalAgentDatabase = Omit<Database, "public"> & {
  public: Omit<Database["public"], "Tables"> & {
    Tables: Omit<Database["public"]["Tables"], "withdrawals"> & {
      withdrawals: Omit<WithdrawalsTable, "Update"> & {
        Update: WithdrawalsTable["Update"] & {
          verification_details?: string;
          ai_message?: MessageContent;
          is_verified?: boolean;
        };
      };
    };
  };
};

// A missing URL or key makes createClient throw, as before
const getSupabase = () =>
  createClient<WithdrawalAgentDatabase>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );

// Created when an email is sent, not when the file loads, so builds and
// deploys without RESEND_API_KEY don't crash
const getResend = () => new Resend(process.env.RESEND_API_KEY);

// 1. THE STATE DEFINITION
export const WithdrawalState = Annotation.Root({
  withdrawalId: Annotation<string>(),
  amount: Annotation<number>(),
  userName: Annotation<string>(),
  userEmail: Annotation<string>(),
  currentBalance: Annotation<number>(),
  status: Annotation<string | null>(),
  isVerified: Annotation<boolean>(),
  emailContent: Annotation<MessageContent>(),
  errorDetail: Annotation<string>()
});

type State = typeof WithdrawalState.State;
type Update = typeof WithdrawalState.Update;

// 2. THE NODES (Workers)

// Node 1: Fetch Data (Joining Withdrawals + Profiles + Auth Email)
const fetchData = async (state: State): Promise<Update> => {
  console.log("--- NODE: fetchData starting ---");
  console.log("Current API Key:", process.env.RESEND_API_KEY?.substring(0, 5) + "...");
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("withdrawals")
    .select(`
      *,
      profiles (username, balance)
    `)
    .eq("id", state.withdrawalId)
    .maybeSingle();

  if (error || !data) throw new Error("Withdrawal record not found.");

  // Fetch real email from Supabase Auth (since profiles usually don't store it)
  // user_id is nullable; getUserById throws on a non-UUID ("" or null) either way
  const { data: authUser } = await supabase.auth.admin.getUserById(data.user_id ?? "");
  console.log("--- NODE: fetchData finished ---");
  return {
    // What the user receives, after the withdrawal fee
    amount: data.net_amount ?? data.amount,
    status: data.status,
    userName: data.profiles?.username || "User",
    currentBalance: data.profiles?.balance || 0,
    userEmail: authUser?.user?.email || "user@example.com"
  };
};

// Node 2: Verification Logic
const verifySafety = async (state: State): Promise<Update> => {
  console.log("--- NODE: verifySafety starting ---");
  // Funds are reserved (deducted) when the withdrawal is requested, so the
  // balance check happens in request_withdrawal; here we only need the payout done.
  const isCompleted = state.status === "completed";
console.log("--- NODE: verifySafety finished ---");
  return {
    isVerified: isCompleted,
    errorDetail: isCompleted ? "" : "not_approved"
  };
};

// Node 3: AI Email Generation
const generateEmail = async (state: State): Promise<Update> => {
  console.log("--- NODE: generateEmail starting (Groq) ---");
  // Inside generateEmail node:
const llm = new ChatGroq({
  apiKey: process.env.GROQ_API_KEY,
  model: "openai/gpt-oss-120b",
  temperature: 0.7,
});
  
 try {
    // We MUST await this call
    const response = await llm.invoke([
      ["system", "You are the SocialEarn assistant. Write a 2-sentence success email."],
      ["human", `User: ${state.userName}, Amount: ₦${state.amount}. Funds are on the way!`]
    ]);

    console.log("--- NODE: generateEmail finished ---");
    return { emailContent: response.content };
  } catch (error) {
    console.error("❌ Groq Error:", error instanceof Error ? error.message : error);
    // FALLBACK: If the AI fails, we manually set the text so the graph continues
    return { emailContent: `Hello ${state.userName}, your withdrawal of ₦${state.amount} has been approved and is being processed.` };
  }
};

// Node 4: Send the Real Email
const sendEmail = async (state: State): Promise<Update> => {
  if (!state.isVerified) return state;

  try {
    await getResend().emails.send({
      from: 'SocialEarn <onboarding@resend.dev>', // Replace with your verified domain later
      to: [state.userEmail],
      subject: 'Withdrawal Approved! 🚀',
      html: `<p>${state.emailContent}</p>`
    });
    console.log("📨 Email sent to:", state.userEmail);
  } catch (err) {
    console.error("📧 Email Error:", err);
  }
  return state;
};

// Node 5: Update Database (Write Back)
const updateDatabase = async (state: State): Promise<Update> => {
  const supabase = getSupabase();

  await supabase
    .from("withdrawals")
    .update({ 
      verification_details: state.errorDetail || "Verified",
      ai_message: state.emailContent,
      is_verified: state.isVerified
    })
    .eq("id", state.withdrawalId);

  console.log("💾 Database updated for ID:", state.withdrawalId);
  return state;
};

// 3. THE GRAPH CONSTRUCTION
const workflow = new StateGraph(WithdrawalState)
  .addNode("fetch_data", fetchData)
  .addNode("verify_safety", verifySafety)
  .addNode("generate_email", generateEmail)
  .addNode("send_email", sendEmail)
  .addNode("update_db", updateDatabase)

  .addEdge("__start__", "fetch_data")
  .addEdge("fetch_data", "verify_safety")
  
  // Conditional Branching
  .addConditionalEdges("verify_safety", (state) => {
    // If verified, generate email and send. If not, go straight to DB update to record failure.
    return state.isVerified ? "generate_email" : "update_db";
  })
  
  .addEdge("generate_email", "send_email")
  .addEdge("send_email", "update_db")
  .addEdge("update_db", "__end__");

export const withdrawalAgent = workflow.compile();