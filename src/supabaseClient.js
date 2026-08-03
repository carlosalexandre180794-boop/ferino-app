import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  "https://hmqmkhjxrshlupdsqxrf.supabase.co";

const supabaseAnonKey =
  "sb_publishable_QARXyovV-IzGX9-6Mm7rTw_eRjLG8Pj";

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "implicit",
    },
  }
);