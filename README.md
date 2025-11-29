# 🥗 NutriGenius AI

**Live Demo:** [https://geniusnutri.netlify.app/](https://geniusnutri.netlify.app/)

**NutriGenius** is an intelligent, AI-powered meal planning application designed to make healthy eating accessible and affordable for everyone. By leveraging the power of Google's Gemini AI, NutriGenius generates personalized meal plans that fit your budget, dietary preferences, and health goals.

![NutriGenius Banner](https://images.unsplash.com/photo-1490645935967-10de6ba17061?q=80&w=2053&auto=format&fit=crop&ixlib=rb-4.0.3)

## ✨ Key Features

-   **🤖 AI-Powered Meal Planning**: Generate weekly meal plans tailored to your specific calorie needs, budget, and taste.
-   **💰 Budget Optimization**: Input your weekly budget, and the AI ensures your plan stays within financial limits.
-   **📊 Daily Analysis**: Get detailed nutritional breakdowns and AI-generated insights for every daily plan.
-   **📝 Smart Notes**: Add, edit, and delete sticky notes for each day to keep track of recipes or shopping lists.
-   **🎨 Modern UI/UX**:
    -   **Dark Mode**: Fully supported system-wide dark mode.
    -   **Interactive Elements**: Floating food animations, sparkle effects, and smooth transitions.
    -   **Responsive Design**: Optimized for mobile, tablet, and desktop.
-   **🔐 Secure Authentication**:
    -   Email/Password Sign-up & Login.
    -   Google Sign-In integration.
-   **👤 Personalized Profile**: Set your weight, height, activity level, dietary restrictions (Vegan, Gluten-Free), and allergies.

## 🛠️ Tech Stack

-   **Frontend**: [React](https://react.dev/) (Vite)
-   **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **AI Engine**: [Google Gemini API](https://ai.google.dev/)
-   **Backend & Auth**: [Firebase](https://firebase.google.com/) (Firestore, Authentication)

## 🚀 Getting Started

Follow these steps to set up the project locally.

### Prerequisites

-   Node.js (v16 or higher)
-   npm or yarn

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/nutrigenius.git
    cd nutrigenius
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Environment Setup**
    
    Create a `.env` file in the root directory with the following variables:

    ```env
    # Required for AI meal analysis
    VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
    
    # Optional: Payment integration (Chapa)
    VITE_CHAPA_SECRET_KEY=your_chapa_secret_key
    
    # Optional: Contact form (EmailJS)
    VITE_EMAILJS_SERVICE_ID=your_service_id
    VITE_EMAILJS_TEMPLATE_ID=your_template_id
    VITE_EMAILJS_PUBLIC_KEY=your_public_key
    ```

    #### 🔑 Getting API Keys

    **Google Gemini API** (Required for AI features):
    1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
    2. Sign in with your Google account
    3. Click "Create API Key"
    4. Copy the key and paste it as `VITE_GEMINI_API_KEY`

    **Chapa Payment** (Optional):
    - Sign up at [Chapa](https://chapa.co/) to get your secret key
    - Use test key (`CHASECK_TEST-...`) for development

    **EmailJS** (Optional):
    - Create an account at [EmailJS](https://www.emailjs.com/)
    - Set up a service and template
    - Copy your service ID, template ID, and public key

    > **⚠️ Important**: Never commit the `.env` file to version control. It's already in `.gitignore` for your security.

4.  **Run the development server**
    ```bash
    npm run dev
    ```

5.  **Open in Browser**
    Navigate to `http://localhost:5173` to view the app.

## 📖 Usage Guide

1.  **Sign Up**: Create an account using email or Google.
2.  **Set Profile**: Enter your physical metrics, budget, and dietary preferences in the "Personalize Your Plan" section.
3.  **Generate Plan**: On the dashboard, click "Generate New Plan" to let the AI create a weekly schedule for you.
4.  **View Details**: Click on any day card to view the "Daily Overview", read AI analysis, and add notes.
5.  **Track Budget**: Monitor your weekly spending vs. budget in the dashboard header.

## 🚀 Deployment to Netlify

The app is production-ready and can be deployed to Netlify with a few simple steps.

### Prerequisites for Deployment

-   A [Netlify](https://www.netlify.com/) account (free tier works)
-   Your repository pushed to GitHub/GitLab/Bitbucket

### Step-by-Step Deployment

1.  **Connect Repository**
    -   Log in to [Netlify](https://app.netlify.com/)
    -   Click "Add new site" → "Import an existing project"
    -   Select your Git provider and authorize
    -   Choose your `nutrigenius` repository

2.  **Build Settings**
    -   **Build command**: `npm run build`
    -   **Publish directory**: `dist`
    -   Click "Deploy site"

3.  **Configure Environment Variables** ⚠️ **Critical Step**
    
    The AI analysis and other features will NOT work without these:
    
    -   Go to **Site settings** → **Environment variables**
    -   Click "Add a variable" and add each of the following:

    | Variable Name | Value | Required? |
    |--------------|-------|-----------|
    | `VITE_GEMINI_API_KEY` | Your Google Gemini API key | ✅ Yes |
    | `VITE_CHAPA_SECRET_KEY` | Your Chapa secret key | ❌ Optional |
    | `VITE_EMAILJS_SERVICE_ID` | Your EmailJS service ID | ❌ Optional |
    | `VITE_EMAILJS_TEMPLATE_ID` | Your EmailJS template ID | ❌ Optional |
    | `VITE_EMAILJS_PUBLIC_KEY` | Your EmailJS public key | ❌ Optional |

    -   Click "Save" after adding each variable

4.  **Trigger Rebuild**
    -   Go to **Deploys** tab
    -   Click "Trigger deploy" → "Clear cache and deploy site"
    -   Wait for deployment to complete (~2-3 minutes)

5.  **Verify Deployment**
    -   Visit your deployed site URL
    -   Sign up/Login
    -   Generate a meal plan
    -   Click "Analyze Nutrition" button
    -   ✅ If you see an AI score (e.g., "8/10"), it's working!
    -   ❌ If you see "API Key missing", recheck environment variables

### Troubleshooting Deployment Issues

#### AI Analysis Not Working

**Problem**: "Analyze Nutrition" shows error or "API Key missing"

**Solution**:
1. Verify `VITE_GEMINI_API_KEY` is set in Netlify environment variables
2. Ensure you clicked "Trigger deploy" after adding variables
3. Check browser console (F12) for specific error messages
4. Verify your Gemini API key is valid at [Google AI Studio](https://aistudio.google.com/)

#### Build Fails

**Problem**: Deployment shows build errors

**Solution**:
1. Run `npm run build` locally to test
2. Check if all dependencies are in `package.json` (not just dev dependencies)
3. Ensure Node.js version compatibility (Netlify uses Node 18 by default)

#### Blank Page After Deployment

**Problem**: Site loads but shows blank screen

**Solution**:
1. Check browser console for errors
2. Verify `netlify.toml` redirects are configured (already included)
3. Clear Netlify cache and redeploy

### Custom Domain (Optional)

-   In Netlify, go to **Domain settings**
-   Click "Add custom domain"
-   Follow instructions to configure DNS



## 📄 License

This project is licensed under the MIT License.

---

*Built with ❤️ by the NutriGenius Team*
