WildFrame watermark / Admin setup

1. Copy .env.example to .env.local (or update your existing .env.local).
2. Set VITE_ADMIN_EMAIL to the exact email address used for the Admin login.
3. Keep the existing Supabase URL and anon key settings in .env.local.
4. In Vercel Project Settings > Environment Variables, add VITE_ADMIN_EMAIL with the same Admin login email, then redeploy.
5. Restart local Vite after changing .env.local.

Only the configured Admin email downloads the untouched original. All other users, including signed-in visitors, receive the watermarked download. The gallery/Supabase original is not modified.
