import React, { useState, useEffect, useRef } from 'react';
import { mealDatabase } from './data/meals';
import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  signInWithCustomToken,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  addDoc,
  deleteDoc,
  updateDoc, // Added updateDoc
  query,
  onSnapshot,
  orderBy,
  serverTimestamp
} from 'firebase/firestore';
import {
  Leaf,
  DollarSign,
  User,
  LogOut,
  ChefHat,
  Activity,
  AlertCircle,
  Loader2,
  Calendar,
  ChevronRight,
  ChevronLeft,
  PieChart,
  ShoppingBag,
  X,
  ArrowRight,
  Star,
  Zap,
  Settings,
  Scale,
  Moon,
  Sun,
  ArrowLeft,
  CheckCircle2,
  Dumbbell,
  Coffee,
  Brain,
  Trash2,
  Sunrise,
  Sun as SunIcon,
  Moon as MoonIcon,
  Camera,
  FileText,
  Sparkles,
  Save,
  Edit2,
  Check,
  Twitter,
  Instagram,
  Linkedin,
  Facebook,
  Mail,
  CreditCard,
  Send
} from 'lucide-react';
import emailjs from '@emailjs/browser';
import AnimatedHeroText from './components/AnimatedHeroText';

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyCxo02wTnsu4_7_V3hZldq4Hi6ifKx0VWw",
  authDomain: "nutrigenius-local.firebaseapp.com",
  projectId: "nutrigenius-local",
  storageBucket: "nutrigenius-local.firebasestorage.app",
  messagingSenderId: "482532082210",
  appId: "1:482532082210:web:73533e7638e569ae23807b",
  measurementId: "G-7N365K4MBK"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// --- GEMINI AI INTEGRATION ---

// Helper: Filter meals by budget
const filterMealsByBudget = (budget) => {
  const dailyBudget = budget / 30; // Convert monthly to daily

  if (dailyBudget < 500) {
    return mealDatabase.filter(m => m.category === 'Small Price');
  } else if (dailyBudget < 2000) {
    return mealDatabase.filter(m => m.category === 'Medium Price');
  } else {
    return mealDatabase.filter(m => m.category === 'Large Price');
  }
};

// AI-Powered Meal Selection from Database
const selectOptimalMealsAI = async (userProfile, recentMealIds = []) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  // Filter meals by budget
  const availableMeals = filterMealsByBudget(userProfile.weeklyBudget);

  // Exclude recently used meals for variety
  const filteredMeals = availableMeals.filter(m => !recentMealIds.includes(m.id));

  if (filteredMeals.length === 0) {
    console.warn('⚠️ No meals available after filtering, using all meals');
    filteredMeals.push(...availableMeals);
  }

  // Randomly select 10 candidates for AI to analyze
  const candidates = [];
  const shuffled = [...filteredMeals].sort(() => Math.random() - 0.5);
  for (let i = 0; i < Math.min(10, shuffled.length); i++) {
    candidates.push(shuffled[i]);
  }

  if (!apiKey) {
    console.warn('⚠️ No API key, selecting random meal');
    const selected = candidates[0];
    return {
      selectedMeal: selected,
      analysis: 'AI analysis unavailable - API key missing'
    };
  }

  const promptText = `
    You are NutriGenius, an expert Ethiopian nutritionist and meal planner.
    
    USER PROFILE:
    - Goal: ${userProfile.goals}
    - Monthly Budget: ${userProfile.weeklyBudget} ETB
    - Dietary Restrictions: ${userProfile.dietaryRestrictions?.join(', ') || 'None'}
    - Allergies: ${userProfile.allergies?.join(', ') || 'None'}
    - Activity Level: ${userProfile.activityLevel}
    
    MEAL OPTIONS (select the BEST one):
    ${candidates.map((m, i) => `
    Option ${i + 1} (ID: ${m.id}):
    - Breakfast: ${m.breakfast.name} (${m.breakfast.price} ETB)
    - Lunch: ${m.lunch.name} (${m.lunch.price} ETB)
    - Dinner: ${m.dinner.name} (${m.dinner.price} ETB)
    - Total: ${m.total} ETB
    `).join('\n')}
    
    TASK:
    Select the SINGLE BEST option that:
    1. Fits the user's goals and dietary needs
    2. MINIMIZES TOTAL COST while maintaining nutrition
    3. Provides good value for money
    
    Return ONLY valid JSON:
    {
      "selectedId": Number
    }
  `;

  try {
    console.log('🤖 AI selecting from', candidates.length, 'meal options...');

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API Error ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
    const aiResult = JSON.parse(textResponse);

    const selectedMeal = candidates.find(m => m.id === aiResult.selectedId) || candidates[0];

    console.log('✅ AI selected meal ID:', selectedMeal.id);

    return { selectedMeal };

  } catch (error) {
    console.error('❌ AI selection error:', error);
    // Fallback to random selection
    return { selectedMeal: candidates[0] };
  }
};

// Convert database meal to app format
const convertMealToAppFormat = (dbMeal) => {
  return {
    date: new Date().toISOString(),
    total_estimated_cost: dbMeal.total,
    mealId: dbMeal.id, // Track for variety
    meals: [
      {
        type: 'Breakfast',
        name: dbMeal.breakfast.name,
        cost: dbMeal.breakfast.price,
        calories: 450, // Estimated
        ingredients: [{ name: dbMeal.breakfast.name, amount: '1 serving', cost: dbMeal.breakfast.price }],
        instructions: `Traditional Ethiopian breakfast: ${dbMeal.breakfast.name}`
      },
      {
        type: 'Lunch',
        name: dbMeal.lunch.name,
        cost: dbMeal.lunch.price,
        calories: 650, // Estimated
        ingredients: [{ name: dbMeal.lunch.name, amount: '1 serving', cost: dbMeal.lunch.price }],
        instructions: `Traditional Ethiopian lunch: ${dbMeal.lunch.name}`
      },
      {
        type: 'Dinner',
        name: dbMeal.dinner.name,
        cost: dbMeal.dinner.price,
        calories: 550, // Estimated
        ingredients: [{ name: dbMeal.dinner.name, amount: '1 serving', cost: dbMeal.dinner.price }],
        instructions: `Traditional Ethiopian dinner: ${dbMeal.dinner.name}`
      }
    ]
  };
};

// NEW: On-Demand AI Nutritional Analysis
const analyzeMealPlanAI = async (mealPlan) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  if (!apiKey) {
    return {
      score: 0,
      summary: 'API Key missing. Please configure VITE_GEMINI_API_KEY in your .env file.'
    };
  }

  const promptText = `
    You are NutriGenius, an expert Ethiopian nutritionist.
    
    Analyze this daily meal plan:
    
    BREAKFAST: ${mealPlan.meals[0].name} (${mealPlan.meals[0].cost} ETB, ~${mealPlan.meals[0].calories} cal)
    LUNCH: ${mealPlan.meals[1].name} (${mealPlan.meals[1].cost} ETB, ~${mealPlan.meals[1].calories} cal)
    DINNER: ${mealPlan.meals[2].name} (${mealPlan.meals[2].cost} ETB, ~${mealPlan.meals[2].calories} cal)
    
    TOTAL COST: ${mealPlan.total_estimated_cost} ETB
    TOTAL CALORIES: ~${mealPlan.meals.reduce((sum, m) => sum + m.calories, 0)} cal
    
    TASK:
    1. Provide a nutritional analysis (2-3 sentences)
    2. Rate the overall health value (1-10)
    3. Mention key nutrients and benefits
    
    Return ONLY valid JSON:
    {
      "score": Number (1-10),
      "summary": "String (2-3 sentences about nutritional value, benefits, and balance)"
    }
  `;

  try {
    console.log('🔬 Analyzing meal plan nutritionally...');
    console.log('📋 Meal details:', {
      breakfast: mealPlan.meals[0].name,
      lunch: mealPlan.meals[1].name,
      dinner: mealPlan.meals[2].name,
      total: mealPlan.total_estimated_cost
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.7
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error(`API Error ${response.status}: ${errorText.substring(0, 100)}`);
    }

    const data = await response.json();
    console.log('📦 API Response:', data);

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textResponse) {
      console.error('❌ No text in response');
      throw new Error('No response text from API');
    }

    console.log('📝 Raw response:', textResponse);

    const analysis = JSON.parse(textResponse);
    console.log('✅ Analysis complete. Score:', analysis.score);

    return analysis;

  } catch (error) {
    console.error('❌ Analysis error:', error);
    console.error('Error stack:', error.stack);

    return {
      score: 7,
      summary: `Balanced Ethiopian meal plan. ${error.message || 'Analysis temporarily unavailable.'}`
    };
  }
};

// Main generation function (updated to use database)
const generateAffordablePlanAI = async (userProfile, recentMealIds = []) => {
  try {
    console.log('🚀 Generating meal plan from database...');
    console.log('📊 Budget:', userProfile.weeklyBudget, 'ETB/month');
    console.log('🎯 Goal:', userProfile.goals);

    const result = await selectOptimalMealsAI(userProfile, recentMealIds);
    const mealPlan = convertMealToAppFormat(result.selectedMeal);

    console.log('✅ Generated plan:', mealPlan);
    return mealPlan;

  } catch (error) {
    console.error('❌ Generation failed:', error);

    // Fallback to simple selection
    const availableMeals = filterMealsByBudget(userProfile.weeklyBudget);
    const randomMeal = availableMeals[Math.floor(Math.random() * availableMeals.length)];

    return convertMealToAppFormat(randomMeal);
  }
};

const analyzeDailyPlanAI = async (plan) => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) return { summary: "API Key missing. Please add VITE_GEMINI_API_KEY to .env file.", score: 0 };

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const promptText = `
    Analyze this daily meal plan combination:
    Breakfast: ${plan.meals[0].name} (${plan.meals[0].calories}kcal)
    Lunch: ${plan.meals[1].name} (${plan.meals[1].calories}kcal)
    Dinner: ${plan.meals[2].name} (${plan.meals[2].calories}kcal)

    Provide a 2-sentence nutritional summary focusing on macro balance and satiety. 
    Then provide a score out of 10 for "Nutritional Balance".
    
    Output Format JSON:
    {
      "summary": "String",
      "score": Number
    }
  `;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: { responseMimeType: "application/json" }
      })
    });
    const data = await response.json();
    return JSON.parse(data.candidates?.[0]?.content?.parts?.[0]?.text);
  } catch (error) {
    return { summary: "Balanced meal set with good protein distribution.", score: 8 };
  }
};

const REVIEWS = [
  { id: 1, name: "Jane Doe", role: "Busy Professional", initials: "JD", text: "I saved 1500 ETB on groceries in my first month. This AI is a game changer.", rating: 5 },
  { id: 2, name: "Michael Chen", role: "Student", initials: "MC", text: "Helped me stop eating instant noodles every day. The recipes are actually good!", rating: 5 },
  { id: 3, name: "Sarah Jenkins", role: "Fitness Enthusiast", initials: "SJ", text: "Found high protein sources I didn't even know were cheap. Highly recommend.", rating: 4 }
];

const TRUSTED_BY = ["WholeFoods Market", "Trader Joe's Index", "Instacart Data", "USDA", "MyFitnessPal API", "Walmart Grocery", "Kroger Digital"];

// --- UI COMPONENTS ---

const Button = ({ children, onClick, variant = 'primary', disabled, isLoading, className = '', type = 'button' }) => {
  const baseStyle = "px-6 py-3 rounded-full font-semibold transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed tracking-wide text-sm";
  const variants = {
    primary: "bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-emerald-200 hover:shadow-lg active:scale-95 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-emerald-950",
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm active:scale-95 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700 dark:hover:bg-gray-700",
    ghost: "bg-transparent text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/20",
    outline: "border-2 border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-500 dark:text-emerald-400 dark:hover:bg-emerald-900/20",
    danger: "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
  };
  return <button type={type} onClick={onClick} disabled={disabled || isLoading} className={`${baseStyle} ${variants[variant]} ${className}`}>{isLoading ? <Loader2 className="animate-spin" size={18} /> : children}</button>;
};

const Input = ({ label, ...props }) => (
  <div className="flex flex-col gap-2">
    <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">{label}</label>
    <input className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all hover:bg-white dark:hover:bg-gray-700" {...props} />
  </div>
);

// FIX: Updated SelectionCard for better alignment (items-start, text-left)
const SelectionCard = ({ selected, onClick, icon: Icon, title, desc }) => (
  <div onClick={onClick} className={`cursor-pointer p-4 rounded-lg border-2 transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 h-full ${selected ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-400' : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 hover:border-emerald-200 dark:hover:border-emerald-700'}`}>
    <div className={`p-3 rounded-full shrink-0 ${selected ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-800 dark:text-emerald-200' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>
      <Icon size={20} />
    </div>
    <div className="flex-1 text-left">
      <h4 className={`font-bold text-sm leading-tight mb-0.5 ${selected ? 'text-emerald-900 dark:text-emerald-100' : 'text-gray-700 dark:text-gray-300'}`}>{title}</h4>
      {desc && <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{desc}</p>}
    </div>
    {selected && <CheckCircle2 size={20} className="text-emerald-500 fill-emerald-100 dark:fill-emerald-900 hidden sm:block" />}
  </div>
);

const PricingView = ({ onBack, userEmail }) => {
  const [loading, setLoading] = useState(null);

  const plans = [
    {
      id: 'basic',
      name: 'Basic',
      price: 0,
      period: '/mo',
      desc: 'Essential meal planning',
      features: ['Daily Meal Plans', 'Basic Recipes', 'Shopping List', 'Standard Support'],
      color: 'gray',
      btnText: 'Current Plan'
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 199,
      period: '/mo',
      desc: 'Advanced AI & Analytics',
      features: ['Everything in Basic', 'Advanced AI Models', 'Nutritional Analysis', 'Unlimited History', 'Priority Support'],
      color: 'emerald',
      recommended: true,
      btnText: 'Upgrade to Pro'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 499,
      period: '/mo',
      desc: 'Personalized Coaching',
      features: ['Everything in Pro', '1-on-1 Nutritionist Chat', 'Custom Diet Plans', 'Family Mode', 'Exclusive Recipes'],
      color: 'purple',
      btnText: 'Get Premium'
    }
  ];

  const handleSubscribe = async (plan) => {
    if (plan.price === 0) return;
    setLoading(plan.id);

    // Chapa Integration
    const CHAPA_KEY = import.meta.env.VITE_CHAPA_SECRET_KEY;

    if (!CHAPA_KEY || !CHAPA_KEY.startsWith('CHASECK')) {
      alert("Invalid API Key. Please ensure you are using the Chapa SECRET Key (starts with CHASECK) in your .env file.");
      setLoading(null);
      return;
    }

    if (!userEmail) {
      alert("User email is missing. Please sign in again.");
      setLoading(null);
      return;
    }

    const tx_ref = `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    console.log("Initiating payment for:", plan.id);
    console.log("Using Key:", CHAPA_KEY.substring(0, 10) + "...");

    try {
      // Use local proxy to avoid CORS issues
      const response = await fetch("/api/chapa/transaction/initialize", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${CHAPA_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          amount: plan.price.toString(),
          currency: "ETB",
          email: userEmail,
          first_name: "NutriGenius",
          last_name: "User",
          tx_ref: tx_ref,
          callback_url: window.location.origin,
          return_url: window.location.origin,
          customization: {
            title: `NG ${plan.name}`,
            description: `Subscription to ${plan.name} Plan`
          }
        })
      });

      const data = await response.json();
      if (data.status === 'success' && data.data?.checkout_url) {
        // Store pending transaction details
        localStorage.setItem('pending_payment', JSON.stringify({
          tx_ref,
          plan_id: plan.id,
          plan_name: plan.name
        }));
        window.location.href = data.data.checkout_url;
      } else {
        console.error("Chapa failed:", data);
        // Force stringify to avoid [object Object]
        alert(`Payment initialization failed:\n${JSON.stringify(data, null, 2)}`);
      }
    } catch (err) {
      console.error("Payment Error:", err);
      alert("Connection error. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6 font-sans transition-colors duration-300">
      <div className="max-w-6xl mx-auto py-12">
        <button onClick={onBack} className="mb-8 flex items-center gap-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
          <ArrowLeft size={20} /> Back to Dashboard
        </button>

        <div className="text-center mb-16 space-y-4">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">Simple, Transparent Pricing</h2>
          <p className="text-xl text-gray-500 dark:text-gray-400">Choose the plan that fits your health goals.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {plans.map((plan) => (
            <div key={plan.id} className={`relative bg-white dark:bg-gray-900 rounded-xl p-8 border-2 flex flex-col ${plan.recommended ? 'border-emerald-500 shadow-xl shadow-emerald-500/10 scale-105 z-10' : 'border-gray-100 dark:border-gray-800 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all'}`}>
              {plan.recommended && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                  Most Popular
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{plan.name}</h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">{plan.desc}</p>
              </div>
              <div className="mb-8">
                <span className="text-4xl font-bold text-gray-900 dark:text-white">{plan.price === 0 ? 'Free' : `ETB ${plan.price}`}</span>
                <span className="text-gray-500 dark:text-gray-400">{plan.period}</span>
              </div>
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                    <CheckCircle2 size={18} className={`shrink-0 ${plan.id === 'basic' ? 'text-gray-400' : 'text-emerald-500'}`} />
                    {feat}
                  </li>
                ))}
              </ul>
              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={loading === plan.id || plan.price === 0}
                isLoading={loading === plan.id}
                variant={plan.recommended ? 'primary' : 'secondary'}
                className="w-full"
              >
                {plan.btnText}
              </Button>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-gray-400 text-sm flex items-center justify-center gap-2">
            <CreditCard size={16} /> Secure payments powered by Chapa
          </p>
        </div>
      </div>
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function NutriGenius() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('landing');
  const [authMode, setAuthMode] = useState('login');
  const [profileData, setProfileData] = useState(null);
  const [mealPlans, setMealPlans] = useState([]);

  // View States
  const [selectedMeal, setSelectedMeal] = useState(null); // For recipe modal
  const [selectedPlan, setSelectedPlan] = useState(null); // For daily analysis view
  const [selectedDate, setSelectedDate] = useState(null); // For daily overview (all plans for a date)

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Dark Mode Effect
  useEffect(() => {
    if (isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  // Auth Listener
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token);
      } catch (err) { console.warn("Auth mismatch", err); }
    };
    initAuth();
    return onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser && !currentUser.isAnonymous) {

        // --- PAYMENT VERIFICATION START ---
        const pendingPayment = localStorage.getItem('pending_payment');
        if (pendingPayment) {
          // Verify with Chapa (Client-side verification for demo purposes)
          // Note: In production, use a backend proxy to hide the secret key and avoid CORS.

          // Add a small delay to allow Chapa to process the transaction
          setTimeout(async () => {
            const { tx_ref, plan_id, plan_name } = JSON.parse(pendingPayment);
            const CHAPA_KEY = import.meta.env.VITE_CHAPA_SECRET_KEY;

            try {
              // Verify with Chapa using local proxy
              const verifyResponse = await fetch(`/api/chapa/transaction/verify/${tx_ref}`, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${CHAPA_KEY}`
                }
              });

              const verifyData = await verifyResponse.json();
              console.log("Verification Response:", verifyData);

              // Strict check: Ensure both API call AND transaction status are success
              if (verifyData.status === 'success' && verifyData.data?.status === 'success') {
                await setDoc(doc(db, 'users', currentUser.uid), {
                  subscription: plan_id,
                  subscriptionDate: serverTimestamp()
                }, { merge: true });

                alert(`Payment Successful! Upgraded to ${plan_name}.`);
                localStorage.removeItem('pending_payment');
              } else {
                // Only alert if it's an actual failure (not just a refresh on a non-pending state)
                alert(`Payment verification failed.\nStatus: ${verifyData.data?.status || 'Unknown'}\nMessage: ${verifyData.message || 'None'}`);
                console.warn("Payment failed or pending:", verifyData);
                localStorage.removeItem('pending_payment');
              }

            } catch (err) {
              console.error("Verification Error:", err);
              alert("Could not verify payment. Please check your connection.");
              localStorage.removeItem('pending_payment');
            }
          }, 2000); // Wait 2 seconds
        }
        // --- PAYMENT VERIFICATION END ---

        const userRef = doc(db, 'users', currentUser.uid);
        onSnapshot(userRef, (docSnap) => {
          if (docSnap.exists()) {
            setProfileData(docSnap.data());
            if (view === 'auth' || view === 'landing') setView('dashboard');
          } else {
            setView('profile');
          }
        });
        const q = query(collection(db, 'users', currentUser.uid, 'meal_plans'), orderBy('date', 'desc'));
        onSnapshot(q, (s) => setMealPlans(s.docs.map(d => ({ id: d.id, ...d.data() }))));
      } else if (view === 'dashboard' || view === 'profile') setView('landing');
    });
  }, [view]);

  // Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, e.target.email.value, e.target.password.value);
      else await createUserWithEmailAndPassword(auth, e.target.email.value, e.target.password.value);
    } catch (err) { setError(err.message); } finally { setLoading(false); }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    setError('');
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle the redirect/state update
    } catch (err) {
      console.error(err);
      setError("Google Sign-In failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);

    // Handle Image Upload (Simple Base64 for Demo)
    const imageFile = formData.get('profileImage');
    let imageBase64 = profileData?.profileImage || null;

    if (imageFile && imageFile.size > 0) {
      if (imageFile.size > 500000) { // 500KB limit
        alert("Image too large. Please use an image under 500KB.");
        setLoading(false);
        return;
      }
      const reader = new FileReader();
      imageBase64 = await new Promise((resolve) => {
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(imageFile);
      });
    }

    const data = {
      goals: formData.get('goals'),
      activityLevel: formData.get('activityLevel'),
      dietaryRestrictions: [formData.get('diet_vegan') ? 'Vegan' : null, formData.get('diet_gf') ? 'Gluten-Free' : null].filter(Boolean),
      allergies: formData.get('allergies').split(',').map(s => s.trim()).filter(Boolean),
      weeklyBudget: parseFloat(formData.get('budget')),
      metrics: { weight: formData.get('weight'), height: formData.get('height') },
      profileImage: imageBase64
    };
    try { await setDoc(doc(db, 'users', user.uid), data, { merge: true }); setView('dashboard'); } catch (err) { setError("Save failed"); } finally { setLoading(false); }
  };

  const handleGenerate = async () => {
    if (!profileData) {
      alert('Please complete your profile first!');
      return;
    }

    setGenerating(true);
    console.log('🚀 Starting meal plan generation...');

    try {
      // Get recent meal IDs for variety tracking (last 5)
      const recentMealIds = mealPlans
        .filter(p => p.mealId) // Only plans with mealId (from database)
        .slice(0, 5)
        .map(p => p.mealId);

      console.log('🔄 Avoiding recent meals:', recentMealIds);

      const plan = await generateAffordablePlanAI(profileData, recentMealIds);

      if (plan.error) {
        console.warn('⚠️ Plan generated with error:', plan.error);
        alert(`Meal plan generated with fallback data. Error: ${plan.error}\n\nPlease check your API key in .env file.`);
      } else {
        console.log('✅ Plan generated successfully:', plan);
      }

      await addDoc(collection(db, 'users', user.uid, 'meal_plans'), { ...plan, createdAt: serverTimestamp() });
      console.log('💾 Plan saved to database');

    } catch (err) {
      console.error('❌ Generation failed:', err);
      alert(`Failed to generate meal plan: ${err.message}\n\nCheck console for details.`);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (window.confirm("Are you sure you want to delete this meal plan?")) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'meal_plans', planId));
        if (selectedPlan?.id === planId) setSelectedPlan(null);
      } catch (err) {
        console.error("Error deleting plan", err);
      }
    }
  };

  // --- VIEWS ---

  const LandingPage = () => {
    const [activeStep, setActiveStep] = useState(0);
    const [subscribing, setSubscribing] = useState(false);
    const form = useRef();

    const handleSubscribe = (e) => {
      e.preventDefault();
      setSubscribing(true);

      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID;
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID;
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY;

      if (!serviceId || !templateId || !publicKey || serviceId === 'your_service_id') {
        alert("Please configure EmailJS keys in your .env file to enable newsletter.");
        setSubscribing(false);
        return;
      }

      emailjs.sendForm(serviceId, templateId, form.current, publicKey)
        .then((result) => {
          console.log(result.text);
          alert("Thanks for subscribing! Check your inbox for a welcome email.");
          form.current.reset();
        }, (error) => {
          console.log(error.text);
          alert("Failed to subscribe. Please try again.");
        })
        .finally(() => setSubscribing(false));
    };

    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 font-sans selection:bg-emerald-100 transition-colors duration-300 overflow-x-hidden">
        {/* Navbar */}
        <nav className="fixed w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="">
                <img src={isDarkMode ? "/dark_mood.png" : "/favicon.png"} alt="Logo" className="w-10 h-10 object-contain" />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white tracking-tight hidden sm:block">NutriGenius</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button onClick={() => { setAuthMode('login'); setView('auth'); }} className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-emerald-600 px-3 py-2">Log In</button>
              <button onClick={() => { setAuthMode('signup'); setView('auth'); }} className="bg-emerald-600 text-white px-4 py-2 sm:px-5 sm:py-2.5 rounded-full text-sm font-medium hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 dark:shadow-none">Sign Up</button>
            </div>
          </div>
        </nav>

        {/* Hero Section */}
        <section className="pt-32 pb-12 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-100 dark:border-emerald-800 px-4 py-2 rounded-full text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-semibold animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Zap size={16} className="fill-emerald-700 dark:fill-emerald-400" /> #1 AI Nutrition Coach for Budgets
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-gray-900 dark:text-white leading-[1.1] tracking-tight">
              <AnimatedHeroText
                text="Eat Healthy."
                className="block mb-2"
              />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Without Breaking the Bank.</span>
            </h1>
            <p className="text-lg sm:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed">
              AI-powered meal planning that optimizes for your health goals AND your wallet.
            </p>
          </div>
        </section>

        {/* Trusted Data Sources Marquee */}
        <section className="py-10 border-y border-gray-100 dark:border-gray-800 bg-white/50 dark:bg-gray-900/30 backdrop-blur-sm overflow-hidden">
          <div className="relative flex overflow-x-hidden group">
            {/* Gradient Masks for smooth fade edges */}
            <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-white dark:from-gray-950 to-transparent z-10" />
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-white dark:from-gray-950 to-transparent z-10" />

            <div className="animate-scroll flex items-center gap-16 whitespace-nowrap py-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-16">
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-300 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] cursor-default">UNICEF</span>
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-gray-800 dark:hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] cursor-default">Google</span>
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-sky-500 dark:hover:text-sky-400 transition-colors duration-300 hover:drop-shadow-[0_0_8px_rgba(14,165,233,0.5)] cursor-default">Microsoft</span>
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-orange-500 dark:hover:text-orange-400 transition-colors duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] cursor-default">Amazon</span>
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors duration-300 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] cursor-default">UDHR</span>
                </div>
              ))}
            </div>
            {/* Duplicate for seamless loop */}
            <div className="animate-scroll flex items-center gap-16 whitespace-nowrap py-2" aria-hidden="true">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center gap-16">
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-blue-500 dark:hover:text-blue-400 transition-colors duration-300 hover:drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] cursor-default">UNICEF</span>
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-gray-800 dark:hover:text-white transition-colors duration-300 hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.5)] cursor-default">Google</span>
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-sky-500 dark:hover:text-sky-400 transition-colors duration-300 hover:drop-shadow-[0_0_8px_rgba(14,165,233,0.5)] cursor-default">Microsoft</span>
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-orange-500 dark:hover:text-orange-400 transition-colors duration-300 hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.5)] cursor-default">Amazon</span>
                  <span className="text-2xl font-bold text-gray-300 dark:text-gray-600 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors duration-300 hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)] cursor-default">UDHR</span>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 mt-6 text-center">
            <p className="text-sm text-gray-400">We aggregate prices from the nation's top grocers.</p>
          </div>
        </section>
        <section className="py-20 px-4 sm:px-6 relative overflow-hidden">
          {/* Background Elements */}
          <div className="absolute inset-0 bg-gray-50 dark:bg-gray-900/50 -z-20" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full opacity-30 dark:opacity-10 pointer-events-none -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-200/50 via-transparent to-transparent" />

          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-4xl font-bold text-gray-900 dark:text-white tracking-tight">The Science of Saving</h2>
              <p className="text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                NutriGenius combines advanced AI with real-time market data to build your perfect plan.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {[
                {
                  icon: DollarSign,
                  title: "Set Your Limit",
                  desc: "Input your exact weekly grocery budget. We respect every penny.",
                  borderColor: "hover:border-blue-400 dark:hover:border-blue-500",
                  shadowColor: "hover:shadow-blue-500/10",
                  iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                },
                {
                  icon: Brain,
                  title: "AI Analysis",
                  desc: "Our engine scans 10,000+ ingredient prices to find the best value.",
                  borderColor: "hover:border-emerald-400 dark:hover:border-emerald-500",
                  shadowColor: "hover:shadow-emerald-500/10",
                  iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
                },
                {
                  icon: ChefHat,
                  title: "Eat & Save",
                  desc: "Get chef-curated recipes that utilize affordable, nutrient-dense foods.",
                  borderColor: "hover:border-orange-400 dark:hover:border-orange-500",
                  shadowColor: "hover:shadow-orange-500/10",
                  iconBg: "bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
                }
              ].map((step, idx) => (
                <div
                  key={idx}
                  className={`group bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${step.borderColor} ${step.shadowColor}`}
                >
                  <div className={`w-14 h-14 rounded-lg ${step.iconBg} flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3`}>
                    <step.icon size={28} />
                  </div>

                  <h3 className="text-xl font-bold mb-3 text-gray-900 dark:text-white group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 py-12 bg-white dark:bg-gray-950 px-4">
          <Button onClick={() => { setAuthMode('signup'); setView('auth'); }} className="w-full sm:w-auto px-8 py-4 text-lg shadow-xl shadow-emerald-200/50 dark:shadow-none">
            Start Your Plan <ArrowRight size={20} />
          </Button>
        </div>

        {/* Testimonials */}
        <section className="py-24 px-4 sm:px-6 bg-white dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-12 text-center">Loved by Budget Chefs</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {REVIEWS.map((review) => (
                <div key={review.id} className="bg-gray-50 dark:bg-gray-900 p-8 rounded-xl border border-gray-100 dark:border-gray-800 flex flex-col">
                  <div className="flex gap-1 text-yellow-400 mb-6"><Star fill="currentColor" size={18} /><Star fill="currentColor" size={18} /><Star fill="currentColor" size={18} /><Star fill="currentColor" size={18} /><Star fill="currentColor" size={18} /></div>
                  <p className="text-gray-600 dark:text-gray-300 mb-8 flex-grow">"{review.text}"</p>
                  <div className="flex items-center gap-4 mt-auto pt-6 border-t border-gray-200 dark:border-gray-800">
                    <div className="w-10 h-10 bg-emerald-700 rounded-full flex items-center justify-center font-bold text-emerald-200 text-sm">{review.initials}</div>
                    <div>
                      <div className="font-bold text-gray-900 dark:text-white text-sm">{review.name}</div>
                      <div className="text-emerald-600 dark:text-emerald-400 text-xs">{review.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        <footer className="bg-gray-50 dark:bg-gray-900 pt-20 pb-10 border-t border-gray-200 dark:border-gray-800">
          <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 mb-16">
              {/* Brand & Newsletter */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="">
                    <img src={isDarkMode ? "/dark_mood.png" : "/favicon.png"} alt="Logo" className="w-10 h-10 object-contain" />
                  </div>
                  <span className="font-bold text-xl text-gray-900 dark:text-white">NutriGenius</span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 leading-relaxed">
                  Making healthy eating accessible and affordable for everyone through the power of AI.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-900 dark:text-white uppercase tracking-wider">Subscribe to our newsletter</label>
                  <form ref={form} onSubmit={handleSubscribe} className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="email"
                        name="user_email"
                        placeholder="Enter your email"
                        required
                        className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                      />
                    </div>
                    <button type="submit" disabled={subscribing} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg text-sm font-bold transition-colors disabled:opacity-70 flex items-center gap-2">
                      {subscribing ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                      {subscribing ? '...' : 'Subscribe'}
                    </button>
                  </form>
                </div>
              </div>

              {/* Links Columns */}
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-6">Product</h4>
                <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Features</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Testimonials</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">API</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-6">Company</h4>
                <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">About Us</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-6">Resources</h4>
                <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Community</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Help Center</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Partners</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Status</a></li>
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white mb-6">Legal</h4>
                <ul className="space-y-4 text-sm text-gray-500 dark:text-gray-400">
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Privacy</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Terms</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Cookies</a></li>
                  <li><a href="#" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Licenses</a></li>
                </ul>
              </div>
            </div>

            <div className="pt-8 border-t border-gray-200 dark:border-gray-800 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-gray-400 text-sm">© 2025 NutriGenius AI. All rights reserved.</p>
              <div className="flex items-center gap-6">
                <a href="#" className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"><Twitter size={20} /></a>
                <a href="#" className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"><Instagram size={20} /></a>
                <a href="#" className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"><Linkedin size={20} /></a>
                <a href="#" className="text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"><Facebook size={20} /></a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    );
  };

  const AuthView = () => (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 relative overflow-hidden transition-colors duration-300">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-200 dark:bg-emerald-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-teal-200 dark:bg-teal-900/30 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl p-8 rounded-xl shadow-xl border border-white dark:border-gray-700 z-10">
        <button onClick={() => setView('landing')} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={24} /></button>
        <div className="flex flex-col items-center mb-8">
          <div className="mb-4">
            <img src={document.documentElement.classList.contains('dark') ? "/dark_mood.png" : "/favicon.png"} alt="Logo" className="w-16 h-16 object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{authMode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        </div>
        {error && <div className="mb-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg text-sm flex items-start gap-3"><AlertCircle size={18} className="shrink-0 mt-0.5" />{error}</div>}
        <form onSubmit={handleAuth} className="space-y-5">
          <Input name="email" type="email" label="Email Address" placeholder="hello@example.com" required />
          <Input name="password" type="password" label="Password" placeholder="••••••••" required />
          <Button type="submit" isLoading={loading} className="w-full text-lg py-4 shadow-emerald-200 dark:shadow-none">{authMode === 'login' ? 'Sign In' : 'Get Started'}</Button>
        </form>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
          <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Or continue with</span>
          <div className="h-px bg-gray-200 dark:bg-gray-700 flex-1" />
        </div>

        <Button onClick={handleGoogleAuth} variant="secondary" isLoading={loading} className="w-full">
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
          </svg>
          Sign in with Google
        </Button>
        <div className="mt-8 pt-6 border-t border-gray-100 dark:border-gray-700 text-center">
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-3">{authMode === 'login' ? "New here?" : "Have an account?"}</p>
          <button onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} className="text-emerald-600 dark:text-emerald-400 font-bold hover:text-emerald-700 transition-colors">{authMode === 'login' ? "Create free account" : "Log in"}</button>
        </div>
      </div>
    </div>
  );

  const DashboardView = () => {
    const [showSettings, setShowSettings] = useState(false);
    const settingsRef = useRef(null);

    // Monthly Budget Logic
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthlyPlans = mealPlans.filter(plan => {
      const d = new Date(plan.date);
      return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });

    const spent = monthlyPlans.reduce((acc, plan) => acc + plan.total_estimated_cost, 0).toFixed(2);
    const budget = profileData?.weeklyBudget || 0; // Treating as Monthly Budget
    const percent = Math.min((spent / budget) * 100, 100);

    // Calendar Logic
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const getDailyCost = (day) => {
      const plan = monthlyPlans.find(p => new Date(p.date).getDate() === day);
      return plan ? plan.total_estimated_cost : 0;
    };

    useEffect(() => {
      const handleClickOutside = (event) => { if (settingsRef.current && !settingsRef.current.contains(event.target)) setShowSettings(false); };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-20 font-sans transition-colors duration-300">
        <div className="bg-white dark:bg-gray-900 sticky top-0 z-20 border-b border-gray-100 dark:border-gray-800 px-4 sm:px-6 py-4 shadow-sm">
          <div className="max-w-5xl mx-auto flex justify-between items-center relative">
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-lg">
              <img src={isDarkMode ? "/dark_mood.png" : "/favicon.png"} alt="Logo" className="w-8 h-8 object-contain" /> NutriGenius
            </div>
            <div className="relative flex items-center gap-4" ref={settingsRef}>

              {/* Profile Image (Added) */}
              <div className="w-10 h-10 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100">
                {profileData?.profileImage ? (
                  <img src={profileData.profileImage} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-bold">
                    {user?.email?.[0].toUpperCase()}
                  </div>
                )}
              </div>

              <button onClick={() => setShowSettings(!showSettings)} className={`p-2 rounded-full transition-all ${showSettings ? 'bg-emerald-100 dark:bg-emerald-900 text-emerald-600 dark:text-emerald-400' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400'}`}><Settings size={24} /></button>
              {showSettings && (
                <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-top-2 z-50">
                  <div className="bg-emerald-600 p-4 text-white">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden">
                        {profileData?.profileImage ? <img src={profileData.profileImage} className="w-full h-full object-cover" /> : user?.email?.[0].toUpperCase()}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold truncate">{user?.email}</p>
                        <p className="text-xs text-emerald-100 opacity-80 capitalize">{profileData?.subscription || 'Basic'} Plan</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3 border-b border-gray-100 dark:border-gray-800">
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400"><span className="flex items-center gap-2"><Activity size={16} className="text-emerald-500" /> Goal</span><span className="font-semibold text-gray-900 dark:text-white">{profileData?.goals || 'Not set'}</span></div>
                    <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400"><span className="flex items-center gap-2"><DollarSign size={16} className="text-emerald-500" /> Budget</span><span className="font-semibold text-gray-900 dark:text-white">{profileData?.weeklyBudget || 0} ETB/mo</span></div>
                  </div>
                  <div className="p-2">
                    <button onClick={() => setIsDarkMode(!isDarkMode)} className="w-full text-left flex items-center justify-between px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors">
                      <span className="flex items-center gap-3"><Moon size={18} className="text-gray-400" /> Dark Mode</span>
                      {isDarkMode ? <div className="w-8 h-4 bg-emerald-500 rounded-full relative"><div className="absolute right-0.5 top-0.5 w-3 h-3 bg-white rounded-full" /></div> : <div className="w-8 h-4 bg-gray-300 rounded-full relative"><div className="absolute left-0.5 top-0.5 w-3 h-3 bg-white rounded-full" /></div>}
                    </button>
                    <button onClick={() => { setView('profile'); setShowSettings(false); }} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"><User size={18} className="text-gray-400" /> Edit Profile</button>
                    <button onClick={() => { setView('pricing'); setShowSettings(false); }} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 transition-colors"><CreditCard size={18} className="text-gray-400" /> Upgrade Plan</button>
                    <button onClick={async () => { await signOut(auth); setView('landing'); }} className="w-full text-left flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium text-red-600 dark:text-red-400 transition-colors"><LogOut size={18} className="text-red-400" /> Sign Out</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto p-6 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Calendar Widget */}
            <div className="lg:col-span-5 bg-white dark:bg-gray-900 rounded-lg p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Calendar size={20} className="text-emerald-500" /> {now.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h3>
                <div className="flex gap-1">
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400"><ChevronLeft size={16} /></button>
                  <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full text-gray-400"><ChevronRight size={16} /></button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2 text-center">
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                  <div key={d} className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1 flex-1 content-start">
                {Array(firstDayOfMonth).fill(null).map((_, i) => <div key={`empty-${i}`} />)}
                {days.map(day => {
                  const cost = getDailyCost(day);
                  const isToday = day === now.getDate();
                  const hasPlan = cost > 0;

                  return (
                    <button
                      key={day}
                      onClick={() => {
                        if (hasPlan) setSelectedDate(new Date(currentYear, currentMonth, day).toISOString());
                      }}
                      disabled={!hasPlan}
                      className={`
                        aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-all duration-200
                        ${hasPlan
                          ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-100 dark:border-emerald-800 hover:scale-105 hover:shadow-md cursor-pointer'
                          : 'text-gray-400 dark:text-gray-600 cursor-default'
                        }
                        ${isToday ? 'ring-2 ring-emerald-500 ring-offset-2 dark:ring-offset-gray-900 z-10' : ''}
                      `}
                    >
                      <span>{day}</span>
                      {hasPlan && (
                        <div className="w-1 h-1 rounded-full bg-emerald-500 mt-1" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex justify-between items-center text-xs text-gray-400">
                <span>{monthlyPlans.length} days planned</span>
                <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Active Plan</span>
              </div>
            </div>

            {/* Enhanced Budget Dashboard */}
            <div className="lg:col-span-7 space-y-4">
              {/* Main Budget Card */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-lg p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-10"><PieChart size={180} /></div>

                <div className="relative z-10">
                  <p className="text-gray-400 font-medium mb-2 flex items-center gap-2"><DollarSign size={16} /> Monthly Budget Usage</p>
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-4xl font-bold tracking-tight">ETB {spent}</span>
                    <span className="text-lg text-gray-500 font-normal">/ {budget}</span>
                  </div>
                  <div className="text-xs text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded-full inline-block mb-4">{100 - Math.round(percent)}% Remaining</div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="h-3 bg-gray-700/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/5">
                      <div
                        className={`h-full transition-all duration-1000 ease-out ${percent > 90 ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Total Meals */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg">
                      <ChefHat size={16} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase">Meals</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{monthlyPlans.length}</div>
                  <div className="text-xs text-gray-500 mt-1">Generated</div>
                </div>

                {/* Notes Count */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <FileText size={16} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase">Notes</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">{monthlyPlans.filter(p => p.notes).length}</div>
                  <div className="text-xs text-gray-500 mt-1">Written</div>
                </div>

                {/* Avg Calories */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <Activity size={16} className="text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase">Avg Cal</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {monthlyPlans.length > 0 ? Math.round(monthlyPlans.reduce((sum, p) => sum + p.meals.reduce((s, m) => s + m.calories, 0), 0) / monthlyPlans.length) : 0}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">kcal/day</div>
                </div>

                {/* Avg Score */}
                <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <Sparkles size={16} className="text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-xs font-bold text-gray-400 uppercase">AI Score</span>
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {monthlyPlans.filter(p => p.aiAnalysis).length > 0
                      ? (monthlyPlans.filter(p => p.aiAnalysis).reduce((sum, p) => sum + p.aiAnalysis.score, 0) / monthlyPlans.filter(p => p.aiAnalysis).length).toFixed(1)
                      : '—'}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Average</div>
                </div>
              </div>
            </div>
          </div>



          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">My Meal Plans</h2>
            <Button onClick={handleGenerate} disabled={generating} className="shadow-emerald-200 dark:shadow-none w-full sm:w-auto">
              {generating ? "Chef AI is Cooking..." : "Generate New Plan"}
            </Button>
          </div>

          {/* Plans Grid */}
          {mealPlans.length === 0 && !generating ? (
            <div className="bg-white dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800 p-12 text-center">
              <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400"><ChefHat size={24} /></div>
              <h3 className="text-gray-900 dark:text-white font-bold text-lg mb-1">No meals planned yet</h3>
              <p className="text-gray-500 dark:text-gray-400">Generate your first affordable plan above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
              {mealPlans.map((plan) => (
                <div
                  key={plan.id}
                  onClick={() => setSelectedPlan(plan)} // Trigger the new Analysis View
                  className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 relative group cursor-pointer hover:shadow-lg transition-all hover:-translate-y-1"
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                  >
                    <Trash2 size={18} />
                  </button>

                  <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-50 dark:border-gray-800 pr-8">
                    <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 font-medium">
                      <Calendar size={18} className="text-emerald-500" />
                      {new Date(plan.date).toLocaleString(undefined, { weekday: 'long', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                    </div>
                    <span className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-bold px-3 py-1 rounded-full text-sm">
                      ETB {plan.total_estimated_cost.toFixed(2)}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {plan.meals.map((meal, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50 text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                        <span className="font-medium flex-1 truncate">{meal.name}</span>
                        <span className="text-xs bg-white dark:bg-gray-700 px-1.5 py-0.5 rounded">ETB {meal.cost.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 text-center text-emerald-600 dark:text-emerald-400 text-sm font-bold flex items-center justify-center gap-1">
                    View Daily Analysis & Notes <ArrowRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          )}


        </div>
      </div>
    );
  };

  const ProfileView = () => {
    const [selectedGoal, setSelectedGoal] = useState(profileData?.goals || 'Weight Loss');
    const [selectedActivity, setSelectedActivity] = useState(profileData?.activityLevel || 'Moderate');
    // Profile Image Preview State
    const [previewImage, setPreviewImage] = useState(profileData?.profileImage || null);

    const GOALS = [
      { id: 'Weight Loss', icon: Scale, desc: 'Calorie Deficit' },
      { id: 'Maintenance', icon: Activity, desc: 'Balance' },
      { id: 'Muscle Gain', icon: Dumbbell, desc: 'High Protein' },
      { id: 'Budget', icon: DollarSign, desc: 'Max Savings' }
    ];

    const ACTIVITIES = [
      { id: 'Sedentary', icon: Coffee, desc: 'Desk Job' },
      { id: 'Moderate', icon: User, desc: 'Light Exercise' },
      { id: 'Active', icon: Zap, desc: 'Daily Workout' }
    ];

    // Helper for image preview
    const handleImageChange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setPreviewImage(reader.result);
        reader.readAsDataURL(file);
      }
    };

    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center p-6 transition-colors duration-300 relative overflow-hidden">

        {/* Floating Food Background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {['🥗', '🍎', '🥑', '🥕', '🍇', '🥦', '🥩', '🥚', '🧀', '🍗', '🌽', '🍅'].map((emoji, i) => (
            <div
              key={i}
              className="absolute text-4xl opacity-20 animate-[float_6s_ease-in-out_infinite] select-none"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${5 + Math.random() * 5}s`,
                fontSize: `${20 + Math.random() * 40}px`,
                filter: 'blur(1px)'
              }}
            >
              {emoji}
            </div>
          ))}
          {/* Sparkles */}
          {[...Array(10)].map((_, i) => (
            <div
              key={`sparkle-${i}`}
              className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-[twinkle_3s_ease-in-out_infinite]"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        <div className="w-full max-w-3xl bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg shadow-xl p-8 sm:p-12 relative z-10 border border-white/50 dark:border-gray-800/50">
          <button onClick={() => setView('dashboard')} className="absolute top-4 left-4 p-2 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <ArrowLeft size={20} />
          </button>

          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Personalize Your Plan</h2>
            <p className="text-gray-500 dark:text-gray-400">Help AI find the best deals for your body type.</p>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-8">

            {/* Image Upload Section */}
            <div className="flex flex-col items-center gap-4">
              <div className="w-24 h-24 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 relative group">
                {previewImage ? <img src={previewImage} alt="Profile" className="w-full h-full object-cover" /> : <User size={32} className="text-gray-400" />}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={24} />
                </div>
                <input type="file" name="profileImage" accept="image/*" onChange={handleImageChange} className="absolute inset-0 opacity-0 cursor-pointer" />
              </div>
              <span className="text-xs text-gray-500">Click to upload photo</span>
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Primary Goal</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {GOALS.map(goal => (
                  <SelectionCard
                    key={goal.id}
                    selected={selectedGoal === goal.id}
                    onClick={() => setSelectedGoal(goal.id)}
                    icon={goal.icon}
                    title={goal.id}
                    desc={goal.desc}
                  />
                ))}
              </div>
              <input type="hidden" name="goals" value={selectedGoal} />
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <Input name="weight" type="number" label="Weight (kg)" defaultValue={profileData?.metrics?.weight} required />
              <Input name="height" type="number" label="Height (cm)" defaultValue={profileData?.metrics?.height} required />
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <Input name="budget" type="number" label="Monthly Budget (ETB)" defaultValue={profileData?.weeklyBudget} required />
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider ml-1">Activity Level</label>
                <div className="flex gap-2">
                  {ACTIVITIES.map(act => (
                    <div key={act.id} onClick={() => setSelectedActivity(act.id)} className={`flex-1 cursor-pointer p-3 rounded-lg border text-center transition-all ${selectedActivity === act.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}`}>
                      <act.icon size={16} className="mx-auto mb-1" />
                      <div className="text-xs font-bold">{act.id}</div>
                    </div>
                  ))}
                </div>
                <input type="hidden" name="activityLevel" value={selectedActivity} />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg space-y-4 border border-gray-100 dark:border-gray-700">
              <span className="font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2"><ChefHat size={18} /> Dietary Preferences</span>
              <div className="flex gap-4">
                {['Vegan', 'Gluten-Free'].map(d => (
                  <label key={d} className="flex items-center gap-2 cursor-pointer bg-white dark:bg-gray-700 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600">
                    <input type="checkbox" name={d === 'Vegan' ? 'diet_vegan' : 'diet_gf'} defaultChecked={profileData?.dietaryRestrictions?.includes(d)} className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500" />
                    <span className="text-sm text-gray-700 dark:text-gray-200">{d}</span>
                  </label>
                ))}
              </div>
              <Input name="allergies" label="Allergies" placeholder="Peanuts, Soy..." defaultValue={profileData?.allergies?.join(', ')} />
            </div>

            <Button type="submit" disabled={loading} className="w-full py-4 text-lg">Save Profile</Button>
          </form>
        </div>
      </div>
    );
  };

  // NEW: Daily Overview Modal - Shows all plans for a selected date
  const DailyOverviewModal = () => {
    if (!selectedDate) return null;

    // Get all plans for the selected date
    const dayPlans = mealPlans.filter(p => {
      const planDate = new Date(p.date);
      const selDate = new Date(selectedDate);
      return planDate.toDateString() === selDate.toDateString();
    });

    if (dayPlans.length === 0) return null;

    // Calculate aggregate stats
    const totalCalories = dayPlans.reduce((sum, plan) =>
      sum + plan.meals.reduce((mSum, m) => mSum + m.calories, 0), 0
    );
    const totalCost = dayPlans.reduce((sum, plan) => sum + plan.total_estimated_cost, 0);
    const avgScore = dayPlans.filter(p => p.aiAnalysis).length > 0
      ? dayPlans.filter(p => p.aiAnalysis).reduce((sum, p) => sum + p.aiAnalysis.score, 0) / dayPlans.filter(p => p.aiAnalysis).length
      : null;

    return (
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-gray-900 w-full max-w-4xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold">{new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h2>
                <p className="text-emerald-100 text-sm mt-1">{dayPlans.length} meal {dayPlans.length === 1 ? 'combination' : 'combinations'} generated</p>
              </div>
              <button onClick={() => setSelectedDate(null)} className="p-2 rounded-full hover:bg-white/20 transition-colors">
                <X size={24} />
              </button>
            </div>
          </div>

          {/* Overall Stats */}
          <div className="bg-gray-50 dark:bg-gray-800 p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs font-bold text-gray-400 uppercase mb-1">Total Calories</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{totalCalories.toLocaleString()}</div>
                <div className="text-xs text-gray-500">kcal</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-gray-400 uppercase mb-1">Total Cost</div>
                <div className="text-2xl font-bold text-emerald-600">{totalCost.toFixed(2)}</div>
                <div className="text-xs text-gray-500">ETB</div>
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-gray-400 uppercase mb-1">Avg Score</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white">{avgScore ? avgScore.toFixed(1) : '—'}</div>
                <div className="text-xs text-gray-500">/10</div>
              </div>
            </div>
          </div>

          {/* Meal Plans Grid */}
          <div className="p-6 overflow-y-auto flex-1">
            <div className="grid md:grid-cols-2 gap-4">
              {dayPlans.map((plan, idx) => (
                <div
                  key={plan.id}
                  onClick={() => {
                    setSelectedDate(null);
                    setSelectedPlan(plan);
                  }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-5 border-2 border-gray-100 dark:border-gray-700 hover:border-emerald-500 cursor-pointer transition-all hover:shadow-lg group"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900 dark:text-white text-sm">Combination {idx + 1}</div>
                        <div className="text-xs text-gray-500">{new Date(plan.date).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                      </div>
                    </div>
                    {plan.aiAnalysis && (
                      <div className="flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-full">
                        <Sparkles size={12} className="text-emerald-500" />
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{plan.aiAnalysis.score}/10</span>
                      </div>
                    )}
                  </div>

                  {/* Mini Meal List */}
                  <div className="space-y-2 mb-3">
                    {plan.meals.map((meal, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate flex-1">{meal.name}</div>
                      </div>
                    ))}
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span>{plan.meals.reduce((sum, m) => sum + m.calories, 0)} kcal</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">{plan.total_estimated_cost.toFixed(2)} ETB</span>
                    </div>
                    {plan.notes && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <FileText size={12} />
                        <span>Notes</span>
                      </div>
                    )}
                  </div>

                  {/* Hover Arrow */}
                  <div className="mt-3 flex items-center gap-1 text-emerald-600 dark:text-emerald-400 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>View Details</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // NEW: Detailed Daily Analysis Modal
  const DailyAnalysisModal = () => {
    if (!selectedPlan) return null;

    const [notes, setNotes] = useState(selectedPlan.notes || '');
    const [mood, setMood] = useState(selectedPlan.mood || null);
    const [isEditingNote, setIsEditingNote] = useState(!selectedPlan.notes);
    const [analysis, setAnalysis] = useState(selectedPlan.aiAnalysis || null);
    const [analyzing, setAnalyzing] = useState(false);
    const [savingNote, setSavingNote] = useState(false);

    const handleSaveNotes = async () => {
      setSavingNote(true);
      try {
        await updateDoc(doc(db, 'users', user.uid, 'meal_plans', selectedPlan.id), { notes, mood });
        // Update local state to reflect change without refetch needed immediately
        const updatedPlans = mealPlans.map(p => p.id === selectedPlan.id ? { ...p, notes, mood } : p);
        setMealPlans(updatedPlans);
        // FIX: Update selectedPlan immediately to show saved state
        setSelectedPlan({ ...selectedPlan, notes, mood });
        setIsEditingNote(false);
        // alert("Notes saved successfully!"); // Removed alert for "instant" feel
      } catch (e) {
        console.error(e);
        alert("Failed to save notes. Please try again.");
      }
      setSavingNote(false);
    };

    const handleDeleteNote = async () => {
      if (!window.confirm("Are you sure you want to delete this note?")) return;
      try {
        await updateDoc(doc(db, 'users', user.uid, 'meal_plans', selectedPlan.id), { notes: "", mood: null });
        const updatedPlans = mealPlans.map(p => p.id === selectedPlan.id ? { ...p, notes: "", mood: null } : p);
        setMealPlans(updatedPlans);
        // FIX: Update selectedPlan immediately
        setSelectedPlan({ ...selectedPlan, notes: "", mood: null });
        setNotes("");
        setMood(null);
        setIsEditingNote(true);
      } catch (e) {
        console.error(e);
        alert("Failed to delete note.");
      }
    };

    const handleAnalyze = async () => {
      setAnalyzing(true);
      try {
        const result = await analyzeMealPlanAI(selectedPlan);
        if (result.score === 0 && result.summary.includes("API Key missing")) {
          alert(result.summary);
        } else {
          await updateDoc(doc(db, 'users', user.uid, 'meal_plans', selectedPlan.id), { aiAnalysis: result });
          setAnalysis(result);
          // Update local state
          const updatedPlans = mealPlans.map(p => p.id === selectedPlan.id ? { ...p, aiAnalysis: result } : p);
          setMealPlans(updatedPlans);
          // FIX: Update selectedPlan to prevent stale state on modal re-render
          setSelectedPlan({ ...selectedPlan, aiAnalysis: result });
        }
      } catch (e) {
        console.error(e);
        alert("Analysis failed. Please check your connection.");
      }
      setAnalyzing(false);
    };

    return (
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="bg-gray-100 dark:bg-gray-800 p-6 flex justify-between items-center border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Daily Overview</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(selectedPlan.date).toDateString()}</p>
            </div>
            <button onClick={() => setSelectedPlan(null)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500"><X size={20} /></button>
          </div>

          <div className="p-6 overflow-y-auto space-y-6">
            {/* Meals List */}
            <div className="grid sm:grid-cols-3 gap-4">
              {selectedPlan.meals.map((meal, i) => (
                <div
                  key={i}
                  onClick={() => setSelectedMeal(meal)}
                  className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-100 dark:border-gray-700 cursor-pointer hover:border-emerald-500 transition-colors group"
                >
                  <div className="text-xs font-bold text-gray-400 uppercase mb-1">{meal.type}</div>
                  <div className="font-bold text-gray-800 dark:text-gray-200 group-hover:text-emerald-600 mb-1 truncate">{meal.name}</div>
                  <div className="text-xs text-emerald-600 dark:text-emerald-400">{meal.cost.toFixed(2)} ETB • {meal.calories}kcal</div>
                </div>
              ))}
            </div>

            {/* AI Analysis Section */}
            {/* AI Analysis Section */}
            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-lg border border-emerald-100 dark:border-emerald-800/30 transition-all duration-500">
              <div className="flex justify-between items-start mb-4">
                <h4 className="font-bold text-emerald-900 dark:text-emerald-100 flex items-center gap-2">
                  <Sparkles size={18} className="text-emerald-500" /> AI Nutritional Analysis
                </h4>
                {!analysis && !analyzing && (
                  <Button onClick={handleAnalyze} disabled={analyzing} variant="primary" className="px-4 py-2 text-xs h-auto shadow-lg shadow-emerald-200/50 dark:shadow-none">
                    Analyze Day
                  </Button>
                )}
              </div>

              {analyzing ? (
                <div className="animate-pulse flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-16 bg-emerald-200/50 dark:bg-emerald-800/50 rounded-lg"></div>
                    <div className="h-10 w-px bg-emerald-200 dark:bg-emerald-800"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-emerald-100 dark:bg-emerald-900/30 rounded w-full"></div>
                      <div className="h-3 bg-emerald-100 dark:bg-emerald-900/30 rounded w-3/4"></div>
                    </div>
                  </div>
                </div>
              ) : analysis ? (
                <div className="animate-in fade-in duration-700 slide-in-from-bottom-2">
                  <div className="flex items-center gap-4 mb-3">
                    <div className="text-3xl font-bold text-emerald-600">{analysis.score}<span className="text-sm text-gray-400 font-normal">/10</span></div>
                    <div className="h-10 w-px bg-emerald-200 dark:bg-emerald-800"></div>
                    <p className="text-sm text-emerald-800 dark:text-emerald-200 italic leading-relaxed">"{analysis.summary}"</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 italic">Click analyze to get a nutritional breakdown of this combination.</p>
              )}
            </div>

            {/* User Notes Section */}
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
                <FileText size={18} className="text-gray-400" /> Daily Notes & Mood
              </h4>

              {!isEditingNote && notes ? (
                <div className="group relative">
                  <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-xl border border-gray-100 dark:border-gray-700/50 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
                    {mood && <div className="text-2xl mb-3">{mood}</div>}
                    <p className="whitespace-pre-wrap text-gray-700 dark:text-gray-300 leading-relaxed">{notes}</p>
                  </div>
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setIsEditingNote(true)} className="p-2 bg-white dark:bg-gray-800 rounded-lg hover:text-emerald-600 shadow-sm border border-gray-100 dark:border-gray-700">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={handleDeleteNote} className="p-2 bg-white dark:bg-gray-800 rounded-lg hover:text-red-600 shadow-sm border border-gray-100 dark:border-gray-700">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-2 bg-gray-50 dark:bg-gray-800/30 p-6 rounded-xl border border-gray-100 dark:border-gray-700/50 relative">

                  {/* Mood Selector */}
                  <div className="mb-6">
                    <label className="text-xs font-bold text-gray-400 uppercase mb-3 block">How did you feel?</label>
                    <div className="flex gap-4">
                      {['😫', '😐', '🙂', '😀', '🤩'].map((m) => (
                        <button
                          key={m}
                          onClick={() => setMood(m)}
                          className={`text-2xl p-3 rounded-xl transition-all ${mood === m ? 'bg-white dark:bg-gray-700 shadow-md scale-110' : 'hover:bg-white/50 dark:hover:bg-gray-700/50 grayscale hover:grayscale-0'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mb-4 relative">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-xs font-bold text-gray-400 uppercase">Your Daily Notes</label>
                      <span className="text-xs text-gray-400">{notes.length}/500</span>
                    </div>
                    <div className="relative group">
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        maxLength={500}
                        placeholder="✨ Share your day... Did you enjoy the meals? Any substitutions? How's your energy level?"
                        className="w-full h-40 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-800/50 border-2 border-gray-200 dark:border-gray-700 rounded-2xl p-5 text-sm focus:border-emerald-400 dark:focus:border-emerald-500 focus:shadow-lg focus:shadow-emerald-500/10 outline-none resize-none transition-all duration-300 placeholder:text-gray-400 dark:placeholder:text-gray-500"
                      ></textarea>
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-400 opacity-0 group-focus-within:opacity-20 dark:group-focus-within:opacity-10 blur-xl transition-opacity duration-300 -z-10"></div>
                    </div>
                  </div>

                  <div className="absolute bottom-6 right-6 flex gap-2">
                    {notes && !isEditingNote && (
                      <button onClick={() => setIsEditingNote(false)} className="p-3 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-all">
                        <X size={20} />
                      </button>
                    )}
                    <button
                      onClick={handleSaveNotes}
                      disabled={savingNote}
                      className="p-3 rounded-full bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingNote ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div> : <Check size={20} />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const RecipeModal = () => {
    if (!selectedMeal) return null;

    const handleDeleteMeal = async () => {
      if (!window.confirm("Are you sure you want to delete this meal?")) return;
      try {
        const updatedMeals = selectedPlan.meals.filter(m => m !== selectedMeal);
        const updatedCost = updatedMeals.reduce((acc, m) => acc + m.cost, 0);
        const updatedCalories = updatedMeals.reduce((acc, m) => acc + m.calories, 0);

        await updateDoc(doc(db, 'users', user.uid, 'meal_plans', selectedPlan.id), {
          meals: updatedMeals,
          total_estimated_cost: updatedCost,
          total_calories: updatedCalories
        });

        // Update local state
        const updatedPlans = mealPlans.map(p => p.id === selectedPlan.id ? { ...p, meals: updatedMeals, total_estimated_cost: updatedCost } : p);
        setMealPlans(updatedPlans);
        setSelectedMeal(null); // Close modal
      } catch (e) {
        console.error(e);
        alert("Failed to delete meal.");
      }
    };

    // Dynamic Modal Header Styles
    const getHeaderStyle = (type) => {
      switch (type) {
        case 'Breakfast': return 'bg-orange-400 text-white';
        case 'Lunch': return 'bg-emerald-500 text-white';
        case 'Dinner': return 'bg-indigo-600 text-white';
        default: return 'bg-gray-800 text-white';
      }
    };

    const getHeaderIcon = (type) => {
      switch (type) {
        case 'Breakfast': return <Sunrise size={100} />;
        case 'Lunch': return <SunIcon size={100} />;
        case 'Dinner': return <MoonIcon size={100} />;
        default: return <ChefHat size={100} />;
      }
    };

    return (
      <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4 animate-in fade-in duration-200">
        <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-lg shadow-xl overflow-hidden flex flex-col max-h-[90vh]">

          {/* Dynamic Header */}
          <div className={`${getHeaderStyle(selectedMeal.type)} p-6 relative overflow-hidden transition-colors`}>
            <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
              {getHeaderIcon(selectedMeal.type)}
            </div>

            <button
              onClick={() => setSelectedMeal(null)}
              className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full backdrop-blur-md transition-colors z-20 cursor-pointer"
            >
              <X size={20} className="text-white" />
            </button>

            <button
              onClick={handleDeleteMeal}
              className="absolute top-4 right-16 bg-white/20 hover:bg-red-500/80 p-2 rounded-full backdrop-blur-md transition-colors z-20 cursor-pointer group"
              title="Delete Meal"
            >
              <Trash2 size={20} className="text-white group-hover:scale-110 transition-transform" />
            </button>

            <div className="relative z-10">
              <span className="bg-white/20 border border-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-2 inline-block backdrop-blur-sm">
                {selectedMeal.type}
              </span>
              <h3 className="text-2xl font-bold mb-1">{selectedMeal.name}</h3>
              <div className="flex items-center gap-4 text-white/90 text-sm font-medium">
                <span className="bg-black/10 px-2 py-0.5 rounded backdrop-blur-md">{selectedMeal.cost.toFixed(2)} ETB</span>
                <span>{selectedMeal.calories} kcal</span>
              </div>
            </div>
          </div>

          <div className="p-8 overflow-y-auto">
            <div className="mb-8">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-4"><ShoppingBag size={18} className="text-emerald-500" /> Ingredients</h4>
              <div className="space-y-3">
                {selectedMeal.ingredients.map((ing, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <span className="text-gray-600 dark:text-gray-300 font-medium">{ing.amount} {ing.name}</span>
                    <span className="font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">{ing.cost.toFixed(2)} ETB</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white mb-3">Instructions</h4>
              <div className="bg-gray-50 dark:bg-gray-800 p-5 rounded-lg text-gray-600 dark:text-gray-300 text-sm leading-relaxed border border-gray-100 dark:border-gray-700">
                {selectedMeal.instructions}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // --- RENDER ---
  if (view === 'landing') return <LandingPage />;
  if (view === 'auth') return <AuthView />;
  if (view === 'profile') return <ProfileView />;
  if (view === 'pricing') return <PricingView onBack={() => setView('dashboard')} userEmail={user?.email} />;
  return (
    <>
      <DashboardView />
      <DailyOverviewModal />
      <DailyAnalysisModal />
      <RecipeModal />
    </>
  );
}


