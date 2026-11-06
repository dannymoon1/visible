import { Check } from "lucide-react";
import CreatorAvatar from "@/components/site/CreatorAvatar";
import { GatheringRing } from "@/components/app/GatheringRing";
import { BUSINESS, POSTS, SPOTS, type SpotState } from "@/lib/demo/adiaha";
import { cn } from "@/lib/cn";

// Creators: "Who joined?" The ring, then each spot in words.
const STATE: Record<SpotState, { label: string; tone: string }> = {
  verified: { label: "Posted, views verified", tone: "text-verified" },
  posted: { label: "Posted, checking views", tone: "text-warning" },
  joined: { label: "Joined, posting soon", tone: "text-muted" },
  open: { label: "Open spot", tone: "text-muted" },
};

const NAMES: Record<string, string> = {
  salon: "@braidsbyjoy",
  tailor: "@stitchedbyidara",
  suya: "@uyonights",
};

export default function CampaignCreators() {
  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_1fr] lg:items-start">
      <div className="rounded-[1.75rem] bg-surface p-6 ring-1 ring-line">
        <GatheringRing
          spots={SPOTS}
          className="mx-auto w-full max-w-[19rem]"
          centre={<span className="font-heading text-3xl font-semibold">{BUSINESS.initial}</span>}
        />
        <p className="mt-5 text-center text-muted">
          8 of 8 spots filled. Every creator was verified before they joined.
        </p>
      </div>

      <section>
        <h2 className="mb-2.5 px-1 font-heading text-lg font-semibold">Your creators</h2>
        <ul className="divide-y divide-line overflow-hidden rounded-[1.25rem] bg-surface ring-1 ring-line">
          {SPOTS.map((s) => {
            const post = POSTS.find((p) => p.creator.avatar === s.avatar);
            const handle = post ? (post.platform === "Facebook" ? post.creator.handle : `@${post.creator.handle}`) : NAMES[s.avatar];
            return (
              <li key={s.avatar} className="flex items-center gap-3.5 px-4 py-3">
                <span className="relative">
                  <CreatorAvatar who={s.avatar} large className={cn("h-11 w-11", s.state === "joined" && "opacity-60")} />
                  <span className="absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-verified text-white ring-2 ring-surface">
                    <Check className="h-2.5 w-2.5" strokeWidth={4} aria-hidden="true" />
                  </span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{handle}</span>
                  <span className={cn("block text-sm", STATE[s.state].tone)}>{STATE[s.state].label}</span>
                </span>
                {post && <span className="text-sm text-muted">{post.platform}</span>}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 px-1 text-sm text-muted">
          3 standby creators are ready. If someone doesn&apos;t post, or their views fail our checks, a standby takes the spot.
        </p>
      </section>
    </div>
  );
}
