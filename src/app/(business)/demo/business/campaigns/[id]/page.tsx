import { PostCard } from "@/components/app/parts";
import { POSTS } from "@/lib/demo/adiaha";

// Posts: "Who posted?" Every post, its numbers and where it stands.
export default function CampaignPosts() {
  const verified = POSTS.filter((p) => p.status === "verified").length;
  return (
    <div>
      <p className="text-muted">
        {POSTS.length} posts so far. {verified} verified, the rest are being checked or were removed.
      </p>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {POSTS.map((p) => (
          <PostCard key={p.id} post={p} />
        ))}
      </div>
    </div>
  );
}
