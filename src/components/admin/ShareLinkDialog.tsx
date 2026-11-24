"use client";

import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import {
  Check,
  Copy,
  Facebook,
  Linkedin,
  Mail,
  MessageCircle,
  MessageSquareText,
  Send,
  Share2,
  Twitter,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import Modal from "@/components/ui/Modal";
import { MessageBubble, pillButton } from "@/components/admin/LinkParts";
import { SHARE_TARGETS, shareText, type ShareTarget } from "@/lib/trackingLinks";

// Share a tracking link with its message: the phone's own share menu where it
// exists, a tile per platform, and copy for Instagram and TikTok (they have no
// share address a website can open).

const TARGET_ICONS: Record<string, LucideIcon> = {
  whatsapp: MessageCircle,
  telegram: Send,
  x: Twitter,
  facebook: Facebook,
  linkedin: Linkedin,
  email: Mail,
  sms: MessageSquareText,
};

const noSubscribe = () => () => {};

export async function copyText(text: string, done = "Copied") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
    return true;
  } catch {
    toast.error("Couldn't copy. Select the text and copy it by hand.");
    return false;
  }
}

// A copy action that turns into a tick for a moment, so you know it worked
function useCopied() {
  const [copied, setCopied] = useState(false);
  const run = async (text: string, done: string) => {
    if (await copyText(text, done)) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    }
  };
  return [copied, run] as const;
}

function CopyIcon({ copied }: { copied: boolean }) {
  return (
    <span className="relative h-4 w-4" aria-hidden="true">
      <Copy className={cn("absolute inset-0 h-4 w-4 transition-[opacity,scale] duration-200", copied ? "scale-75 opacity-0" : "opacity-100")} />
      <Check
        className={cn("absolute inset-0 h-4 w-4 text-verified transition-[opacity,scale] duration-200", copied ? "opacity-100" : "scale-75 opacity-0")}
        strokeWidth={2.75}
      />
    </span>
  );
}

export function CopyLinkButton({ url, className }: { url: string; className?: string }) {
  const [copied, run] = useCopied();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        run(url, "Link copied");
      }}
      className={cn(
        "press flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted ring-1 ring-line hover:bg-page hover:text-ink",
        className
      )}
      aria-label="Copy link"
      title="Copy link"
    >
      <CopyIcon copied={copied} />
    </button>
  );
}

export default function ShareLinkDialog({
  open,
  onClose,
  url,
  message,
  label,
}: {
  open: boolean;
  onClose: () => void;
  url: string;
  message: string;
  label: string;
}) {
  const canNativeShare = useSyncExternalStore(noSubscribe, () => typeof navigator.share === "function", () => false);
  const [copiedAll, copyAll] = useCopied();
  const [copiedLink, copyLink] = useCopied();
  const text = shareText(message, url);

  const nativeShare = async () => {
    try {
      await navigator.share({ text });
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      toast.error("Sharing didn't open. Pick an app below instead.");
    }
  };

  const openTarget = async (target: ShareTarget) => {
    if (target.copyMessage && message.trim()) {
      await copyText(message.trim(), `Message copied. Paste it into your ${target.label} post.`);
    }
    window.open(target.href(message.trim(), url), "_blank", "noopener,noreferrer");
  };

  return (
    <Modal open={open} onClose={onClose} title="Share link" description={label}>
      <div className="space-y-5">
        <MessageBubble message={message} url={url} />

        {canNativeShare && (
          <button type="button" onClick={nativeShare} className={pillButton("ink", "w-full")}>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share to any app
          </button>
        )}

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {SHARE_TARGETS.map((target) => {
            const Icon = TARGET_ICONS[target.key] ?? Share2;
            return (
              <button
                key={target.key}
                type="button"
                onClick={() => openTarget(target)}
                className="press group flex flex-col items-center gap-1.5 rounded-2xl py-2 text-xs font-medium text-muted hover:text-ink focus-visible:ring-2 focus-visible:ring-ink focus-visible:outline-none"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-page text-ink ring-1 ring-line transition-colors group-hover:bg-surface">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                {target.label}
              </button>
            );
          })}
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => copyAll(text, "Message and link copied")} className={pillButton("quiet")}>
            <CopyIcon copied={copiedAll} />
            Copy message and link
          </button>
          <button type="button" onClick={() => copyLink(url, "Link copied")} className={pillButton("quiet")}>
            <CopyIcon copied={copiedLink} />
            Copy link only
          </button>
        </div>

        <p className="text-sm text-pretty text-muted">
          For Instagram and TikTok, copy the message and link, then paste it into a caption, a DM or your bio. Facebook and LinkedIn
          only take the link, so the message is copied for you to paste.
        </p>
      </div>
    </Modal>
  );
}
