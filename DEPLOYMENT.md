# Deployment Guide for NutriVision AI

## 🚀 Recommended: Vercel (Best for Mobile PWA)

### Why Vercel?
- ✅ **Free tier** with HTTPS (required for camera API)
- ✅ **Zero configuration** - auto-detects Vite
- ✅ **Fast global CDN**
- ✅ **Automatic deployments** from GitHub
- ✅ **Perfect for PWAs**

### Quick Deploy Steps:

1. **Push your code to GitHub** (if not already):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Sign up/login with GitHub
   - Click "New Project"
   - Import your repository
   - Vercel auto-detects Vite - just click "Deploy"!
   - Done! Your app will be live in ~30 seconds

3. **Your app will be available at**: `https://your-project-name.vercel.app`

---

## 🌐 Alternative Options

### Option 2: Netlify (Also Excellent)

**Setup:**
1. Go to [netlify.com](https://netlify.com)
2. Sign up/login with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repo
5. Build settings (auto-detected):
   - Build command: `npm run build`
   - Publish directory: `dist`
6. Click "Deploy site"

**Pros:** Similar to Vercel, great free tier, excellent PWA support

---

### Option 3: Cloudflare Pages

**Setup:**
1. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
2. Connect GitHub account
3. Select repository
4. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
5. Deploy!

**Pros:** Extremely fast, generous free tier, great global performance

---

### Option 4: Firebase Hosting

**Setup:**
```bash
npm install -g firebase-tools
firebase login
firebase init hosting
# Select: Use existing project or create new
# Public directory: dist
# Single-page app: Yes
# GitHub auto-deploy: Yes (optional)
npm run build
firebase deploy
```

**Pros:** Integrates with other Firebase services, good for future backend needs

---

## 📱 Important Notes for Mobile Deployment

### HTTPS is Required
- Camera API only works over HTTPS
- All recommended platforms provide HTTPS automatically ✅

### PWA Installation
After deployment, users can:
1. Visit your site on mobile
2. Tap "Share" → "Add to Home Screen"
3. App will work like a native app!

### Environment Variables

#### Setting Up Environment Variables

**Important:** The app supports API keys in two ways:
1. **User-entered** (via Settings UI) - stored in browser localStorage
2. **Environment variable** (for default/pre-filled key) - set during deployment

#### For Local Development:

1. Create a `.env.local` file in the project root:
   ```bash
   # .env.local
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

2. Get your API key from: https://aistudio.google.com/apikey

3. Restart the dev server: `npm run dev`

**Note:** Vite requires the `VITE_` prefix for client-side environment variables.

#### For Vercel Deployment:

1. Go to your project on [vercel.com](https://vercel.com)
2. Click **Settings** → **Environment Variables**
3. Add environment variables (you can use one or both):
   - **Name:** `VITE_GEMINI_API_KEY`
     - **Value:** Your Gemini API key
     - **Environment:** Production, Preview, Development (select all)
   - **Name:** `VITE_OPENAI_API_KEY` (optional)
     - **Value:** Your OpenAI API key
     - **Environment:** Production, Preview, Development (select all)
4. Click **Save**
5. Redeploy your app (or it will auto-deploy on next push)

**Note:** Users can also set their API keys in the app's Settings UI, or you can set a default provider via environment variables.

#### For Netlify Deployment:

1. Go to your site on [netlify.com](https://netlify.com)
2. Click **Site Settings** → **Environment Variables**
3. Click **Add a variable**:
   - **Key:** `VITE_GEMINI_API_KEY`
   - **Value:** Your Gemini API key
   - **Scopes:** All scopes (or specific ones)
4. Click **Save**
5. Trigger a new deploy

#### For Cloudflare Pages:

1. Go to your project on [pages.cloudflare.com](https://pages.cloudflare.com)
2. Click **Settings** → **Environment Variables**
3. Add variable:
   - **Variable name:** `VITE_GEMINI_API_KEY`
   - **Value:** Your Gemini API key
4. Save and redeploy

#### Security Notes:

- ✅ Environment variables with `VITE_` prefix are exposed to the client (this is expected for API keys used in the browser)
- ✅ Users can still override by entering their own key in Settings
- ✅ Never commit `.env.local` to git (already in `.gitignore`)
- ✅ The app works without env vars - users can enter their key in the Settings UI

---

## 🔧 Pre-Deployment Checklist

- [ ] Test build locally: `npm run build && npm run preview`
- [ ] Update manifest.json icons (replace placeholder URLs)
- [ ] Test on mobile device
- [ ] Verify camera access works
- [ ] Check all routes work correctly

---

## 🎯 Recommendation

**Start with Vercel** - it's the easiest and most reliable for React/Vite PWAs. You can always migrate later if needed!

