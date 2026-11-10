/*
  supabase.ts — the connection to Supabase, the free online service that stores accounts
  and synced progress.

  The two keys come from a file called .env.local (never committed to git; see
  SUPABASE_SETUP.md). If they're missing, accounts are simply switched off and the site
  works exactly as before, saving progress on the device only.

  The "anon" (public) key is safe to ship in a website: by itself it can't read anyone's
  data. Row-level security rules in the database (see SUPABASE_SETUP.md) make sure each
  signed-in student can read and write only their own progress row.
*/
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null when accounts aren't set up (no keys). Always check before using. */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true, // stay signed in between visits
          detectSessionInUrl: true, // finish sign-in when the student clicks the emailed link
        },
      })
    : null

export const accountsEnabled = supabase !== null
