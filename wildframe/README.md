# WildFrame — Nature Through My Lens

A responsive nature photography portfolio built with React, Vite, Supabase Auth, Supabase Database, and Supabase Storage.

## Features

- Public responsive photo gallery with full-screen preview and download links.
- Admin-only login (no public sign-up UI).
- Admin photo upload with caption, plus delete.
- Image files and captions persist in Supabase.
- Database Row Level Security (RLS) and separate Storage policies.
- Vercel-ready deployment.

## 1. Install prerequisites

Install Node.js LTS from https://nodejs.org/ and use VS Code. Restart VS Code after installing Node if the terminal cannot find `npm`.

## 2. Create the app locally

If you downloaded this ready-made project ZIP, extract it and open the `wildframe` folder in VS Code. In the VS Code terminal run:

```bash
npm install
```

If you are starting without this ZIP, you can instead create a Vite React app with:
```bash
npm create vite@latest wildframe -- --template react
cd wildframe
npm install
npm install @supabase/supabase-js lucide-react
```
Then replace the generated files with the matching files in this project.

## 3. Create Supabase project

1. Go to https://supabase.com/ and create a project.
2. In Project Settings / API (or the Connect panel), copy the Project URL and the **publishable** key. Do not use a secret/service-role key in browser code.
3. In Authentication > Users, create your own admin user using your email and a strong unique password. Do not enable public sign-ups.
4. Copy the admin user's UUID from the user details.
5. In Storage, create a bucket named exactly `wildframe-photos`. Set it to **Public** if the gallery should be viewable by everyone. This makes viewing/downloading photos public, not uploading/deleting.
6. Open SQL Editor. In `supabase/setup.sql`, replace EVERY occurrence of `ADMIN_USER_UUID` in the SQL file with your actual UUID (keep the single quotes), then run the SQL. Example format: `'12345678-abcd-1234-abcd-123456789012'::uuid`. Never use this example UUID as your real one.

## 4. Configure local environment

1. In the project root, copy `.env.example` to `.env.local`.
2. Edit `.env.local` and add your real Supabase Project URL and publishable key:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

No quotes are needed. Never put a Supabase secret/service-role key in a `VITE_` variable or commit `.env.local` to GitHub.

## 5. Run on your laptop

In VS Code terminal, run:

```bash
npm run dev
```

Open the local URL Vite prints (usually `http://localhost:5173`). The gallery is public; click **Admin**, then sign in with the admin user you created in Supabase. The upload panel appears after login.

If login works but upload is denied, double-check that the UUID in SQL is the same user you logged in as, and that the SQL policies ran successfully.

## 6. Publish online with Vercel

1. Create a private GitHub repository and upload the project files **except `.env.local` and `node_modules`**. Make sure `.gitignore` is present.
2. Go to https://vercel.com/ and import that repository.
3. In Vercel Project Settings > Environment Variables, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
4. Deploy. Vercel's build command should be `npm run build`, output directory `dist`.
5. In Supabase Authentication > URL Configuration, set Site URL to your deployed Vercel URL. Add the Vercel URL to Redirect URLs if you later enable email-link flows. Password login used by this starter does not require email-link redirects.
6. Open the live URL, test public gallery, sign in as admin, upload a test image, refresh the page, and confirm it remains visible.

## Security notes

- The public gallery and photo downloads are intentionally public. Do not upload images you want to keep private.
- Upload and delete are enforced by Supabase RLS policies, not just by hiding UI buttons.
- Keep the admin password private and unique; enable MFA in Supabase if available for your project.
- Never put service-role or secret keys in client-side code.
- The client checks a 8 MB limit and image MIME type for convenience; for a public production service, also consider stricter server-side image validation and abuse/rate controls.
- Supabase and Vercel have plan limits. Check their current pricing/storage/bandwidth limits before relying on them for large collections.


## Set the Instagram footer link

1. Open your Supabase project and go to **SQL Editor**.
2. Open `supabase/instagram-settings.sql` from this project.
3. Replace `ADMIN_USER_UUID` in that SQL file with your admin account's UUID from **Authentication → Users**. Use the same UUID configured for your existing photo-admin policies.
4. Run the SQL once.
5. Deploy the updated website. Sign in using **Admin** and enter your Instagram profile URL in the **Instagram profile link** panel under the gallery.

The Instagram URL is stored in Supabase, so visitors on other devices see the same link. The website name remains **WildFrame** and is not editable.


## Contact form automatic email delivery

The contact form submits messages to `openai3255@gmail.com` through FormSubmit AJAX, so visitors do not need to open their own email app. On first use, FormSubmit may send an activation/verification email to the recipient inbox; open that email and confirm the address before expecting normal delivery. Check Spam/Junk if it does not appear. This is a third-party service, not Supabase. Test with a non-sensitive message before publishing.

## Contact form email delivery
The Contact form uses EmailJS with the configured Service ID, Template ID, and Public Key in `src/App.jsx`. The template should use `{{name}}` and `{{message}}`; it may also use `{{email}}`, `{{from_email}}`, `{{from_name}}`, `{{reply_to}}`, `{{title}}`, and `{{time}}`. Keep the recipient set to `openai3255@gmail.com` in the EmailJS template. Do not place EmailJS private keys or other secrets in frontend code.
