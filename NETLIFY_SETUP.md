# 🚀 Quick Netlify Deployment Guide

## Why AI Analysis Doesn't Work on Netlify

**The Problem**: Your `.env` file is NOT deployed to Netlify. It's a local file only.

**The Solution**: Add environment variables manually in Netlify dashboard.

---

## ⚡ Quick Fix (5 Minutes)

### Step 1: Go to Netlify
1. Open [app.netlify.com](https://app.netlify.com)
2. Select your NutriGenius site
3. Click **Site settings** (top menu)

### Step 2: Add Environment Variables
1. Scroll down to **Environment variables** section
2. Click **Add a variable**
3. Add this variable:

```
Key: VITE_GEMINI_API_KEY
Value: YOUR_NEW_API_KEY_HERE
```

4. Click **Save**

### Step 3: Redeploy
1. Go to **Deploys** tab (top menu)
2. Click **Trigger deploy** button
3. Select **Clear cache and deploy site**
4. Wait 2-3 minutes for deployment

### Step 4: Test
1. Visit your live site: https://geniusnutri.netlify.app
2. Login/Sign up
3. Generate a meal plan
4. Click **Analyze Nutrition** button
5. ✅ You should now see the AI score!

---

## 🔐 Optional: Add Other Environment Variables

If you want payment and contact features to work, also add:

```
VITE_CHAPA_SECRET_KEY=CHASECK_TEST-P89FWtVvGhEmpWVMKD1jIfUvAz9R5bSP
VITE_EMAILJS_SERVICE_ID=service_osqwvc5
VITE_EMAILJS_TEMPLATE_ID=template_zan7495
VITE_EMAILJS_PUBLIC_KEY=dELHtPLlvpT3gqHG4
```

**Important**: After adding ANY environment variable, you MUST redeploy (Step 3).

---

## 🔍 Troubleshooting

### "API Key missing" error still appears

**Check:**
1. Did you click "Save" after adding the variable?
2. Did you trigger a new deployment after saving?
3. Is the variable name exactly `VITE_GEMINI_API_KEY` (case-sensitive)?
4. Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### AI Analysis button doesn't respond

**Check:**
1. Open browser console (F12)
2. Look for error messages
3. Verify your API key is valid at [Google AI Studio](https://aistudio.google.com/app/apikey)

---

## 📝 Why This Happened

- `.env` files contain sensitive API keys
- They should NEVER be committed to Git (security risk)
- Netlify can't access your local `.env` file
- You must manually configure environment variables in Netlify's dashboard
- This is the standard practice for ALL production deployments

---

## ✅ What We Fixed

1. ✅ Added `.env` to `.gitignore` (prevents API key exposure in Git)
2. ✅ Updated README with full deployment instructions
3. ✅ Created this quick reference guide

**Next step**: Follow Step 1-4 above to configure Netlify!
