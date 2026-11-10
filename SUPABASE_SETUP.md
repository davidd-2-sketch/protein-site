# Turning on accounts (Supabase)

Accounts are optional for students. Until you do these steps, the site works normally and
saves progress on each device only. About 10 minutes.

## 1. Create a free Supabase project
1. Go to https://supabase.com and sign up (free plan).
2. Click **New project**. Give it a name (e.g. `protein-site`), choose a strong database
   password (save it in a password manager), and pick the region closest to you.
3. Wait a minute or two for it to finish setting up.

## 2. Create the progress table
1. In the left sidebar, open **SQL Editor** → **New query**.
2. Paste everything below, then click **Run**.

```sql
-- One row per student: their saved progress.
create table public.progress (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row-level security: every student can see and change ONLY their own row.
alter table public.progress enable row level security;

create policy "Read own progress" on public.progress
  for select using (auth.uid() = user_id);

create policy "Insert own progress" on public.progress
  for insert with check (auth.uid() = user_id);

create policy "Update own progress" on public.progress
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "Delete own progress" on public.progress
  for delete using (auth.uid() = user_id);
```

## 3. Tell Supabase where the site lives
1. Open **Authentication** → **URL Configuration**.
2. **Site URL:** `http://localhost:5173`
3. Under **Redirect URLs**, add `http://localhost:5173/progress`
4. (When the site goes live, add its real address here too.)

Email sign-in is on by default (**Authentication → Providers → Email**). Leave
"Confirm email" on, so new accounts must confirm their address.

## 4. Give the site its two keys
1. Open **Project Settings** → **API** (or click **Connect** at the top of the dashboard).
2. Copy the **Project URL** and the **anon / publishable** key. (Never use the
   `service_role` or secret key in the website. It bypasses the security rules.)
3. In the project folder (`~/Projects/protein-site`), create a file named `.env.local`:

```
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

4. Stop the dev server (Ctrl + C) and start it again with `npm run dev`.

`.env.local` is ignored by git, so the keys are never saved in the project's history.

## 5. Try it
Open http://localhost:5173/progress → **Account** → sign in with the email link or create
an account with a password. Finish a lesson step, then open the site in another browser
and sign in: your progress should appear there too.

## Before launching publicly
- Supabase's built-in email service only sends a few emails per hour. Set up a custom
  email provider (Authentication → Emails → SMTP settings) before real students sign up.
- Add the live site address to Site URL and Redirect URLs.
- Consider your audience's ages: services for children under 13 in the US have extra
  legal requirements (COPPA). Many sites require users to be 13 or older.
- To delete an account completely, use Authentication → Users in the dashboard.
  (Students can delete their synced progress themselves from the Account section.)
