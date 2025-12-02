<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1lVT7EmWA8m34qmcKvxt7A-LTW1HLLQYH

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up environment variables (optional, for local development only):
   ```bash
   cp .env.example .env.local
   ```
   Then edit `.env.local` and add your keys:
   ```
   VITE_OPENAI_API_KEY=your_openai_key_here
   VITE_SITE_PASSWORD=your_password_here
   ```
   Get your API key from: https://platform.openai.com/api-keys
   
   **Note:** 
   - These env vars only work locally (not in production)
   - In production, users enter their own API key in Settings
   - This keeps your API key secure and private

3. Run the app:
   ```bash
   npm run dev
   ```

4. Open http://localhost:5173 in your browser

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions to Vercel, Netlify, Cloudflare Pages, or Firebase.
