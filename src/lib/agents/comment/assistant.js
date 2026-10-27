import { ChatGroq } from "@langchain/groq";

// The assistant only SUGGESTS ideas. The user edits the comment and
// posts it themselves; nothing here posts to any social platform.
const SYSTEM_PROMPT = `You help people write thoughtful, genuine comments on social media posts.
Given a post's content, suggest 3 distinct comment ideas that:
- respond to something specific in the post (not generic praise like "Nice post!")
- sound natural and human, 1-2 sentences each
- vary in style: one appreciative, one that asks a genuine question, one that adds a personal angle or insight
- avoid hashtags, links, spammy emoji strings, and claims about personal experiences the user may not have had
  (phrase personal angles as templates, e.g. "This reminds me of [your experience]...")

Reply with ONLY valid JSON in this exact shape:
{"suggestions": ["...", "...", "..."]}`;

export async function suggestComments({ postContent, platform, taskTitle }) {
  const llm = new ChatGroq({
    apiKey: process.env.GROQ_API_KEY,
    model: "openai/gpt-oss-120b",
    temperature: 0.8,
    maxRetries: 1, // fail fast instead of retrying for ~90s
  });

  const response = await llm.invoke([
    ["system", SYSTEM_PROMPT],
    [
      "human",
      `Platform: ${platform || "Social media"}
Task: ${taskTitle || "Engage with this post"}

Post content:
"""
${postContent}
"""`,
    ],
  ]);

  return parseSuggestions(response.content);
}

// The model is asked for JSON, but may wrap it in extra text or code fences.
function parseSuggestions(text) {
  const match = String(text).match(/\{[\s\S]*\}/);

  if (match) {
    try {
      const parsed = JSON.parse(match[0]);
      if (Array.isArray(parsed.suggestions)) {
        return parsed.suggestions
          .map((s) => String(s).trim())
          .filter(Boolean)
          .slice(0, 3);
      }
    } catch {
      // fall through to the line-based fallback below
    }
  }

  // Fallback: treat each non-empty line as a suggestion
  return String(text)
    .split("\n")
    .map((line) => line.replace(/^[\s\d.\-*"]+|"$/g, "").trim())
    .filter(Boolean)
    .slice(0, 3);
}
