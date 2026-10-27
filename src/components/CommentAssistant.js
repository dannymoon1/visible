"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Copy, Check, ExternalLink, X } from "lucide-react";
import { Button, Field, Textarea, cn } from "@/components/ui";

export default function CommentAssistant({ task }) {
  const [open, setOpen] = useState(false);
  const [postContent, setPostContent] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const getSuggestions = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/comment-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postContent,
          platform: task.platform,
          taskTitle: task.title,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setSuggestions(data.suggestions || []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // The user posts the comment themselves: we only copy it and open the post
  const copyAndOpen = async () => {
    try {
      await navigator.clipboard.writeText(comment);
      setCopied(true);
      toast.success("Comment copied", { description: "Paste it on the post to publish." });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Please copy the comment manually.");
    }

    if (task.link) {
      window.open(task.link, "_blank", "noopener,noreferrer");
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition hover:text-brand-800"
      >
        <Sparkles className="h-4 w-4" />
        Need comment ideas?
      </button>
    );
  }

  return (
    <div className="animate-fade-in space-y-5 py-2">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
          <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600">
            <Sparkles className="h-4 w-4" />
          </span>
          Comment assistant
        </p>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          aria-label="Close comment assistant"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* 1. Post content */}
      <Field
        label="What's the post about?"
        hint="Paste the caption or describe the post so ideas are specific to it."
      >
        <Textarea
          rows={3}
          value={postContent}
          onChange={(e) => setPostContent(e.target.value)}
          placeholder="Paste the post's caption or text…"
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="brand"
          size="sm"
          icon={suggestions.length ? RefreshCw : Sparkles}
          loading={loading}
          disabled={!postContent.trim()}
          onClick={getSuggestions}
        >
          {loading ? "Thinking…" : suggestions.length ? "New ideas" : "Suggest ideas"}
        </Button>
        {task.link && (
          <a
            href={task.link}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-ink-800"
          >
            View post <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {/* 2. Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
            Pick an idea to start from
          </p>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setComment(suggestion)}
              className={cn(
                "block w-full rounded-xl border bg-white p-3.5 text-left text-sm leading-relaxed text-ink-700 transition-all",
                comment === suggestion
                  ? "border-brand-500 ring-4 ring-brand-500/10"
                  : "border-ink-200 hover:border-brand-300 hover:shadow-soft"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* 3. Edit, then copy and post it yourself */}
      {(suggestions.length > 0 || comment) && (
        <div className="space-y-3">
          <Field
            label="Your comment"
            hint="Make it your own — personal, specific comments perform best."
          >
            <Textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Edit the idea in your own words…"
            />
          </Field>
          <Button
            size="sm"
            icon={copied ? Check : Copy}
            disabled={!comment.trim()}
            onClick={copyAndOpen}
          >
            {copied ? "Copied" : "Copy & open post"}
          </Button>
        </div>
      )}
    </div>
  );
}
