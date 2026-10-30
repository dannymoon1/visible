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
//     process.env.SUPABASE_SERVICE_ROLE_KEY
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
//     process.env.SUPABASE_SERVICE_ROLE_KEY
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

const resend = new Resend(process.env.RESEND_API_KEY);

// 1. THE STATE DEFINITION
export const WithdrawalState = Annotation.Root({
  withdrawalId: Annotation(),
  amount: Annotation(),
  userName: Annotation(),
  userEmail: Annotation(),
  currentBalance: Annotation(),
  status: Annotation(),
  isVerified: Annotation(),
  emailContent: Annotation(),
  errorDetail: Annotation()
});

// 2. THE NODES (Workers)

// Node 1: Fetch Data (Joining Withdrawals + Profiles + Auth Email)
const fetchData = async (state) => {
  console.log("--- NODE: fetchData starting ---");
  console.log("Current API Key:", process.env.RESEND_API_KEY?.substring(0, 5) + "...");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
    
  );

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
  const { data: authUser } = await supabase.auth.admin.getUserById(data.user_id);
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
const verifySafety = async (state) => {
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
const generateEmail = async (state) => {
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
    console.error("❌ Groq Error:", error.message);
    // FALLBACK: If the AI fails, we manually set the text so the graph continues
    return { emailContent: `Hello ${state.userName}, your withdrawal of ₦${state.amount} has been approved and is being processed.` };
  }
};

// Node 4: Send the Real Email
const sendEmail = async (state) => {
  if (!state.isVerified) return state;

  try {
    await resend.emails.send({
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
const updateDatabase = async (state) => {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

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