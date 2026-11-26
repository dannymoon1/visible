"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
import { Building2, Lock, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/cn";
import Modal from "@/components/ui/Modal";
import SelectMenu from "@/components/ui/SelectMenu";
import { CHANNEL_OPTIONS, MessageBubble, Segmented, pillButton, type LinkRow } from "@/components/admin/LinkParts";
import {
  AUDIENCES,
  MESSAGE_MAX,
  SLUG_MAX,
  displayUrl,
  isValidSlug,
  linkUrl,
  makeCode,
  toSlug,
  type Audience,
  type Channel,
} from "@/lib/trackingLinks";

// Create a tracking link, or edit one. The ending and who it's for are fixed
// once a link exists (it's already out in chats and on paper).

const ENDING_OPTIONS = [
  { key: "code", label: "Short code" },
  { key: "word", label: "Custom word" },
] as const;

const AUDIENCE_CARDS: { key: Audience; title: string; body: string; icon: typeof Sparkles }[] = [
  { key: "creators", title: "Creators", body: "Opens the sign-up page", icon: Sparkles },
  { key: "businesses", title: "Businesses", body: "Opens the homepage", icon: Building2 },
];

function FieldLabel({ htmlFor, children, aside }: { htmlFor?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <label htmlFor={htmlFor} className="text-[0.92rem] font-medium">
        {children}
      </label>
      {aside && <span className="text-sm text-muted">{aside}</span>}
    </div>
  );
}

const inputClass =
  "h-12 w-full rounded-2xl bg-page px-4 text-[0.98rem] text-ink ring-1 ring-transparent transition-[box-shadow,background-color] placeholder:text-muted/70 hover:ring-line focus:bg-surface focus:ring-2 focus:ring-ink focus:outline-none";

export default function LinkFormDialog({
  open,
  onClose,
  onSaved,
  link,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (link: LinkRow, created: boolean) => void;
  // Editing when given; creating otherwise
  link?: LinkRow | null;
}) {
  const editing = Boolean(link);
  const [label, setLabel] = useState(link?.label ?? "");
  const [audience, setAudience] = useState<Audience>((link?.audience as Audience) ?? "creators");
  const [channel, setChannel] = useState<Channel>((link?.channel as Channel) ?? "whatsapp");
  const [ending, setEnding] = useState<"code" | "word">("code");
  const [code, setCode] = useState(makeCode);
  const [word, setWord] = useState("");
  const [message, setMessage] = useState<string>(link?.message ?? AUDIENCES.creators.message);
  const [messageEdited, setMessageEdited] = useState(editing);
  const [saving, setSaving] = useState(false);

  const slug = link?.slug ?? (ending === "code" ? code : word);
  const wordError = !editing && ending === "word" && word.length > 0 && !isValidSlug(word);

  const changeAudience = (next: Audience) => {
    setAudience(next);
    if (!messageEdited) setMessage(AUDIENCES[next].message);
  };

  const reset = () => {
    setLabel("");
    setWord("");
    setCode(makeCode());
    setEnding("code");
    setMessage(AUDIENCES[audience].message);
    setMessageEdited(false);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!label.trim()) {
      toast.error("Name the link after the place you'll post it.");
      return;
    }

    setSaving(true);
    if (link) {
      const { data, error } = await supabase
        .from("tracking_links")
        .update({ label: label.trim(), channel, message: message.trim() })
        .eq("id", link.id)
        .select()
        .single();
      setSaving(false);
      if (error || !data) {
        toast.error(error?.message ?? "Couldn't save the link.");
        return;
      }
      onSaved(data, false);
      return;
    }

    if (!isValidSlug(slug)) {
      setSaving(false);
      toast.error(ending === "word" ? "Use 3 to 20 letters, numbers or hyphens." : "Make a new code.");
      return;
    }

    let attempt = slug;
    // A short code can clash with one already made: try fresh codes
    for (let tries = 0; tries < 4; tries++) {
      const { data, error } = await supabase
        .from("tracking_links")
        .insert({ slug: attempt, label: label.trim(), audience, channel, message: message.trim() })
        .select()
        .single();
      if (!error && data) {
        setSaving(false);
        reset();
        onSaved(data, true);
        return;
      }
      if (error?.code === "23505" && ending === "code") {
        attempt = makeCode();
        continue;
      }
      setSaving(false);
      toast.error(error?.code === "23505" ? `"${attempt}" is taken. Try another word.` : error?.message ?? "Couldn't create the link.");
      return;
    }
    setSaving(false);
    toast.error("Couldn't find a free code. Try again.");
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? "Edit link" : "New link"}
      description={editing ? "The link itself stays the same, so nothing already shared breaks." : "Make one for each group, page, flyer or agent, so you can compare them."}
      footer={
        <div className="flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className={pillButton("ghost")}>
            Cancel
          </button>
          <button type="submit" form="link-form" disabled={saving || wordError} className={pillButton(editing ? "ink" : "signal")}>
            {saving ? (editing ? "Saving…" : "Creating…") : editing ? "Save changes" : "Create link"}
          </button>
        </div>
      }
    >
      <form id="link-form" onSubmit={submit} className="space-y-6">
        <div>
          <FieldLabel htmlFor="link-label" aside="Only admins see this">
            Name
          </FieldLabel>
          <input
            id="link-label"
            value={label}
            maxLength={80}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="UNIUYO Alumni WhatsApp group"
            className={inputClass}
            autoComplete="off"
          />
        </div>

        <fieldset>
          <legend className="mb-2 text-[0.92rem] font-medium">Who it&apos;s for</legend>
          {editing ? (
            <p className="flex items-center gap-2 rounded-2xl bg-page px-4 py-3 text-muted">
              <Lock className="h-4 w-4" aria-hidden="true" />
              {AUDIENCES[audience].label}. {AUDIENCES[audience].destination === "/register" ? "Opens the sign-up page." : "Opens the homepage."}
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Who it's for">
              {AUDIENCE_CARDS.map(({ key, title, body, icon: Icon }) => {
                const on = audience === key;
                return (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => changeAudience(key)}
                    className={cn(
                      "press flex flex-col items-start gap-3 rounded-2xl p-4 text-left ring-1 transition-[box-shadow,background-color] focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none",
                      on ? "bg-surface ring-2 ring-ink" : "bg-page ring-transparent hover:ring-line"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-xl transition-colors",
                        on ? "bg-ink text-white" : "bg-surface text-muted ring-1 ring-line"
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block font-semibold">{title}</span>
                      <span className="block text-sm text-muted">{body}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </fieldset>

        <div>
          <FieldLabel htmlFor="link-channel">Where it&apos;s posted</FieldLabel>
          <SelectMenu id="link-channel" label="Where it's posted" value={channel} options={CHANNEL_OPTIONS} onChange={setChannel} />
        </div>

        <div>
          <FieldLabel aside={editing ? "Can't change" : undefined}>Link</FieldLabel>
          {!editing && (
            <Segmented value={ending} options={ENDING_OPTIONS} onChange={setEnding} label="Link ending" className="mb-3" />
          )}
          <div
            className={cn(
              "flex items-center gap-1 rounded-2xl bg-page py-1.5 pr-1.5 pl-4 ring-1 transition-[box-shadow]",
              wordError ? "ring-2 ring-error" : "ring-transparent",
              ending === "word" && !editing && "focus-within:bg-surface focus-within:ring-2 focus-within:ring-ink"
            )}
          >
            <span className="shrink-0 font-mono text-[0.95rem] text-muted">{displayUrl("").replace(/\/$/, "")}/</span>
            {editing ? (
              <span className="flex h-9 flex-1 items-center font-mono text-[0.95rem]">{slug}</span>
            ) : ending === "code" ? (
              <>
                <span className="flex h-9 flex-1 items-center font-mono text-[0.95rem] tracking-wide">{code}</span>
                <button
                  type="button"
                  onClick={() => setCode(makeCode())}
                  className="press flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium text-muted hover:bg-surface hover:text-ink"
                >
                  <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                  New code
                </button>
              </>
            ) : (
              <input
                value={word}
                maxLength={SLUG_MAX}
                onChange={(e) => setWord(toSlug(e.target.value))}
                placeholder="uniuyo"
                aria-label="Custom word"
                aria-invalid={wordError}
                className="h-9 min-w-0 flex-1 bg-transparent font-mono text-[0.95rem] outline-none placeholder:text-muted/60"
              />
            )}
          </div>
          {!editing && (
            <p className={cn("mt-2 text-sm", wordError ? "text-error" : "text-muted")}>
              {wordError
                ? "Use 3 to 20 letters, numbers or single hyphens."
                : ending === "code"
                  ? "Short and neutral: nobody in the group sees how you've labelled it."
                  : "Easy to type from a flyer or poster."}
            </p>
          )}
        </div>

        <div>
          <FieldLabel htmlFor="link-message" aside={`${message.length}/${MESSAGE_MAX}`}>
            Message sent with the link
          </FieldLabel>
          <textarea
            id="link-message"
            rows={4}
            maxLength={MESSAGE_MAX}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              setMessageEdited(true);
            }}
            className={cn(inputClass, "h-auto resize-none py-3 leading-relaxed")}
          />
          <p className="mt-4 mb-2 text-sm text-muted">How it looks when shared</p>
          <MessageBubble message={message} url={linkUrl(slug || "·····")} />
        </div>
      </form>
    </Modal>
  );
}
