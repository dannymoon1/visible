import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Server-only client with the service role key: bypasses row-level security.
// Never import this from a client component.
export const supabaseAdmin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
