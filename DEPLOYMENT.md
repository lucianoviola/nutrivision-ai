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
If you need to hide your Gemini API key:
- **Vercel**: Project Settings → Environment Variables
- **Netlify**: Site Settings → Environment Variables
- Access in code: `import.meta.env.VITE_GEMINI_API_KEY`

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

