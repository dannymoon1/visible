import { StateGraph, Annotation } from "@langchain/langgraph";
import { createClient } from "@supabase/supabase-js";
import type { Database, Submission, Task } from "@/lib/types";
import { verifyEngagement, verifyPost, detectPlatform, type EngagementResult } from "./platforms";
import { heuristicCheck, aiQualityCheck, type QualityFlag } from "./quality";

// Score thresholds for the final verdict
const PASS_SCORE = 60;
const FAIL_SCORE = 40;

export type SubmissionWithTask = Submission & { tasks: Task | null };

export interface QualityResult {
  score: number;
  flags: QualityFlag[];
  aiReason: string | null;
  commentText: string;
}

export type Verdict = "pass" | "review" | "fail";

// 1. THE STATE
// Fields are filled in node order: each node reads only what earlier nodes set.
export const VerificationState = Annotation.Root({
  submissionId: Annotation<string>(),
  submission: Annotation<SubmissionWithTask>(),
  duplicateCount: Annotation<number>(),
  engagement: Annotation<EngagementResult>(),
  quality: Annotation<QualityResult>(),
  verdict: Annotation<Verdict>(),
  flags: Annotation<string[]>(),
  summary: Annotation<string>(),
});

type State = typeof VerificationState.State;
type Update = typeof VerificationState.Update;

function getSupabase() {
  if (!process.env.SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_SECRET_KEY is missing from .env.local");
  }
  // A missing URL makes createClient throw, as before
  return createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY);
}

// 2. THE NODES

// Node 1: Load the submission, its task, and look for copy-pasted text
const fetchSubmission = async (state: State): Promise<Update> => {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("submissions")
    .select("*, tasks (*)")
    .eq("id", state.submissionId)
    .maybeSingle();

  if (error) throw new Error(`Database Error: ${error.message}`);
  if (!data) throw new Error(`Submission ${state.submissionId} not found.`);

  // The same comment text submitted by someone else = copy-paste farming
  let duplicateCount = 0;
  const text = data.comment_text?.trim();
  if (text) {
    const escaped = text.replace(/[\\%_]/g, "\\$&");
    const { count } = await supabase
      .from("submissions")
      .select("id", { count: "exact", head: true })
      .ilike("comment_text", escaped)
      .neq("user_id", data.user_id);
    duplicateCount = count || 0;
  }

  return { submission: data, duplicateCount };
};

// Node 2: Confirm through the platform API that the post (or, for older
// engagement tasks, the comment) exists
const checkEngagement = async (state: State): Promise<Update> => {
  const { submission } = state;
  const engagement = submission.post_url
    ? await verifyPost({
        postUrl: submission.post_url,
        platform: submission.post_platform,
        handle: submission.social_handle,
      })
    : await verifyEngagement({
        link: submission.tasks?.link,
        handle: submission.social_handle,
      });
  return { engagement };
};

// Node 3: Score the post/comment for low effort / spam
const checkQuality = async (state: State): Promise<Update> => {
  const { submission, engagement, duplicateCount } = state;
  const isPost = Boolean(submission.post_url);
  const task: Partial<Task> = submission.tasks || {};

  // Prefer the text the API returned; fall back to what the user submitted
  const commentText = engagement.comment?.text || submission.comment_text || "";

  const rules = heuristicCheck(commentText, { duplicateCount, allowLinks: isPost });
  const ai = await aiQualityCheck({
    commentText,
    taskTitle: task.title,
    taskDescription: task.description,
    platform: isPost ? submission.post_platform : detectPlatform(task.link).platform,
    // The brief is the campaign's description; older campaigns kept it in content_details
    brief: isPost ? task.description || task.content_details || task.title : undefined,
  });

  // The lower score wins, so neither check can be gamed on its own
  const score = ai ? Math.min(rules.score, ai.score) : rules.score;

  return {
    quality: { score, flags: rules.flags, aiReason: ai?.reason || null, commentText },
  };
};

// Node 4: Combine both checks into pass / review / fail
const decide = async (state: State): Promise<Update> => {
  const { engagement, quality } = state;
  const flags: string[] = [...(quality?.flags || [])];
  const reasons = [engagement.detail];

  if (engagement.status === "not_found") {
    flags.push(state.submission.post_url ? "post_not_found" : "comment_not_found");
  }
  if (engagement.status === "unverifiable") flags.push("unverifiable");
  if (engagement.status === "error") flags.push("api_error");
  if (quality?.aiReason) reasons.push(`AI: ${quality.aiReason}`);

  let verdict: Verdict;
  if (engagement.status === "not_found") {
    verdict = "fail";
  } else if (quality.score < FAIL_SCORE) {
    verdict = "fail";
  } else if (engagement.status === "found" && quality.score >= PASS_SCORE) {
    verdict = "pass";
  } else {
    // Unverifiable platform, API error, or a borderline comment
    verdict = "review";
  }

  return { verdict, flags, summary: reasons.filter(Boolean).join(" ") };
};

// Node 5: Save the result for the admin dashboard
const saveResult = async (state: State): Promise<Update> => {
  const supabase = getSupabase();

  const { error } = await supabase
    .from("submissions")
    .update({
      verification_verdict: state.verdict,
      engagement_status: state.engagement.status,
      quality_score: state.quality?.score ?? null,
      verification_flags: state.flags,
      verification_summary: state.summary,
      verified_at: new Date().toISOString(),
    })
    .eq("id", state.submissionId);

  if (error) throw new Error(`Could not save verification: ${error.message}`);
  return state;
};

// 3. THE GRAPH
const workflow = new StateGraph(VerificationState)
  .addNode("fetch_submission", fetchSubmission)
  .addNode("check_engagement", checkEngagement)
  .addNode("check_quality", checkQuality)
  .addNode("decide", decide)
  .addNode("save_result", saveResult)

  .addEdge("__start__", "fetch_submission")
  .addEdge("fetch_submission", "check_engagement")
  .addEdge("check_engagement", "check_quality")
  .addEdge("check_quality", "decide")
  .addEdge("decide", "save_result")
  .addEdge("save_result", "__end__");

export const verificationAgent = workflow.compile();
