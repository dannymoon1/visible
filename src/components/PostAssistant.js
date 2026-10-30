"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Send,
  Download,
  X,
  CircleCheck,
  CircleAlert,
} from "lucide-react";
import { Button, Field, Textarea, Select, cn } from "@/components/ui";
import { taskPlatforms } from "@/components/PlatformIcon";

const X_CHAR_LIMIT = 280;

export default function PostAssistant({ task }) {
  const platforms = taskPlatforms(task);
  const languages = task.languages?.length ? task.languages : ["English"];

  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState(platforms[0] || "");
  const [language, setLanguage] = useState(languages[0]);
  const [note, setNote] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [references, setReferences] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const getSuggestions = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/post-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: task.id, platform, language, note }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong.");
        return;
      }

      setSuggestions(data.suggestions || []);
      setReferences(data.references || []);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // The user publishes the post themselves: we only copy the text
  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(draft);
      setCopied(true);
      toast.success("Post copied", { description: `Paste it into ${platform || "your app"} to publish.` });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy automatically. Please copy the post manually.");
    }
  };

  // X is the only platform with a simple "compose with this text" link
  const openXComposer = () => {
    const url = `https://x.com/intent/post?text=${encodeURIComponent(draft)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 transition hover:text-brand-800"
      >
        <Sparkles className="h-4 w-4" />
        Draft my post with AI
      </button>
    );
  }

  const overXLimit = platform === "X" && draft.length > X_CHAR_LIMIT;

  return (
    <div className="animate-fade-in space-y-5 py-2">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-sm font-semibold text-ink-900">
          <span className="rounded-lg bg-brand-50 p-1.5 text-brand-600">
            <Sparkles className="h-4 w-4" />
          </span>
          Post assistant
        </p>
        <button
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          aria-label="Close post assistant"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-ink-500">
        Drafts are written from this campaign&apos;s brief: its description, content details,
        audience, languages and reference material.
      </p>

      {/* 1. Where and how to post */}
      <div className="grid gap-4 sm:grid-cols-2">
        {platforms.length > 0 && (
          <Field label="Platform">
            <Select value={platform} onChange={(e) => setPlatform(e.target.value)}>
              {platforms.map((p) => (
                <option key={p}>{p}</option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Language">
          <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {languages.map((l) => (
              <option key={l}>{l}</option>
            ))}
          </Select>
        </Field>
      </div>

      <Field
        label="Your angle (optional)"
        hint="e.g. how you use the product, or who you're sharing it with."
      >
        <Textarea
          rows={2}
          maxLength={500}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a personal touch for the AI to work in…"
        />
      </Field>

      <Button
        variant="brand"
        size="sm"
        icon={suggestions.length ? RefreshCw : Sparkles}
        loading={loading}
        onClick={getSuggestions}
      >
        {loading ? "Reading the brief…" : suggestions.length ? "New drafts" : "Suggest posts"}
      </Button>

      {/* Which reference links the AI could read */}
      {references.length > 0 && (
        <ul className="space-y-1 text-xs">
          {references.map((ref) => (
            <li key={ref.url} className="flex items-center gap-1.5">
              {ref.read ? (
                <CircleCheck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
              ) : (
                <CircleAlert className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              )}
              <span className="text-ink-500">{ref.read ? "Read" : "Couldn't read"}</span>
              <a
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="truncate font-medium text-ink-700 hover:text-brand-700"
              >
                {ref.title || ref.url}
              </a>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      {/* 2. Drafts */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-400">
            Pick a draft to start from
          </p>
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => setDraft(suggestion)}
              className={cn(
                "block w-full whitespace-pre-line rounded-xl border bg-white p-3.5 text-left text-sm leading-relaxed text-ink-700 transition-all",
                draft === suggestion
                  ? "border-brand-500 ring-4 ring-brand-500/10"
                  : "border-ink-200 hover:border-brand-300 hover:shadow-soft"
              )}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* 3. Edit, then publish it yourself */}
      {(suggestions.length > 0 || draft) && (
        <div className="space-y-3">
          <Field
            label="Your post"
            hint={
              platform === "X"
                ? `${draft.length}/${X_CHAR_LIMIT} characters`
                : "Make it your own — personal posts perform best and are approved faster."
            }
            error={overXLimit ? `X posts must be ${X_CHAR_LIMIT} characters or fewer.` : undefined}
          >
            <Textarea
              rows={5}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Edit the draft in your own words…"
            />
          </Field>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" icon={copied ? Check : Copy} disabled={!draft.trim()} onClick={copyDraft}>
              {copied ? "Copied" : "Copy post"}
            </Button>
            {platform === "X" && (
              <Button
                size="sm"
                variant="secondary"
                icon={Send}
                disabled={!draft.trim() || overXLimit}
                onClick={openXComposer}
              >
                Open in X
              </Button>
            )}
            {task.banner_url && (
              <Button
                size="sm"
                variant="secondary"
                icon={Download}
                href={task.banner_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                Campaign banner
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
