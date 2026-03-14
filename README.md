# 🎓 OutPass Management System v2

Digital outpass management for college hostellers — powered by **Next.js 14** + **Supabase** (PostgreSQL). Free-tier deployable on Vercel + Supabase.

---

## ✨ What's New in v2

- **Supabase** replaces Firebase — real PostgreSQL, realtime, Row Level Security
- **CSV Upload** — HOD uploads student & staff CSVs directly from the dashboard
- **Auto-unblacklist** — Warden sets 1–7 day bans that expire automatically
- **Supabase Auth** — Google OAuth + Email/Password for all staff
- **Staff email invites** — uploaded staff automatically receive email invites
- **Realtime** — outpass status and announcements update live

---

## 🚀 Complete Setup Guide

### Step 1 — Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) → **New project**
2. Name it `outpass-mgmt`, pick a region → **Create project** (~2 min)

### Step 2 — Run the Database Schema

1. Supabase dashboard → **SQL Editor** → **New query**
2. Paste the entire contents of `supabase-schema.sql`
3. Click **Run** — this creates all tables, indexes, triggers, RLS policies, realtime

### Step 3 — Enable Google OAuth

1. Supabase → **Authentication** → **Providers** → **Google** → Enable
2. Go to [Google Cloud Console](https://console.cloud.google.com):
   - APIs & Services → Credentials → Create OAuth 2.0 Client ID
   - Authorized redirect URI: `https://YOUR_PROJECT.supabase.co/auth/v1/callback`
3. Paste Client ID + Secret into Supabase → Save

### Step 4 — Enable Email Auth

1. Supabase → Authentication → Providers → **Email** → Enable

### Step 5 — Get API Keys

Supabase → **Project Settings** → **API**:

| Key | Env Variable |
|-----|-------------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| `service_role` key | `SUPABASE_SERVICE_ROLE_KEY` |

### Step 6 — Configure the App

```bash
git clone <your-repo>
cd outpass-system
npm install
cp .env.local.example .env.local
# Fill in the 3 Supabase keys
```

### Step 7 — Bootstrap the First Warden Account

1. Supabase → Authentication → Users → **Add user**
2. Enter the Warden's email + a temporary password
3. Log in to the app → the Warden can then:
   - Add gatekeepers from the Gatekeepers page
   - Create the first announcement

### Step 8 — HOD Uploads All Data via CSV

1. Create HOD auth account the same way (Supabase → Add user)
2. Log in as HOD → **Upload CSV** in the sidebar
3. Download the template → fill with your college data → upload
4. Staff members receive automatic email invites to set their passwords

### Step 9 — Schedule Auto-Blacklist Expiry (Recommended)

In Supabase SQL Editor:

```sql
create extension if not exists pg_cron;

select cron.schedule(
  'expire-blacklists',
  '*/15 * * * *',
  $$ select public.expire_blacklists(); $$
);
```

Without pg_cron, expiry still runs client-side on each page load.

### Step 10 — Deploy to Vercel

```bash
npm install -g vercel
vercel
```

In Vercel dashboard → Settings → Environment Variables → add all 3 keys.

```bash
vercel --prod
```

In Supabase → Authentication → URL Configuration:
- **Site URL**: `https://your-app.vercel.app`
- **Redirect URLs**: `https://your-app.vercel.app/auth/callback`

---

## 📋 CSV Format

### students_template.csv
```
name, email, register_no, department, section, year, semester, room_no, category
```
Only rows with `category=H` (Hostellers) are imported. Day scholars are skipped.

### staff_template.csv
```
name, email, designation, department, section
```
`designation` must be exactly: `Advisor`, `HOD`, or `Warden`

Sample templates are in the `csv-templates/` folder.

---

## 🔑 Login Reference

| Role | Method |
|------|--------|
| Student | Google Sign-In (email must exist in students table, category=H) |
| Advisor / HOD / Warden | Google Sign-In OR Email + Password |
| Gatekeeper | Phone number + Password (added by Warden in app) |

---

## ⏱ Blacklist Rules

- Duration: **1 to 7 days** (slider in warden UI — hard-capped at 7)
- Auto-expires: client-side on page load + optional pg_cron every 15 min
- Warden can remove manually at any time
- Blacklisted students cannot submit outpass applications

---

## 📁 Key Files

```
supabase-schema.sql          ← Run in Supabase SQL Editor first
csv-templates/
  students_template.csv      ← Fill with your student data
  staff_template.csv         ← Fill with your staff data
src/
  app/api/upload-csv/        ← Bulk upsert API (uses service_role key)
  app/staff/hod/upload/      ← HOD CSV upload UI
  app/staff/warden/blacklist/ ← 1-week max blacklist page
  lib/supabase.ts            ← Browser Supabase client
  lib/supabase-admin.ts      ← Server Supabase admin client
  lib/db.ts                  ← All database queries
  hooks/useAuth.tsx          ← Auth context (Google + Email + Gatekeeper)
```

---

## 🛠 Tech Stack

| | |
|-|-|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Database | Supabase (PostgreSQL + Realtime) |
| Auth | Supabase Auth (Google OAuth + Email/Password) |
| CSV Parsing | Papa Parse |
| QR Codes | qrcode |
| Deployment | Vercel + Supabase (both free tier) |
