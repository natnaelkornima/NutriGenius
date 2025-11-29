# 📍 How to Find Site Settings in Netlify

## Visual Guide

![Netlify Navigation Guide](C:/Users/hp/.gemini/antigravity/brain/ea5fa316-c9d6-44cd-aec3-45efdecf8daa/netlify_navigation_guide_1764423805033.png)

## Step-by-Step Instructions

### Step 1: Open Netlify Dashboard
1. Go to **https://app.netlify.com**
2. Log in to your account (if not already logged in)

### Step 2: Select Your Site
- You'll see a list of all your sites
- **Click on "geniusnutri"** (or your site name)
- This opens your site's dashboard

### Step 3: Navigate to Site Settings
Look at the **TOP navigation bar** on your site's page

You'll see tabs like:
```
Overview | Deploys | Plugins | Functions | Integrations | Site settings
```

- **Click "Site settings"** (it's on the far right of this navigation bar)

### Step 4: Find Environment Variables
- On the Site settings page, look at the **LEFT sidebar**
- Scroll down to find **"Environment variables"**
- **Click on "Environment variables"**

### Step 5: Add Your Variable
1. Click **"Add a variable"** button (or **"Add an environment variable"**)
2. In the **Key** field, type: `VITE_GEMINI_API_KEY`
3. In the **Value** field, paste your API key: `YOUR_NEW_API_KEY_HERE`
4. Click **"Save"** or **"Create variable"**

---

## Quick Checklist

- [ ] 1. Go to app.netlify.com
- [ ] 2. Click your "geniusnutri" site
- [ ] 3. Click "Site settings" tab (top navigation bar, right side)
- [ ] 4. Click "Environment variables" (left sidebar)
- [ ] 5. Add `VITE_GEMINI_API_KEY` variable
- [ ] 6. Go to "Deploys" tab
- [ ] 7. Click "Trigger deploy" → "Clear cache and deploy site"
- [ ] 8. Wait 2-3 minutes
- [ ] 9. Test on your live site!

---

## Still Can't Find It?

### Alternative Navigation Path:

If you're on your site's overview page, you can also:

1. Look for a **gear icon ⚙️** in the top navigation
2. Or look for **"Settings"** or **"Site configuration"** in the menu
3. Different Netlify UI versions may have slight variations

### The key is:
- **"Site settings"** is in the **TOP horizontal navigation** when you're viewing a specific site
- It's NOT in the main Netlify account settings
- You must first select your site, THEN you'll see "Site settings"

---

## Screenshot of What You're Looking For

The top navigation bar looks like this:

```
┌─────────────────────────────────────────────────────────────┐
│  [Logo] geniusnutri                                         │
├─────────────────────────────────────────────────────────────┤
│  [Overview] [Deploys] [Plugins] [Functions] ... [Site settings] ← HERE!
└─────────────────────────────────────────────────────────────┘
```

Once you click "Site settings", the left sidebar will show:

```
Site settings
  ├─ General
  ├─ Build & deploy
  ├─ Domain management
  ├─ Environment variables  ← THEN CLICK HERE!
  ├─ Identity
  └─ ... more options
```

---

## Need More Help?

If you're still stuck, you can:
1. Take a screenshot of what you see on your screen
2. Share it with me
3. I'll guide you from there!
