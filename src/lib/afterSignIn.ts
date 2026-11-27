import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

// Where someone lands once signed in (sign-in, or a new password after a
// reset): creators who never finished onboarding go back to it; business
// owners chose "Start a campaign instead" there and aren't asked again;
// admins have no onboarding.
export async function landingPath(user: User): Promise<string> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, is_admin")
    .eq("id", user.id)
    .maybeSingle();
  const isBusiness = user.user_metadata?.account_type === "business";
  return !profile?.onboarded_at && !isBusiness && !profile?.is_admin ? "/welcome" : "/dashboard";
}
