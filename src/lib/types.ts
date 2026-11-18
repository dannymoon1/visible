// Short names for the database rows the app works with.
// The source of truth is database.types.ts, generated from the live schema.
import type { Database, Tables } from "@/lib/database.types";

export type { Database, Json } from "@/lib/database.types";

export type Profile = Tables<"profiles">;
export type Task = Tables<"tasks">;
export type Submission = Tables<"submissions">;
export type Withdrawal = Tables<"withdrawals">;

export type LeaderboardRow = Database["public"]["Functions"]["get_leaderboard"]["Returns"][number];
export type Participant = Tables<"campaign_participants">;
export type AppNotification = Tables<"notifications">;
