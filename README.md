# 🥗 NutriGenius AI

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
    Create a `.env` file in the root directory and add your API keys:

    ```env
    VITE_GEMINI_API_KEY=your_google_gemini_api_key_here
    ```

    *Note: Firebase configuration is currently embedded in `src/App.jsx`. For a production app, these should also be moved to environment variables.*

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

## 📄 License

This project is licensed under the MIT License.

---

*Built with ❤️ by the NutriGenius Team*
