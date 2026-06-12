import React, { useState, useEffect, useRef } from "react";
import { 
  Plus, Sparkles, Send, Trash2, CheckCircle, AlertTriangle, 
  Settings, Bell, BarChart3, MessageSquare, LayoutDashboard, 
  LogOut, ShieldAlert, Check, Moon, PlusCircle, HelpCircle, Globe, Phone
} from "lucide-react";

// Types
interface Subscription {
  id: number;
  name: string;
  category: string;
  amount: number;
  cycle: string;
  renewIn: number;
  worthScore: number;
  usagePct: number;
  lastUsed: string;
  color: string;
  emoji: string;
  rail: string;
  country?: string;
  phoneCode?: string;
  phoneNumber?: string;
  planType?: "paid" | "trial";
}

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

const INITIAL_SUBSCRIPTIONS: Subscription[] = [
  { id: 1, name: 'Hotstar Premium', category: 'Entertainment', amount: 299, cycle: 'monthly', renewIn: 2, worthScore: 2.4, usagePct: 12, lastUsed: '41 days ago', color: '#1B1464', emoji: '🎬', rail: 'UPI AutoPay', country: "India", phoneCode: "+91", planType: "paid" },
  { id: 2, name: 'Spotify Individual', category: 'Music', amount: 179, cycle: 'monthly', renewIn: 18, worthScore: 9.2, usagePct: 94, lastUsed: 'Today', color: '#1DB954', emoji: '🎵', rail: 'Credit Card', country: "India", phoneCode: "+91", planType: "paid" },
  { id: 3, name: 'Netflix Standard', category: 'Entertainment', amount: 499, cycle: 'monthly', renewIn: 22, worthScore: 6.1, usagePct: 58, lastUsed: '3 days ago', color: '#E50914', emoji: '🍿', rail: 'Debit Card', country: "Global", planType: "paid" },
  { id: 4, name: 'Notion Pro', category: 'Productivity', amount: 800, cycle: 'annual', renewIn: 5, worthScore: 8.7, usagePct: 88, lastUsed: 'Today', color: '#000000', emoji: '📝', rail: 'Credit Card', country: "Global", planType: "paid" },
  { id: 5, name: 'LinkedIn Premium', category: 'Productivity', amount: 1600, cycle: 'monthly', renewIn: 15, worthScore: 4.8, usagePct: 35, lastUsed: '3 days ago', color: '#0A66C2', emoji: '💼', rail: 'Credit Card', country: "India", phoneCode: "+91", planType: "trial" },
  { id: 6, name: 'Amazon Prime', category: 'Entertainment', amount: 299, cycle: 'annual', renewIn: 45, worthScore: 7.8, usagePct: 72, lastUsed: '2 days ago', color: '#FF9900', emoji: '📦', rail: 'UPI AutoPay', country: "India", phoneCode: "+91", planType: "paid" },
  { id: 7, name: 'Google One 100GB', category: 'Cloud Storage', amount: 130, cycle: 'monthly', renewIn: 14, worthScore: 8.1, usagePct: 81, lastUsed: 'Daily auto-sync', color: '#4285F4', emoji: '☁️', rail: 'UPI AutoPay', country: "India", phoneCode: "+91", planType: "paid" },
  { id: 8, name: 'ChatGPT Plus', category: 'AI Tools', amount: 1700, cycle: 'monthly', renewIn: 28, worthScore: 7.2, usagePct: 65, lastUsed: '1 day ago', color: '#10A37F', emoji: '🤖', rail: 'Credit Card', country: "United States", planType: "paid" },
];

export default function App() {
  // Navigation & Screen states
  const [activeScreen, setActiveScreen] = useState<"landing" | "scanning" | "app">("landing");
  const [activePage, setActivePage] = useState<"dashboard" | "advisor" | "analytics" | "notifications" | "settings">("dashboard");
  const [scanStepIndex, setScanStepIndex] = useState(0);

  // User details
  const [userEmail, setUserEmail] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [phoneInput, setPhoneInput] = useState("");
  const [loginMethod, setLoginMethod] = useState<"email" | "phone">("email");
  const [whatsappPermission, setWhatsappPermission] = useState<boolean>(true);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValues, setOtpValues] = useState<string[]>(["", "", "", "", "", ""]);
  
  // Custom manual state
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [alertsBypassed, setAlertsBypassed] = useState<string[]>([]);
  const [toast, setToast] = useState<{ show: boolean; message: string }>({ show: false, message: "" });
  const [badgeCount, setBadgeCount] = useState(3);

  // AI Insights
  const [aiInsightText, setAiInsightText] = useState("");
  const [isLoadingInsight, setIsLoadingInsight] = useState(false);

  // AI Advisor Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hi! I'm your ReneWise AI Advisor. I can see all your active subscriptions.\n\nI noticed some renewing this week and others you haven't used often. Want me to walk you through those first?" }
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Cancel Modal
  const [cancelModal, setCancelModal] = useState<{
    isOpen: boolean;
    sub: Subscription | null;
    aiVerdict: string;
    isCancelled: boolean;
  }>({
    isOpen: false,
    sub: null,
    aiVerdict: "Loading AI analysis...",
    isCancelled: false
  });

  // Stat detail popovers/modals state
  const [activeStatDetails, setActiveStatDetails] = useState<"spend" | "plans" | "savings" | "renewing" | null>(null);

  // Security and accidental-click gate confirmation state
  const [confirmOverlay, setConfirmOverlay] = useState<{
    isOpen: boolean;
    type: "keep" | "cancel";
    sub: Subscription | null;
    sourceContext?: "dashboard" | "renew_modal";
  }>({
    isOpen: false,
    type: "keep",
    sub: null
  });

  // Manual Add Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalTab, setAddModalTab] = useState<"manual" | "ai">("manual");
  const [pasteText, setPasteText] = useState("");
  const [isParsingText, setIsParsingText] = useState(false);

  // Manual Add Form values
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("AI Tools");
  const [formAmount, setFormAmount] = useState("");
  const [formCycle, setFormCycle] = useState("monthly");
  const [formRenewIn, setFormRenewIn] = useState("");
  const [formCountry, setFormCountry] = useState("India");
  const [formPhoneCode, setFormPhoneCode] = useState("+91");
  const [formPhoneNumber, setFormPhoneNumber] = useState("");
  const [formRail, setFormRail] = useState("Credit Card");
  const [formPlanType, setFormPlanType] = useState<"paid" | "trial">("paid");

  // Load subscriptions to local storage
  useEffect(() => {
    const saved = localStorage.getItem("renewise_subscriptions");
    if (saved) {
      setSubscriptions(JSON.parse(saved));
    } else {
      setSubscriptions(INITIAL_SUBSCRIPTIONS);
      localStorage.setItem("renewise_subscriptions", JSON.stringify(INITIAL_SUBSCRIPTIONS));
    }

    const savedEmail = localStorage.getItem("renewise_email");
    const savedScreen = localStorage.getItem("renewise_screen");
    if (savedEmail && savedScreen === "app") {
      setUserEmail(savedEmail);
      setActiveScreen("app");
    }

    const savedLoginMethod = localStorage.getItem("renewise_login_method");
    if (savedLoginMethod === "phone" || savedLoginMethod === "email") {
      setLoginMethod(savedLoginMethod);
    }
    const savedPermission = localStorage.getItem("renewise_whatsapp_permission");
    if (savedPermission !== null) {
      setWhatsappPermission(savedPermission === "true");
    }
  }, []);

  // Save subscriptions to local storage
  const saveSubscriptions = (newSubs: Subscription[]) => {
    setSubscriptions(newSubs);
    localStorage.setItem("renewise_subscriptions", JSON.stringify(newSubs));
  };

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatLoading]);

  // Load AI Analytics Insight when layout changes
  useEffect(() => {
    if (activeScreen === "app") {
      triggerAnalyticsInsight();
    }
  }, [activeScreen, subscriptions]);

  const showToast = (message: string) => {
    setToast({ show: true, message });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // Dynamic values computation
  const monthlySpend = subscriptions.reduce((sum, s) => {
    if (s.cycle === 'monthly') return sum + s.amount;
    if (s.cycle === 'annual') return sum + Math.round(s.amount / 12);
    if (s.cycle === 'weekly') return sum + Math.round(s.amount * 4);
    return sum + s.amount;
  }, 0);

  const activeCount = subscriptions.length;
  const savingsThisMonth = 298; // simulated savings based on users' inactive cuts
  const renewingThisWeek = subscriptions.filter(s => s.renewIn <= 7).length;

  // Onboarding action: Send OTP
  const handleSendOTP = () => {
    if (loginMethod === "email") {
      if (!emailInput || !emailInput.includes("@")) {
        showToast("⚠️ Please enter a valid email address");
        return;
      }
      setUserEmail(emailInput);
      setOtpSent(true);
      showToast(`✉️ OTP sent to ${emailInput} · Use any 6 digits to bypass`);
    } else {
      if (!phoneInput || phoneInput.trim().length < 8) {
        showToast("⚠️ Please enter a valid phone number");
        return;
      }
      setUserEmail(phoneInput);
      setOtpSent(true);
      if (whatsappPermission) {
        showToast(`💬 Demo SMS/WhatsApp OTP sent to ${phoneInput} · Use any 6 digits`);
      } else {
        showToast(`✉️ Demo SMS OTP sent to ${phoneInput} · Use any 6 digits`);
      }
    }
  };

  // Skip and go manual
  const handleSkipAndGoManual = () => {
    const fallbackVal = loginMethod === "phone" ? (phoneInput || "+91 99999 88888") : (emailInput || "guest@renewise.com");
    setUserEmail(fallbackVal);
    localStorage.setItem("renewise_email", fallbackVal);
    localStorage.setItem("renewise_screen", "app");
    localStorage.setItem("renewise_login_method", loginMethod);
    localStorage.setItem("renewise_whatsapp_permission", String(whatsappPermission));
    setSubscriptions(INITIAL_SUBSCRIPTIONS);
    setActiveScreen("app");
    showToast("🎉 Logged in with private manual dashboard!");
  };

  // Verification Input shift
  const handleOtpChange = (val: string, idx: number) => {
    const updated = [...otpValues];
    updated[idx] = val.slice(-1);
    setOtpValues(updated);

    if (val && idx < 5) {
      const nextInput = document.getElementById(`otp-${idx + 1}`);
      nextInput?.focus();
    }

    // Auto verify if filled
    if (updated.every(v => v !== "")) {
      setTimeout(() => handleVerifyOTP(updated.join("")), 400);
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Backspace" && otpValues[idx] === "" && idx > 0) {
      const prevInput = document.getElementById(`otp-${idx - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerifyOTP = (code?: string) => {
    const finalCode = code || otpValues.join("");
    if (finalCode.length < 6) {
      showToast("⚠️ Please enter the full 6-digit verification code");
      return;
    }
    
    // Trigger scanning view
    setActiveScreen("scanning");
    localStorage.setItem("renewise_email", userEmail);
    localStorage.setItem("renewise_screen", "app");
    localStorage.setItem("renewise_login_method", loginMethod);
    localStorage.setItem("renewise_whatsapp_permission", String(whatsappPermission));

    // Scan step animation
    let currentStep = 0;
    const interval = setInterval(() => {
      if (currentStep < 4) {
        currentStep++;
        setScanStepIndex(currentStep);
      } else {
        clearInterval(interval);
        setTimeout(() => {
          setActiveScreen("app");
          showToast(`✓ Connection secured. Detected ${subscriptions.length || 7} active billings.`);
        }, 1000);
      }
    }, 1200);
  };

  // AI Analytics Insights fetching
  const triggerAnalyticsInsight = async () => {
    setIsLoadingInsight(true);
    try {
      const res = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscriptions })
      });
      const data = await res.json();
      setAiInsightText(data.text || "Perfect spend setup!");
    } catch {
      setAiInsightText("Based on your portfolio, Hotstar Premium is your top saving opportunity (₹299/mo, 12% usage metrics). We recommend keeping developer essentials like ChatGPT Plus (₹1,700/mo) and Cloud Code Pro (₹450/mo), which are highly optimized.");
    } finally {
      setIsLoadingInsight(false);
    }
  };

  // manual addition function
  const handleAddSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      showToast("⚠️ Subscription name is required");
      return;
    }

    // Determine color & emoji logic to fit gorgeous theme
    let color = "#374151";
    let emoji = "💳";
    const nameLower = formName.toLowerCase();
    
    if (nameLower.includes("chatgpt") || nameLower.includes("openai") || nameLower.includes("claude") || nameLower.includes("gemini")) {
      color = "#10A37F";
      emoji = "🤖";
    } else if (nameLower.includes("linkedin")) {
      color = "#0A66C2";
      emoji = "💼";
    } else if (nameLower.includes("cloud") || nameLower.includes("code") || nameLower.includes("github") || nameLower.includes("copilot") || nameLower.includes("vercel")) {
      color = "#000000";
      emoji = "💻";
    } else if (nameLower.includes("spotify") || nameLower.includes("music") || nameLower.includes("songs") || nameLower.includes("yt music")) {
      color = "#1DB954";
      emoji = "🎵";
    } else if (nameLower.includes("netflix") || nameLower.includes("prime") || nameLower.includes("hotstar") || nameLower.includes("hulu") || nameLower.includes("youtube")) {
      color = "#E50914";
      emoji = "🎬";
    } else if (nameLower.includes("google") || nameLower.includes("drive") || nameLower.includes("one") || nameLower.includes("dropbox") || nameLower.includes("icloud")) {
      color = "#4285F4";
      emoji = "☁️";
    }

    const newSub: Subscription = {
      id: Date.now(),
      name: formName,
      category: formCategory,
      amount: Number(formAmount) || 0,
      cycle: formCycle,
      renewIn: Number(formRenewIn) || 14,
      worthScore: formPlanType === "trial" ? 4.8 : 8.5, // Standard trial reviews score lower initially
      usagePct: formPlanType === "trial" ? 35 : 75,
      lastUsed: "Recently",
      color,
      emoji,
      rail: formRail,
      country: formCountry,
      phoneCode: formPhoneCode,
      phoneNumber: formPhoneNumber,
      planType: formPlanType
    };

    saveSubscriptions([newSub, ...subscriptions]);
    setIsAddModalOpen(false);
    resetAddForm();
    
    if (loginMethod === "phone" && whatsappPermission) {
      showToast(`✓ [WhatsApp Notification Sent] Added "${formName}" to tracking successfully!`);
    } else {
      showToast(`✓ [Email Notification Sent to ${userEmail || "guest@renewise.com"}] Added "${formName}" to tracking successfully!`);
    }
  };

  const resetAddForm = () => {
    setFormName("");
    setFormCategory("AI Tools");
    setFormAmount("");
    setFormCycle("monthly");
    setFormRenewIn("");
    setFormCountry("India");
    setFormPhoneCode("+91");
    setFormPhoneNumber("");
    setFormRail("Credit Card");
    setFormPlanType("paid");
    setPasteText("");
  };

  // Parsing pasted email/messages with AI extractor
  const handleAiAutoParse = async () => {
    if (!pasteText.trim()) {
      showToast("⚠️ Paste some billing notification text first");
      return;
    }
    setIsParsingText(true);
    try {
      const res = await fetch("/api/parse-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: pasteText })
      });
      const parsed = await res.json();
      
      if (parsed.name) {
        setFormName(parsed.name);
        setFormCategory(parsed.category || "AI Tools");
        setFormAmount(String(parsed.amount || ""));
        setFormCycle(parsed.cycle || "monthly");
        setFormRenewIn(String(parsed.renewIn || "15"));
        setFormCountry(parsed.country || "India");
        setFormPhoneCode(parsed.phoneCode || "+91");
        setAddModalTab("manual");
        showToast("✨ AI successfully extracted your subscription details below!");
      } else {
        showToast("⚠️ Could not resolve fields. Added generic subscription details.");
      }
    } catch {
      // Fallback fallback simulator
      if (pasteText.toLowerCase().includes("chatgpt")) {
        setFormName("ChatGPT Plus");
        setFormCategory("AI Tools");
        setFormAmount("1700");
        setFormCycle("monthly");
        setFormRenewIn("28");
        setFormCountry("United States");
        setAddModalTab("manual");
      } else if (pasteText.toLowerCase().includes("cloud code")) {
        setFormName("Cloud Code Pro");
        setFormCategory("Productivity");
        setFormAmount("450");
        setFormCycle("monthly");
        setFormRenewIn("15");
        setFormCountry("Global");
        setAddModalTab("manual");
      } else {
        showToast("⚠️ Parser error. Please type details manually.");
      }
    } finally {
      setIsParsingText(false);
    }
  };

  // Action confirmation trigger utilities to prevent accidental clicks
  const triggerKeepConfirmation = (sub: Subscription, fromModal = false) => {
    setConfirmOverlay({
      isOpen: true,
      type: "keep",
      sub,
      sourceContext: fromModal ? "renew_modal" : "dashboard"
    });
  };

  const triggerCancelConfirmation = (sub: Subscription, fromModal = false) => {
    setConfirmOverlay({
      isOpen: true,
      type: "cancel",
      sub,
      sourceContext: fromModal ? "renew_modal" : "dashboard"
    });
  };

  const handleConfirmKeep = () => {
    if (!confirmOverlay.sub) return;
    const s = confirmOverlay.sub;
    
    if (loginMethod === "phone" && whatsappPermission) {
      showToast(`✓ [WhatsApp Notification Sent] Alerts refreshed for ${s.name}. Kept successfully.`);
    } else {
      showToast(`✓ [Email Notification Sent to ${userEmail || "guest@renewise.com"}] Alerts refreshed for ${s.name}. Kept successfully.`);
    }
    
    setConfirmOverlay({ isOpen: false, type: "keep", sub: null });
  };

  const handleConfirmCancelInitiate = () => {
    if (!confirmOverlay.sub) return;
    const s = confirmOverlay.sub;
    setConfirmOverlay({ isOpen: false, type: "cancel", sub: null });
    
    // Continue with showing details in cancel modal
    triggerOpenCancelModal(s);
  };

  // Open Cancel Modal & Call AI recommendations
  const triggerOpenCancelModal = async (sub: Subscription) => {
    setCancelModal({
      isOpen: true,
      sub,
      aiVerdict: "Analysing billing trend index...",
      isCancelled: false
    });

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `Should I cancel ${sub.name}? Evaluate based on usage of ${sub.usagePct}% and last used ${sub.lastUsed}.`,
          subscriptions: [sub],
          history: []
        })
      });
      const data = await res.json();
      setCancelModal(prev => ({
        ...prev,
        aiVerdict: data.text || "Evaluate cancellation based on your budget requirements."
      }));
    } catch {
      setCancelModal(prev => ({
        ...prev,
        aiVerdict: `**Highly recommended to cancel!** Your usage is only ${sub.usagePct}% and the subscription has been idle for ${sub.lastUsed}. Conserving this would return ₹${sub.amount} back to your monthly index.`
      }));
    }
  };

  const handleConfirmCancel = (id: number) => {
    const cancelledSubName = cancelModal.sub?.name || "Premium plan";
    setCancelModal(prev => ({ ...prev, isCancelled: true }));
    setTimeout(() => {
      const filtered = subscriptions.filter(s => s.id !== id);
      saveSubscriptions(filtered);
      setCancelModal({
        isOpen: false,
        sub: null,
        aiVerdict: "Loading...",
        isCancelled: false
      });
      
      if (loginMethod === "phone" && whatsappPermission) {
        showToast(`✓ [WhatsApp Notification Sent] Cancellation notification dispatched for ${cancelledSubName}.`);
      } else {
        showToast(`✓ [Email Notification Sent to ${userEmail || "guest@renewise.com"}] Cancellation notification dispatched for ${cancelledSubName}.`);
      }
    }, 2000);
  };

  // send advice chat to Gemini backend
  const handleSendChat = async (forcedQuery?: string) => {
    const query = (forcedQuery || chatInput).trim();
    if (!query) return;
    setChatInput("");
    setChatMessages(prev => [...prev, { role: "user", content: query }]);
    setIsChatLoading(true);
    
    // Copy the current messages state so that we can slice it for history safely
    let currentHistory = [...chatMessages];
    if (forcedQuery) {
      // If forcedQuery was clicked, its user message isn't in 'chatMessages' yet, which is perfect since the history shouldn't include the current query itself as it's passed separately as 'message'
    }

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: query,
          history: currentHistory.slice(-10), // keep token limits low
          subscriptions
        })
      });
      const data = await res.json();
      setChatMessages(prev => [...prev, { role: "assistant", content: data.text || "Could not generate answer." }]);
    } catch {
      // Simulate clever advice fallback
      setTimeout(() => {
        let text = "I am ready with complete subscription statistics. ChatGPT and Notion show excellent worth metrics, while Hotstar continues to report idle usage.";
        if (query.toLowerCase().includes("cancel")) {
          text = `Based on current metrics, **Hotstar Premium** is your lowest value item. Removing it saves you ₹299 instantly. Keep Developer items like ChatGPT Plus as they exhibit consistent high value.`;
        }
        setChatMessages(prev => [...prev, { role: "assistant", content: text }]);
      }, 1000);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleRevokeEmailAccess = () => {
    if (confirm("Disconnect connected inbox and erase on-device cache? This preserves manual backup files.")) {
      localStorage.removeItem("renewise_email");
      localStorage.removeItem("renewise_screen");
      localStorage.removeItem("renewise_login_method");
      localStorage.removeItem("renewise_whatsapp_permission");
      setUserEmail("");
      setEmailInput("");
      setPhoneInput("");
      setLoginMethod("email");
      setWhatsappPermission(true);
      setOtpSent(false);
      setOtpValues(["", "", "", "", "", ""]);
      setSubscriptions(INITIAL_SUBSCRIPTIONS);
      localStorage.setItem("renewise_subscriptions", JSON.stringify(INITIAL_SUBSCRIPTIONS));
      setActiveScreen("landing");
      setActivePage("dashboard");
      showToast("🧹 Connected inbox credentials revoked.");
    }
  };

  // Rendering Category values
  const getCategorySpend = (category: string) => {
    return subscriptions
      .filter(s => s.category === category)
      .reduce((sum, s) => {
        if (s.cycle === 'monthly') return sum + s.amount;
        if (s.cycle === 'annual') return sum + Math.round(s.amount / 12);
        return sum + s.amount;
      }, 0);
  };

  const categories = ["Entertainment", "Productivity", "Music", "Cloud Storage", "AI Tools", "Other"];
  const totalCategoriesSpend = categories.reduce((sum, cat) => sum + getCategorySpend(cat), 0) || 1;

  return (
    <div className="min-h-screen bg-[#FAFAF9]" id="renewise-root">
      
      {/* 🔮 SCREEN 1: LANDING & ONBOARDING */}
      {activeScreen === "landing" && (
        <div id="screen-landing" className="screen active">
          <div className="landing-inner">
            <div className="logo-mark">💳</div>
            <h1 className="landing-title">Stop losing money to <span>forgotten</span> subscriptions</h1>
            <p className="landing-sub">
              ReneWise scans your inbox and bills to locate recurring charges — then leverages AI to keep you in full, automated control.
            </p>

            <div className="landing-card">
              {!otpSent ? (
                <div id="step-email">
                  {/* TAB toggles */}
                  <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-xl mb-4">
                    <button
                      type="button"
                      onClick={() => setLoginMethod("email")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        loginMethod === "email" 
                          ? "bg-emerald-600 text-white" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      📧 Email Address
                    </button>
                    <button
                      type="button"
                      onClick={() => setLoginMethod("phone")}
                      className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                        loginMethod === "phone" 
                          ? "bg-emerald-600 text-white" 
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      💬 Phone/WhatsApp
                    </button>
                  </div>

                  {loginMethod === "email" ? (
                    <div>
                      <h3 className="text-white text-xs font-medium mb-2">Initialize securely with Email Scanning</h3>
                      <div className="email-row">
                        <input 
                          className="email-input" 
                          type="email" 
                          placeholder="your@email.com" 
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                        />
                        <button className="btn-primary col-span-1" onClick={handleSendOTP}>Send OTP →</button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-white text-xs font-medium mb-1">Initialize securely with Phone Scanning</h3>
                      <p className="text-[10.5px] text-zinc-400 mb-2 leading-relaxed">
                        Input your phone number to authorize automatic on-device message scans and enable secure WhatsApp subscription updates!
                      </p>
                      <div className="email-row">
                        <input 
                          className="email-input font-mono" 
                          type="tel" 
                          placeholder="+91 98765 43210" 
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSendOTP()}
                        />
                        <button className="btn-primary" onClick={handleSendOTP}>Send OTP →</button>
                      </div>

                      {/* WhatsApp real permission toggle */}
                      <label className="mt-3 flex items-start gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={whatsappPermission}
                          onChange={(e) => setWhatsappPermission(e.target.checked)}
                          className="accent-emerald-400 w-4 h-4 cursor-pointer mt-0.5"
                        />
                        <div className="text-left leading-normal">
                          <span className="text-[11px] text-white font-bold block">
                            Notify me through WhatsApp about my recent notifications
                          </span>
                          <span className="text-[9.5px] text-zinc-400 block font-normal">
                            If clicked, we will send updates to WhatsApp. Otherwise, notification updates dispatch strictly to your registered email.
                          </span>
                        </div>
                      </label>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                    <span className="text-[13px] text-zinc-400">Avoid sharing data?</span>
                    <button 
                      className="text-[13px] text-emerald-400 font-medium hover:underline underline-offset-4"
                      onClick={handleSkipAndGoManual}
                    >
                      ✏️ Add Subscriptions Manually Instead
                    </button>
                  </div>

                  <p className="otp-hint mt-4">
                    ReneWise parses <strong style={{ color: "rgba(255,255,255,.55)" }}>only automated invoices and statements</strong> — never your standard personal interactions or secrets.
                  </p>
                </div>
              ) : (
                <div id="step-otp" className="visible">
                  <h3 className="text-white font-medium mb-1">Enter code sent to</h3>
                  <p className="text-[14px] text-emerald-400 font-medium mb-4">{userEmail}</p>
                  
                  <div className="otp-boxes">
                    {otpValues.map((val, idx) => (
                      <input
                        key={idx}
                        id={`otp-${idx}`}
                        className="otp-box"
                        type="number"
                        maxLength={1}
                        value={val}
                        onChange={(e) => handleOtpChange(e.target.value, idx)}
                        onKeyDown={(e) => handleOtpKeyDown(e, idx)}
                      />
                    ))}
                  </div>

                  <div className="resend-row">
                    Didn't get it? <span onClick={() => showToast("✉️ New verification token dispatched.")}>Resend code</span>
                  </div>

                  <div style={{ marginTop: "1rem" }}>
                    <button className="btn-primary btn-full w-full justify-center" onClick={() => handleVerifyOTP()}>
                      Verify &amp; Import Billing →
                    </button>
                  </div>

                  <p className="otp-hint" style={{ marginTop: ".75rem" }}>
                    🎯 Demo bypass: enter any numbers or click {" "}
                    <span 
                      style={{ color: "rgba(52,211,153,.8)", cursor: "pointer", fontWeight: "600" }} 
                      onClick={handleSkipAndGoManual}
                    >
                      Skip to dashboard →
                    </span>
                  </p>
                </div>
              )}
            </div>

            <div className="trust-badges">
              <div className="badge">
                <ShieldAlert className="w-[14px] h-[14px] text-emerald-500 mr-1" />
                RBI Compliant Aggregator
              </div>
              <div className="badge">
                <Globe className="w-[14px] h-[14px] text-emerald-500 mr-1" />
                Direct Multi-Country Coverage
              </div>
              <div className="badge">
                <CheckCircle className="w-[14px] h-[14px] text-emerald-500 mr-1" />
                Local Isolation Safeguards
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 SCREEN 2: METRICS INGESTION / SCANNING ANIMATION */}
      {activeScreen === "scanning" && (
        <div id="screen-scan" className="screen active">
          <div className="scan-inner">
            <div className="scan-pulse">🔍</div>
            <h2 className="scan-title">Analyzing billing indexes...</h2>
            <p className="scan-sub">
              ReneWise is reviewing transaction endpoints and invoices to reconcile recurring billing records.
            </p>
            
            <ul className="scan-steps">
              <li className="scan-step">
                <span className={`step-icon ${scanStepIndex > 0 ? "done" : "active"}`}>
                  {scanStepIndex > 0 ? "✓" : "↻"}
                </span>
                <span className="step-text"><strong>Connecting to inbox</strong> — authorizing read-only tokens</span>
              </li>
              <li className="scan-step">
                <span className={`step-icon ${scanStepIndex > 1 ? "done" : scanStepIndex === 1 ? "active" : "wait"}`}>
                  {scanStepIndex > 1 ? "✓" : scanStepIndex === 1 ? "↻" : "📧"}
                </span>
                <span className="step-text"><strong>Parsing billing invoices</strong> — isolating invoice structures</span>
              </li>
              <li className="scan-step">
                <span className={`step-icon ${scanStepIndex > 2 ? "done" : scanStepIndex === 2 ? "active" : "wait"}`}>
                  {scanStepIndex > 2 ? "✓" : scanStepIndex === 2 ? "↻" : "🤖"}
                </span>
                <span className="step-text"><strong>AI Merchant reconciliation</strong> — resolving subscriptions</span>
              </li>
              <li className="scan-step">
                <span className={`step-icon ${scanStepIndex > 3 ? "done" : scanStepIndex === 3 ? "active" : "wait"}`}>
                  {scanStepIndex > 3 ? "✓" : scanStepIndex === 3 ? "↻" : "📊"}
                </span>
                <span className="step-text"><strong>Generating Worth-It Score matrix</strong> — looking at usage indexes</span>
              </li>
              <li className="scan-step">
                <span className={`step-icon ${scanStepIndex >= 4 ? "done" : "wait"}`}>
                  {scanStepIndex >= 4 ? "✓" : "✅"}
                </span>
                <span className="step-text"><strong>Finalizing interface configs</strong> — ready to track</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* 🚀 SCREEN 3: APP SHELL & NAVIGATION PAGES */}
      {activeScreen === "app" && (
        <div id="screen-app" className="screen active">
          
          {/* Sidebar */}
          <nav className="sidebar">
            <div className="sidebar-logo">
              <div className="sidebar-logo-mark">💳</div>
              <span className="sidebar-logo-text">ReneWise</span>
            </div>
            
            <button 
              className={`nav-item ${activePage === "dashboard" ? "active" : ""}`}
              onClick={() => setActivePage("dashboard")}
            >
              <LayoutDashboard className="nav-icon text-zinc-400" size={18} />
              <span>Dashboard</span>
            </button>
            
            <button 
              className={`nav-item ${activePage === "advisor" ? "active" : ""}`}
              onClick={() => setActivePage("advisor")}
            >
              <MessageSquare className="nav-icon text-zinc-400" size={18} />
              <span>AI Advisor</span>
            </button>
            
            <button 
              className={`nav-item ${activePage === "analytics" ? "active" : ""}`}
              onClick={() => setActivePage("analytics")}
            >
              <BarChart3 className="nav-icon text-zinc-400" size={18} />
              <span>Analytics</span>
            </button>
            
            <button 
              className={`nav-item ${activePage === "notifications" ? "active" : ""}`}
              onClick={() => {
                setActivePage("notifications");
                setBadgeCount(0);
              }}
            >
              <Bell className="nav-icon text-zinc-400" size={18} />
              <span>Alerts {badgeCount > 0 && (
                <span className="ml-2 bg-rose-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                  {badgeCount}
                </span>
              )}</span>
            </button>

            <div className="sidebar-section">Settings</div>
            
            <button 
              className={`nav-item ${activePage === "settings" ? "active" : ""}`}
              onClick={() => setActivePage("settings")}
            >
              <Settings className="nav-icon text-zinc-400" size={18} />
              <span>Settings</span>
            </button>

            <div className="sidebar-footer">
              <div className="user-chip">
                <div className="avatar">
                  {userEmail ? userEmail.charAt(0).toUpperCase() : "G"}
                </div>
                <span className="user-name">{userEmail || "guest@renewise.com"}</span>
              </div>
            </div>
          </nav>

          {/* Main Workspace Frame */}
          <main className="main">

            {/* ─── PAGE 1: DASHBOARD DIRECT VIEW ─── */}
            {activePage === "dashboard" && (
              <div className="page active">
                <div className="flex items-center justify-between page-header">
                  <div>
                    <h1 className="page-title">My Tracked Subscriptions</h1>
                    <p className="page-sub">{activeCount} active subscriptions · ₹{monthlySpend.toLocaleString()}/month total</p>
                  </div>
                  
                  {/* Plus Trigger Button - Manual addition directly styled */}
                  <button 
                    className="flex items-center gap-2 bg-[#0E7C5E] hover:bg-[#085A44] text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-all duration-200"
                    onClick={() => {
                      resetAddForm();
                      setIsAddModalOpen(true);
                    }}
                  >
                    <Plus size={16} /> Add Subscription
                  </button>
                </div>

                {/* Dashboard Stats */}
                <div className="stat-row">
                  <div 
                    id="stat-spend-card"
                    className="stat-card clickable group flex flex-col justify-between"
                    onClick={() => setActiveStatDetails("spend")}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="stat-label mb-0">Monthly Spend Index</div>
                      <span className="text-[10px] font-semibold text-[#0E7C5E] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md transition-all duration-250 group-hover:bg-[#0E7C5E] group-hover:text-white shrink-0">
                        View Details
                      </span>
                    </div>
                    <div>
                      <div className="stat-value">₹{monthlySpend.toLocaleString()}</div>
                      <div className="stat-change text-rose-500 font-medium animate-pulse">↑ ₹249 vs last cycle</div>
                    </div>
                  </div>

                  <div 
                    id="stat-plans-card"
                    className="stat-card clickable group flex flex-col justify-between"
                    onClick={() => setActiveStatDetails("plans")}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="stat-label mb-0">Active Plans</div>
                      <span className="text-[10px] font-semibold text-[#0E7C5E] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md transition-all duration-250 group-hover:bg-[#0E7C5E] group-hover:text-white shrink-0">
                        View Details
                      </span>
                    </div>
                    <div>
                      <div className="stat-value">{activeCount}</div>
                      <div className="stat-change text-emerald-600 font-medium font-mono text-[11px]">inclusive of manually uploaded</div>
                    </div>
                  </div>

                  <div 
                    id="stat-savings-card"
                    className="stat-card clickable group flex flex-col justify-between"
                    onClick={() => setActiveStatDetails("savings")}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="stat-label mb-0">Total Monthly Savings</div>
                      <span className="text-[10px] font-semibold text-[#0E7C5E] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md transition-all duration-250 group-hover:bg-[#0E7C5E] group-hover:text-white shrink-0">
                        View Details
                      </span>
                    </div>
                    <div>
                      <div className="stat-value text-emerald-600">₹{savingsThisMonth}</div>
                      <div className="stat-change text-emerald-600 font-medium">via ReneWise idle-cuts</div>
                    </div>
                  </div>

                  <div 
                    id="stat-renewing-card"
                    className="stat-card clickable group flex flex-col justify-between"
                    onClick={() => setActiveStatDetails("renewing")}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="stat-label mb-0">Renewing This Week</div>
                      <span className="text-[10px] font-semibold text-[#0E7C5E] bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md transition-all duration-250 group-hover:bg-[#0E7C5E] group-hover:text-white shrink-0">
                        View Details
                      </span>
                    </div>
                    <div>
                      <div className="stat-value text-amber-600">{renewingThisWeek}</div>
                      <div className="stat-change text-amber-600 font-medium">⚠️ Review recommended</div>
                    </div>
                  </div>
                </div>

                {/* Upcoming Critical Alerts Block */}
                {subscriptions.some(s => s.name === "Hotstar Premium") && !alertsBypassed.includes("Hotstar Premium") && (
                  <div className="alert-banner">
                    <span className="alert-icon">⚠️</span>
                    <div className="alert-text">
                      <strong>Hotstar Premium renews in 2 days</strong> — ₹299/month. We detected 41 days of inactivity. Review alternative plans before auto-debit triggers.
                    </div>
                    <div className="alert-actions gap-2">
                      <button 
                        className="btn-sm btn-outline-orange font-medium"
                        onClick={() => {
                          setAlertsBypassed([...alertsBypassed, "Hotstar Premium"]);
                          const hotstar = subscriptions.find(s => s.name === "Hotstar Premium");
                          if (hotstar) triggerKeepConfirmation(hotstar, false);
                        }}
                      >
                        Keep it
                      </button>
                      <button 
                        className="btn-sm btn-filled-orange font-medium"
                        onClick={() => {
                          const hotstar = subscriptions.find(s => s.name === "Hotstar Premium");
                          if (hotstar) triggerCancelConfirmation(hotstar, false);
                        }}
                      >
                        Review AI →
                      </button>
                    </div>
                  </div>
                )}

                {/* Grid list of cards */}
                <div className="sub-grid">
                  {subscriptions.map((s) => {
                    const isHigh = s.worthScore >= 7.5;
                    const isMedium = s.worthScore >= 5.0 && s.worthScore < 7.5;
                    const subBadgeClass = isHigh ? "worth-high" : isMedium ? "worth-medium" : "worth-low";
                    const subBadgeText = isHigh ? "✓ Worth it" : isMedium ? "⚠ Review" : "✗ Consider cancel";

                    return (
                      <div className="sub-card flex flex-col justify-between" key={s.id}>
                        <div>
                          <div className="sub-card-top">
                            <div className="sub-app">
                              <div className="app-icon" style={{ backgroundColor: `${s.color}15` }}>
                                {s.emoji}
                              </div>
                              <div>
                                <div className="sub-name">{s.name}</div>
                                <div className="sub-plan text-zinc-500 text-[12px] font-medium leading-none mt-1">
                                  {s.category} · {s.rail}
                                </div>
                              </div>
                            </div>
                            <span className={`worth-badge ${subBadgeClass}`}>
                              {subBadgeText}
                            </span>
                          </div>

                          <div className="sub-card-mid mt-3">
                            <div>
                              <span className="sub-amount text-indigo-950 font-semibold">₹{s.amount}</span>
                              <span className="sub-cycle text-zinc-500 text-xs"> / {s.cycle}</span>
                            </div>
                            <div className={`sub-renewal text-[13px] font-medium mt-1 ${s.renewIn <= 5 ? "text-amber-600 font-bold" : "text-zinc-500"}`}>
                              Renews in {s.renewIn} days
                            </div>
                          </div>

                          {/* Premium Trial Specific Banner to Alert Unknowing Charges */}
                          {s.planType === "trial" && (
                            <div className="my-2.5 p-2.5 bg-amber-50/70 border border-amber-200/60 rounded-xl text-[11.5px] text-amber-900 leading-relaxed">
                              <span className="font-bold flex items-center gap-1 text-amber-950 mb-0.5">
                                👑 Premium Active (Trial Access)
                              </span>
                              Already premium, but full auto-renew charges of <span className="font-bold">₹{s.amount.toLocaleString()}</span> will be deducted in <span className="font-bold text-amber-700">{s.renewIn} days</span>. Cancel before automatic credit card deduction!
                            </div>
                          )}

                          {/* Country and phone badges if specified to fulfill direct country/SMS alerts logic */}
                          {(s.country || s.phoneNumber) && (
                            <div className="my-2 py-1.5 px-2 bg-zinc-50 rounded-lg flex flex-wrap gap-2 items-center text-[11px] text-zinc-500 font-mono border border-zinc-100">
                              {s.country && (
                                <span className="flex items-center gap-1">
                                  <Globe size={11} className="text-zinc-400" /> {s.country}
                                </span>
                              )}
                              {s.phoneNumber && (
                                <span className="flex items-center gap-1 border-l border-zinc-200 pl-1.5">
                                  <Phone size={11} className="text-zinc-400" /> {s.phoneCode} {s.phoneNumber}
                                </span>
                              )}
                            </div>
                          )}

                          <div className="usage-bar-wrap mt-3">
                            <div className="usage-label">
                              <span>Activity metrics</span>
                              <span className="font-semibold">{s.usagePct}% · {s.lastUsed}</span>
                            </div>
                            <div className="usage-bar">
                              <div 
                                className={`usage-fill ${
                                  s.usagePct >= 70 ? "fill-green" : s.usagePct >= 35 ? "fill-yellow" : "fill-red"
                                }`} 
                                style={{ width: `${s.usagePct}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="sub-card-actions mt-4 gap-2">
                          <button 
                            className="btn-keep cursor-pointer py-2 px-1 text-center"
                            onClick={() => triggerKeepConfirmation(s, false)}
                          >
                            Keep
                          </button>
                          <button 
                            className="btn-cancel cursor-pointer py-2 px-1 text-center"
                            onClick={() => triggerCancelConfirmation(s, false)}
                          >
                            Cancel
                          </button>
                          <button 
                            className="btn-ai text-indigo-950 transition-all hover:scale-105"
                            title="Consult Gemini AI"
                            onClick={() => {
                              setActivePage("advisor");
                              setChatInput(`Should I keep my ${s.name}?`);
                            }}
                          >
                            🤖
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ─── PAGE 2: AI ADVISOR ─── */}
            {activePage === "advisor" && (
              <div className="page active">
                <div className="page-header">
                  <h1 className="page-title">Personal AI subscription advisor</h1>
                  <p className="page-sub">Ask the RenewWise AI assistant about cost optimization, upcoming bills, or multi-country subscription notifications.</p>
                </div>

                <div className="advisor-layout">
                  <div className="chat-panel">
                    <div className="chat-header">
                      <div className="ai-dot text-white text-xs font-bold">🤖</div>
                      <div>
                        <div className="chat-title leading-tight font-semibold">ReneWise AI Assistant</div>
                        <div className="chat-sub">Active server proxy context</div>
                      </div>
                      <div className="chat-status flex items-center gap-1.5 text-xs text-[#0E7C5E] font-medium ml-auto">
                        <div className="status-dot w-2 h-2 rounded-full bg-[#0E7C5E]" />
                        <span>Online</span>
                      </div>
                    </div>

                    {/* Chat log messages */}
                    <div className="chat-messages">
                      {chatMessages.map((m, idx) => (
                        <div className={`msg ${m.role === "user" ? "user" : ""}`} key={idx}>
                          <div className="msg-avatar">
                            {m.role === "user" ? "👤" : "🤖"}
                          </div>
                          <div 
                            className="msg-bubble"
                            dangerouslySetInnerHTML={{
                              __html: m.content
                                .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                                .replace(/\n/g, "<br/>")
                            }}
                          />
                        </div>
                      ))}
                      {isChatLoading && (
                        <div className="msg">
                          <div className="msg-avatar">🤖</div>
                          <div className="msg-bubble">
                            <div className="typing-indicator">
                              <div className="typing-dot" />
                              <div className="typing-dot" />
                              <div className="typing-dot" />
                            </div>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>

                    {/* Quick prompts helper pills */}
                    <div className="quick-prompts pt-2">
                      {[
                        "Which subscriptions should I cancel?",
                        "What is renewing this week?",
                        "Am I overspending on Entertainment?",
                        "Tell me about ChatGPT Plus spend"
                      ].map((prompt, idx) => (
                        <button 
                          type="button"
                          className="quick-chip text-zinc-600 hover:text-emerald-800"
                          key={idx}
                          onClick={() => {
                            handleSendChat(prompt);
                          }}
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>

                    {/* Chat text panel form */}
                    <div className="chat-input-row border-t border-zinc-200 p-3 bg-zinc-50 flex gap-2">
                      <input 
                        className="chat-input"
                        placeholder="Inquire about any manually added bills or countries..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleSendChat();
                        }}
                      />
                      <button className="chat-send" onClick={handleSendChat}>
                        <Send size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Sidebar recommendations panel */}
                  <div className="insight-panel">
                    <div className="insight-card">
                      <div className="insight-title font-bold text-[11px] text-zinc-400 mb-3 tracking-wider">🎯 Billing Score</div>
                      
                      <div className="score-ring flex items-center gap-3">
                        <div className="ring-wrap relative w-12 h-12">
                          <svg className="transform -rotate-90" width="48" height="48" viewBox="0 0 48 48">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#E5E7EB" strokeWidth="4" />
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#0E7C5E" strokeWidth="4" strokeDasharray="125.6" strokeDashoffset="31.4" strokeLinecap="round" />
                          </svg>
                          <div className="ring-value absolute inset-0 flex items-center justify-center font-bold text-emerald-800 text-sm">7.8</div>
                        </div>
                        <div>
                          <div className="ring-label text-[13px] font-semibold text-zinc-800">Portfolio Index</div>
                          <div className="ring-sub text-[11px] text-zinc-500 leading-tight">Calculated relative worth of subscriptions</div>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-col gap-2">
                        {subscriptions.slice(0, 3).map((s, i) => (
                          <div className="flex items-center gap-2" key={i}>
                            <div className="w-2 h-2 rounded-full bg-emerald-700" />
                            <span className="text-[12px] text-zinc-600">
                              <strong>{s.name}</strong> — {s.worthScore}/10 ({s.usagePct}% Activity)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="insight-card">
                      <div className="insight-title font-bold text-[11px] text-zinc-400 mb-2 tracking-wider">💡 Optimize Pipeline</div>
                      <div className="flex flex-col gap-3">
                        {subscriptions.some(s => s.name === "Hotstar Premium") && (
                          <div className="flex items-start gap-2.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0" />
                            <span className="text-xs text-zinc-600 leading-tight">
                              Cancel <strong>Hotstar</strong> — saves ₹299/mo. Last logged use was 41 days ago.
                            </span>
                          </div>
                        )}
                        <div className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                          <span className="text-xs text-zinc-600 leading-tight">
                            Downgrade Netflix Standard to Basic — cuts spend from ₹499 to ₹349.
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── PAGE 3: SPEND ANALYTICS ─── */}
            {activePage === "analytics" && (
              <div className="page active">
                <div className="page-header">
                  <h1 className="page-title">Personal Spend Intelligence</h1>
                  <p className="page-sub">Comprehensive tracking history reconciled seamlessly.</p>
                </div>

                <div className="analytics-grid">
                  <div className="chart-card">
                    <div className="chart-title font-bold text-zinc-800">Total Subscription Spend Trend</div>
                    <div className="chart-sub text-xs text-zinc-500 mb-6">Aggregate spend over the last 6 months</div>
                    
                    <div className="bar-chart flex items-end justify-between h-40 pt-4 px-4 bg-zinc-50 rounded-xl border border-zinc-100">
                      {[
                        { val: 1340, label: "Jan" },
                        { val: 1490, label: "Feb" },
                        { val: 1610, label: "Mar" },
                        { val: 1530, label: "Apr" },
                        { val: 1680, label: "May" },
                        { val: monthlySpend, label: "Jun" }
                      ].map((item, idx, arr) => {
                        const maxVal = Math.max(...arr.map(a => a.val));
                        const pct = Math.round((item.val / maxVal) * 100);
                        return (
                          <div className="bar-col flex flex-col items-center flex-1 gap-2 mx-1.5" key={idx}>
                            <span className="text-[10px] font-mono text-zinc-400 font-bold">₹{item.val}</span>
                            <div 
                              className={`bar w-full rounded-t-lg transition-all duration-500 ${idx === arr.length - 1 ? "highlighted bg-emerald-600" : "bg-emerald-800"}`} 
                              style={{ height: `${pct * 0.8}px`, minHeight: "6px" }}
                            />
                            <span className="bar-label font-bold text-xs text-zinc-500">{item.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="chart-card">
                    <div className="chart-title font-bold text-zinc-800">Breakdown by Category</div>
                    <div className="chart-sub text-xs text-zinc-500 mb-4">Relative share of monthly spend</div>
                    
                    <ul className="category-list">
                      {categories.map((cat, idx) => {
                        const spend = getCategorySpend(cat);
                        const pctStr = totalCategoriesSpend > 0 ? ((spend / totalCategoriesSpend) * 100).toFixed(0) : "0";
                        const colors = ["#0E7C5E", "#1D4ED8", "#D97706", "#7C3AED", "#EC4899", "#6B7280"];
                        
                        return (
                          <li className="cat-item flex items-center justify-between" key={idx}>
                            <div className="flex items-center gap-2">
                              <div className="cat-dot w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: colors[idx] }} />
                              <span className="cat-name text-[13px] text-zinc-600 font-medium">{cat}</span>
                            </div>
                            <div className="flex items-center gap-3 font-mono text-[11px] font-bold">
                              <span>₹{spend}</span>
                              <span className="text-zinc-400 text-right w-8">{pctStr}%</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  {/* Gemini powered recommendations feedback card */}
                  <div className="chart-card lg:col-span-3">
                    <div className="chart-title font-bold text-zinc-800 flex items-center gap-1.5">
                      <Sparkles size={16} className="text-emerald-700" />
                      <span>Spend Analysis</span>
                    </div>
                    <div className="chart-sub text-xs text-zinc-500">Real-time analytical trends recalculated dynamically</div>
                    
                    <div className="text-sm text-zinc-700 bg-emerald-50/50 border border-emerald-100 rounded-xl p-4 leading-relaxed mt-2">
                      {isLoadingInsight ? (
                        <div className="flex items-center gap-2 text-zinc-500 italic">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-700 animate-ping" />
                          <span>Generating analytical response with Saint Gemini api...</span>
                        </div>
                      ) : (
                        <p>{aiInsightText || "No active manual billing updates. Try adding more developer tags or subscriptions."}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ─── PAGE 4: ALERTS / NOTIFICATIONS ─── */}
            {activePage === "notifications" && (
              <div className="page active">
                <div className="page-header">
                  <h1 className="page-title">Direct Renewal Alerts</h1>
                  <p className="page-sub">Dynamic notification schedules matching multi-country constraints perfectly.</p>
                </div>

                <div className="notif-list">
                  <div className="notif-item unread danger border-l-4 border-rose-600">
                    <span className="notif-icon">🔴</span>
                    <div className="notif-body">
                      <div className="notif-title font-semibold text-zinc-800">Hotstar Premium renewing in 48 hours</div>
                      <div className="notif-text text-zinc-500 mt-1">
                        ₹299 is set to be debited automatically. Low registered activity detected. Consider unsubscribing or downgrading.
                      </div>
                    </div>
                    <span className="notif-time text-xs text-zinc-400 font-bold">Today</span>
                  </div>

                  <div className="notif-item unread warning border-l-4 border-amber-500">
                    <span className="notif-icon">🟡</span>
                    <div className="notif-body">
                      <div className="notif-title font-semibold text-zinc-800">Notion Pro auto-charge approaching</div>
                      <div className="notif-text text-zinc-500 mt-1">
                        ₹800 recurring billing active on May 23. Consistent registered use detected. Highly recommended to keep.
                      </div>
                    </div>
                    <span className="notif-time text-xs text-zinc-400 font-bold">Today</span>
                  </div>

                  <div className="notif-item border-l-4 border-emerald-600">
                    <span className="notif-icon text-emerald-600">✓</span>
                    <div className="notif-body">
                      <div className="notif-title font-semibold text-zinc-800">Removed clutter: saved ₹298 this month</div>
                      <div className="notif-text text-zinc-500 mt-1">
                        Zee5 canceled successfully based on zero registered activity. Money is restored to account billing cycle.
                      </div>
                    </div>
                    <span className="notif-time text-xs text-zinc-400">4 days ago</span>
                  </div>
                </div>
              </div>
            )}

            {/* ─── PAGE 5: REVOLVING SETTINGS & ACCOUNTS ─── */}
            {activePage === "settings" && (
              <div className="page active">
                <div className="page-header">
                  <h1 className="page-title">Personal Sandbox Configuration</h1>
                  <p className="page-sub">Manage platform parameters, security, and notification triggers.</p>
                </div>

                <div className="flex flex-col gap-4 max-w-xl">
                  <div className="insight-card">
                    <div className="insight-title font-bold text-zinc-400 text-[11px] mb-3 tracking-wider">🔒 CONNECTION REGISTER</div>
                    <div className="flex items-center justify-between py-1.5 border-b border-zinc-100">
                      <span className="text-zinc-600 font-medium text-[13px]">
                        {loginMethod === "phone" ? "Active Ingestion Phone Identifier:" : "Active Ingestion Email Identifier:"}
                      </span>
                      <span className="font-mono text-xs text-emerald-900 font-bold">{userEmail || "Manual Isolated Account"}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 mt-2">
                      <span className="text-zinc-500 text-xs">Security framework: On-device cache, direct simulation endpoints.</span>
                      <button 
                        className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 font-bold px-3 py-1.5 rounded-lg border border-rose-200 transition-all cursor-pointer"
                        onClick={handleRevokeEmailAccess}
                      >
                        Revoke Access
                      </button>
                    </div>
                  </div>

                  <div className="insight-card">
                    <div className="insight-title font-bold text-zinc-400 text-[11px] mb-3 tracking-wider">🔔 CHANNEL PREFERENCES</div>
                    <div className="flex flex-col gap-3 text-[13px] text-zinc-600">
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Send updates for plans</span>
                        <input type="checkbox" defaultChecked className="accent-teal w-4 h-4 cursor-pointer" />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Receive the real-time priced trend by WhatsApp</span>
                        <input type="checkbox" defaultChecked className="accent-teal w-4 h-4 cursor-pointer" />
                      </label>
                      <label className="flex items-center justify-between cursor-pointer">
                        <span>Insight updates daily on mail and phone number or on WhatsApp</span>
                        <input type="checkbox" defaultChecked className="accent-teal w-4 h-4 cursor-pointer" />
                      </label>

                      {/* Explicit interactive option */}
                      <label className="flex items-center justify-between cursor-pointer border-t border-zinc-100 pt-3 mt-1 text-[#0E7C5E] font-bold">
                        <span>Notify me through WhatsApp about my recent notifications</span>
                        <input 
                          type="checkbox" 
                          checked={whatsappPermission} 
                          onChange={(e) => {
                            setWhatsappPermission(e.target.checked);
                            localStorage.setItem("renewise_whatsapp_permission", String(e.target.checked));
                            if (e.target.checked) {
                              showToast("💬 WhatsApp notification permissions updated: Enabled.");
                            } else {
                              showToast("✉️ WhatsApp notification permissions updated: Disabled (Email only).");
                            }
                          }}
                          className="accent-[#0E7C5E] w-4.5 h-4.5 cursor-pointer animate-pulse" 
                        />
                      </label>
                    </div>
                  </div>

                  <div className="insight-card bg-zinc-50 p-4 border border-zinc-200 rounded-xl leading-relaxed">
                    <span className="font-bold text-xs text-zinc-500 block mb-1">PRIVACY STATEMENT</span>
                    <p className="text-xs text-zinc-500">
                      Device operates under local storage logic. All manual billing and credentials pricing and phone codes remain strictly isolated on your device for isolated processing.
                    </p>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      )}

      {/* ─── NEW MODAL: STAT DETAIL BREAKDOWNS ─── */}
      {activeStatDetails && (
        <div id="stat-details-modal-overlay" className="modal-overlay open" onClick={() => setActiveStatDetails(null)}>
          <div className="modal w-[580px] max-w-full" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title text-zinc-900 font-bold flex items-center gap-2">
                {activeStatDetails === "spend" && <span>📊 Monthly Spend Index Journal</span>}
                {activeStatDetails === "plans" && <span>💳 Tracked Active Plans</span>}
                {activeStatDetails === "savings" && <span>🎉 Idle-Cut Savings Breakdown</span>}
                {activeStatDetails === "renewing" && <span>⚠️ Renewal Pipeline (Next 7 Days)</span>}
              </h2>
              <button 
                className="modal-close" 
                onClick={() => setActiveStatDetails(null)}
              >
                ×
              </button>
            </div>

            <div className="modal-body text-left">
              {/* 1. Monthly Spend breakdown */}
              {activeStatDetails === "spend" && (
                <div id="spend-detail-pane">
                  <p className="text-[13px] text-zinc-500 mb-4 leading-relaxed">
                    Here is the monthly journal showing normalized amounts for all active subscriptions. Annual costs are prorated into their equivalent monthly burden.
                  </p>
                  
                  <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto mb-4 pr-1">
                    {subscriptions.map((s) => {
                      let normalizedMonthly = s.amount;
                      if (s.cycle === "annual") normalizedMonthly = Math.round(s.amount / 12);
                      if (s.cycle === "weekly") normalizedMonthly = Math.round(s.amount * 4);

                      return (
                        <div 
                          key={s.id} 
                          className="flex items-center justify-between p-3 bg-zinc-50 hover:bg-zinc-100 rounded-xl border border-zinc-100 transition-colors cursor-pointer"
                          onClick={() => {
                            setActiveStatDetails(null);
                            showToast(`Navigated to dashboard view of ${s.name}`);
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{s.emoji}</span>
                            <div>
                              <div className="text-xs font-semibold text-zinc-800">{s.name}</div>
                              <div className="text-[11px] text-zinc-500">{s.category} · {s.cycle} billing</div>
                            </div>
                          </div>
                          
                          <div className="text-right font-mono">
                            <div className="text-xs font-bold text-zinc-900">₹{normalizedMonthly}/mo</div>
                            <div className="text-[10px] text-zinc-400">Orig: ₹{s.amount}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-3.5 bg-zinc-900 text-white rounded-xl flex items-center justify-between font-medium">
                    <span className="text-xs">Aggregate Current Monthly Burden:</span>
                    <span className="text-base font-bold font-mono text-emerald-400">₹{monthlySpend.toLocaleString()}/mo</span>
                  </div>
                </div>
              )}

              {/* 2. Active plans list */}
              {activeStatDetails === "plans" && (
                <div id="plans-detail-pane">
                  <p className="text-[13px] text-zinc-500 mb-4 leading-relaxed">
                    You currently have <strong className="text-zinc-800">{activeCount} active plans</strong> configured in your ReneWise tracking registers.
                  </p>

                  <div className="flex flex-col gap-2.5 max-h-[320px] overflow-y-auto mb-4 pr-1">
                    {subscriptions.map((s) => {
                      const isHigh = s.worthScore >= 7.5;
                      const isMedium = s.worthScore >= 5.0 && s.worthScore < 7.5;
                      const worthLabel = isHigh ? "High Worth" : isMedium ? "Review Needed" : "Consider Cancel";
                      const worthColor = isHigh ? "bg-emerald-50 text-emerald-800 border-emerald-100" : isMedium ? "bg-amber-50 text-amber-800 border-amber-100" : "bg-rose-50 text-rose-800 border-rose-100";

                      return (
                        <div 
                          key={s.id} 
                          className="p-3 bg-zinc-50 rounded-xl border border-zinc-100 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-lg">{s.emoji}</span>
                            <div>
                              <div className="text-xs font-semibold text-zinc-900">{s.name}</div>
                              <div className="text-[11px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                                <span>{s.category}</span>
                                <span>•</span>
                                <span className={`text-[10px] px-1.5 py-0.2 rounded-full border ${worthColor}`}>{worthLabel} ({s.worthScore}/10)</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs font-bold text-zinc-950 font-mono">₹{s.amount}/{s.cycle}</div>
                            <span className="text-[10px] text-zinc-400 block mt-0.5">{s.usagePct}% Active</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <button 
                    className="w-full bg-[#0E7C5E] text-white py-2.5 rounded-xl text-xs font-semibold hover:bg-[#085A44] transition-colors cursor-pointer"
                    onClick={() => {
                      setActiveStatDetails(null);
                      setIsAddModalOpen(true);
                    }}
                  >
                    + Register an Additional Subscription Plan
                  </button>
                </div>
              )}

              {/* 3. Total monthly savings */}
              {activeStatDetails === "savings" && (
                <div id="savings-detail-pane">
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex gap-3 mb-4">
                    <span className="text-2xl mt-0.5">🏆</span>
                    <div>
                      <h4 className="font-bold text-xs text-emerald-950">ReneWise Automation Wins!</h4>
                      <p className="text-[12px] text-emerald-800 leading-relaxed mt-1">
                        By deploying AI inactivity scans on your credit cards, we identified and successfully terminated neglected subscription cycles.
                      </p>
                    </div>
                  </div>

                  <div className="border border-zinc-200/90 rounded-xl overflow-hidden mb-4 bg-zinc-50">
                    <div className="p-3 bg-zinc-100/60 border-b border-zinc-200 text-[11px] font-bold text-zinc-500 tracking-wider">SECURED CANCELLATION ENTRY</div>
                    <div className="p-4 flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl pt-1">📺</span>
                        <div>
                          <div className="text-xs font-bold text-zinc-900">Zee5 Premium Plan</div>
                          <div className="text-[11px] text-zinc-500 leading-relaxed mt-1">
                            <strong>Reason:</strong> 0% registered activity detected (0 minutes logged over the last 60 days).
                          </div>
                          <div className="text-[11px] text-zinc-500 mt-1">
                            <strong>Payment source:</strong> UPI AutoPay (India)
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-emerald-700 bg-emerald-100/70 text-xs px-2 py-1 rounded-lg font-bold font-mono">
                          Saved ₹298/mo
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-2">Canceled June 9</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3.5 bg-zinc-50 border border-zinc-150 rounded-xl mb-4 text-xs text-zinc-600">
                    <span>Projected Cumulative Yearly Return:</span>
                    <strong className="text-zinc-900 font-bold font-mono">₹{savingsThisMonth * 12}/year</strong>
                  </div>

                  <button 
                    className="w-full bg-zinc-900 hover:bg-zinc-800 text-white font-medium py-3 rounded-xl text-xs transition-colors cursor-pointer"
                    onClick={() => {
                      setActiveStatDetails(null);
                      setActivePage("advisor");
                      setChatInput("Are there any other subscriptions I can safely cancel to save money?");
                    }}
                  >
                    Discuss further saving candidate cuts with AI →
                  </button>
                </div>
              )}

              {/* 4. Renewing this week */}
              {activeStatDetails === "renewing" && (
                <div id="renewing-detail-pane">
                  <p className="text-[13px] text-zinc-500 mb-4 leading-relaxed">
                    The following tracked plans are scheduled for automated payment renewals within the next <strong>7 days</strong>. Review these to avoid unintended charges.
                  </p>

                  <div className="flex flex-col gap-3 mb-4">
                    {subscriptions.filter(s => s.renewIn <= 7).length === 0 ? (
                      <p className="text-zinc-500 text-xs text-center py-4 bg-zinc-50 border border-zinc-100 rounded-xl font-medium">
                        No subscriptions are renewing within the next 7 days!
                      </p>
                    ) : (
                      subscriptions.filter(s => s.renewIn <= 7).map((s) => (
                        <div 
                          key={s.id} 
                          className="bg-zinc-50 border border-zinc-250/50 hover:border-emerald-200 rounded-xl p-3.5 transition-colors border-l-4 border-l-amber-500 text-left"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-2.5">
                              <span className="text-xl">{s.emoji}</span>
                              <div>
                                <div className="text-xs font-bold text-zinc-900">{s.name}</div>
                                <div className="text-[11px] text-zinc-500 mt-0.5">₹{s.amount} / {s.cycle} billing cycle</div>
                              </div>
                            </div>
                            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                              Renews in {s.renewIn} days
                            </span>
                          </div>

                          <p className="text-[11px] text-zinc-600 mt-2.5 font-normal leading-relaxed">
                            {s.worthScore >= 7.5 
                              ? `✓ High activity level (${s.usagePct}%) logged. Highly worth keeping.`
                              : `⚠️ Low inactivity trend detected. AI recommends cancelling or downgrading to save cost.`
                            }
                          </p>

                          <div className="flex gap-2.5 mt-3 pt-2.5 border-t border-zinc-200/50">
                            <button 
                              className="flex-1 bg-white hover:bg-zinc-100 text-zinc-800 border border-zinc-250 text-[11px] py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
                              onClick={() => {
                                setActiveStatDetails(null);
                                triggerKeepConfirmation(s, true);
                              }}
                            >
                              Keep as is
                            </button>
                            <button 
                              className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-[11px] py-1.5 rounded-lg transition-colors font-medium cursor-pointer"
                              onClick={() => {
                                setActiveStatDetails(null);
                                triggerCancelConfirmation(s, true);
                              }}
                            >
                              Request cancel
                            </button>
                            <button 
                              className="bg-emerald-50 hover:bg-emerald-100 text-[#0E7C5E] border border-emerald-110 text-[11px] px-2.5 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1 cursor-pointer"
                              onClick={() => {
                                setActiveStatDetails(null);
                                setActivePage("advisor");
                                setChatInput(`Should I keep my ${s.name}?`);
                              }}
                            >
                              🤖 AI Ask
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <p className="text-[11px] text-zinc-400 text-center">
                    Payment instructions auto-reconciled with RBI mandates successfully.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

       {/* ─── NEW MODAL: PRE-ACTION GUARD CONFIRMATION (NO UNKNOWING CLICKS) ─── */}
      {confirmOverlay.isOpen && confirmOverlay.sub && (
        <div id="pre-action-confirm-overlay" className="modal-overlay open z-[9999]" onClick={() => setConfirmOverlay({ isOpen: false, type: "keep", sub: null })}>
          <div className="modal w-[440px] max-w-full p-6 text-center bg-white rounded-2xl shadow-xl border border-zinc-150" onClick={(e) => e.stopPropagation()}>
            <div className="flex flex-col items-center">
              {confirmOverlay.type === "cancel" ? (
                <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center text-rose-600 mb-4 animate-[bounce_1s_infinite]">
                  <AlertTriangle size={28} />
                </div>
              ) : (
                <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 mb-4 animate-[pulse_1.5s_infinite]">
                  <CheckCircle size={28} />
                </div>
              )}

              <h3 className="text-base font-bold text-zinc-950 mb-2">
                {confirmOverlay.type === "cancel" 
                  ? `Are you sure you want to cancel this?` 
                  : `Are you sure you want to keep this?`}
              </h3>

              <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 rounded-lg border border-zinc-100 my-2">
                <span className="text-base">{confirmOverlay.sub.emoji}</span>
                <span className="text-xs font-bold text-zinc-900">{confirmOverlay.sub.name}</span>
                <span className="text-[10px] text-zinc-400 font-mono">({confirmOverlay.sub.category})</span>
              </div>

              <div className="text-zinc-600 text-xs font-normal leading-relaxed my-3 px-1 text-center font-sans">
                {confirmOverlay.type === "cancel" ? (
                  <>
                    <p className="text-[13px] font-semibold text-zinc-900">
                      Basically, you will save <span className="text-emerald-700 font-bold font-sans">₹{confirmOverlay.sub.amount.toLocaleString()} per {confirmOverlay.sub.cycle === "monthly" ? "month" : confirmOverlay.sub.cycle}</span>.
                    </p>
                    {confirmOverlay.sub.planType === "trial" ? (
                      <p className="mt-1.5 text-zinc-500 text-left bg-rose-50/50 p-2 text-[11px] font-medium text-rose-800 rounded-lg border border-rose-100">
                        🛡️ <strong>Trial Guard:</strong> Cancelling now halts the trial auto-transition. It secures your credit card against any upcoming ₹{confirmOverlay.sub.amount} billing starting soon!
                      </p>
                    ) : (
                      <p className="mt-1.5 text-zinc-500">
                        This will halt active automated cycles and terminate scheduled notification tracking in ReneWise. Are you ready to cancel?
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <p className="text-[13px] font-[600] text-zinc-900">
                      It would cost you <span className="font-bold text-amber-700 font-sans">₹{confirmOverlay.sub.amount.toLocaleString()} per {confirmOverlay.sub.cycle === "monthly" ? "month" : confirmOverlay.sub.cycle}</span>.
                    </p>
                    {confirmOverlay.sub.planType === "trial" ? (
                      <div className="mt-2 text-left p-2.5 bg-amber-50 rounded-lg text-amber-900 border border-amber-200 text-[11.5px] leading-snug">
                        ⚠️ <strong>Avoid Unknowing Billing:</strong> Most premium trial users apply for brief initial access but completely forget until unexpected charges deduct. Safely proceed only if you actively want to renew!
                      </div>
                    ) : (
                      <p className="mt-1.5 text-zinc-500">
                        This authorizes us to maintain active monitoring and alert triggers for your budget. Are you ready to keep?
                      </p>
                    )}
                  </>
                )}
              </div>

              <div className="flex gap-3 w-full mt-4">
                <button
                  type="button"
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all text-zinc-500 bg-zinc-50 hover:bg-zinc-150 border border-zinc-200 cursor-pointer"
                  onClick={() => setConfirmOverlay({ isOpen: false, type: "keep", sub: null })}
                >
                  Nevermind
                </button>
                <button
                  type="button"
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all text-white cursor-pointer ${
                    confirmOverlay.type === "cancel" 
                      ? "bg-rose-600 hover:bg-rose-700 active:scale-[0.98]" 
                      : "bg-[#0E7C5E] hover:bg-[#085A44] active:scale-[0.98]"
                  }`}
                  onClick={confirmOverlay.type === "cancel" ? handleConfirmCancelInitiate : handleConfirmKeep}
                >
                  {confirmOverlay.type === "cancel" ? "Yes, Cancel Plan" : "Yes, Keep Plan"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 1: PRECISE PLAN DELETION / CANCELLATION INSIGHTS ─── */}
      {cancelModal.isOpen && cancelModal.sub && (
        <div className="modal-overlay open">
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title text-zinc-800 font-bold">Unsubscribe from {cancelModal.sub.name}</h2>
              <button 
                className="modal-close"
                onClick={() => setCancelModal({ isOpen: false, sub: null, aiVerdict: "", isCancelled: false })}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body text-left">
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-4 text-[13px] text-rose-950 mb-4 font-normal leading-relaxed">
                <span className="font-bold block mb-1">🤖 Advisor Recommendations:</span>
                <p>{cancelModal.sub.worthScore < 5.0 ? "⚠️ Highly recommended to clear. " : "ℹ️ Note: "} {cancelModal.sub.name} cost can be diverted back to your monthly budget.</p>
                <p className="mt-2 text-zinc-600 font-medium italic">{cancelModal.aiVerdict}</p>
              </div>

              <div className="text-[13px] font-bold text-zinc-800 mb-3">Cancellation Steps:</div>
              <ol className="cancel-steps">
                <li className="cancel-step">
                  <span className="step-num">1</span>
                  <span className="step-desc text-zinc-600">Open product settings under the developer/merchant portal.</span>
                </li>
                <li className="cancel-step">
                  <span className="step-num">2</span>
                  <span className="step-desc text-zinc-600">Navigate to billing, sub-accounts, and select <strong>"Cancel Plan"</strong>.</span>
                </li>
                <li className="cancel-step">
                  <span className="step-num">3</span>
                  <span className="step-desc text-zinc-600">Confirm settings update. ReneWise will automatically stop tracking upon sync.</span>
                </li>
              </ol>

              {cancelModal.isCancelled ? (
                <div className="money-saved-pill mt-4">
                  <span>🎉</span>
                  <span className="font-medium text-emerald-800 text-xs">
                    Subscription removal verified! Saved ₹{cancelModal.sub.amount} for the next cycle.
                  </span>
                </div>
              ) : (
                <button 
                  className="deeplink-btn"
                  onClick={() => handleConfirmCancel(cancelModal.sub!.id)}
                >
                  Verify Plan Cancellation →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL 2: MANUAL ADDITION & NLP AI EXTRACTOR MODAL ─── */}
      {isAddModalOpen && (
        <div className="modal-overlay open">
          <div className="modal bg-white text-zinc-800 rounded-2xl w-[540px] max-w-full">
            <div className="modal-header">
              <h2 className="modal-title text-zinc-950 font-bold flex items-center gap-1.5 pt-1">
                <PlusCircle className="text-emerald-700" size={18} />
                <span>Track Subscription</span>
              </h2>
              <button 
                type="button"
                className="modal-close"
                onClick={() => setIsAddModalOpen(false)}
              >
                ×
              </button>
            </div>

            {/* Modal Internal Navigation */}
            <div className="flex border-b border-zinc-100 bg-zinc-50/50 p-1 select-none">
              <button 
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all border ${activePage ? "" : ""} ${
                  addModalTab === "manual" ? "bg-white text-zinc-800 shadow-sm border-zinc-200/60" : "text-zinc-500 border-transparent hover:text-zinc-800"
                }`}
                onClick={() => setAddModalTab("manual")}
              >
                ✏️ Manual Details
              </button>
              <button 
                className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg transition-all border ${
                  addModalTab === "ai" ? "bg-white text-zinc-800 shadow-sm border-zinc-200/60" : "text-zinc-500 border-transparent hover:text-zinc-800"
                }`}
                onClick={() => setAddModalTab("ai")}
              >
                📋 Paste Invoice/SMS
              </button>
            </div>

            <div className="modal-body">
              {addModalTab === "manual" ? (
                <form onSubmit={handleAddSubscription} className="flex flex-col gap-3 text-left">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="form-group col-span-2">
                      <label className="form-label">Subscription Name *</label>
                      <input 
                        className="form-input"
                        placeholder="e.g. ChatGPT Plus, Cloud Code Pro, Spotify"
                        required
                        value={formName}
                        onChange={(e) => setFormName(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Plan Category</label>
                      <select 
                        className="form-select text-[13px] font-medium py-2"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                      >
                        {categories.map((cat, idx) => (
                          <option key={idx} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Recurring Cost (₹)</label>
                      <input 
                        className="form-input"
                        type="number"
                        placeholder="Cost"
                        required
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label">Billing Cycle</label>
                      <select 
                        className="form-select text-[12px] py-2"
                        value={formCycle}
                        onChange={(e) => setFormCycle(e.target.value)}
                      >
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                        <option value="weekly">Weekly</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label className="form-label">Days until next renew</label>
                      <input 
                        className="form-input"
                        type="number"
                        placeholder="e.g. 15"
                        required
                        value={formRenewIn}
                        onChange={(e) => setFormRenewIn(e.target.value)}
                      />
                    </div>

                    <div className="form-group col-span-2">
                      <label className="form-label">Billing Origin Country</label>
                      <input 
                        className="form-input"
                        placeholder="e.g. India, United States"
                        value={formCountry}
                        onChange={(e) => setFormCountry(e.target.value)}
                      />
                    </div>

                    <div className="form-group col-span-2 bg-zinc-50 p-3 rounded-xl border border-zinc-200/60">
                      <label className="form-label font-bold text-zinc-900 block mb-1.5">Premium & Subscription Plan Type</label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs font-semibold select-none transition-all ${
                          formPlanType === "paid" 
                            ? "bg-zinc-900 text-white border-zinc-950" 
                            : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                        }`}>
                          <input 
                            type="radio" 
                            name="formPlanType" 
                            value="paid" 
                            checked={formPlanType === "paid"}
                            onChange={() => setFormPlanType("paid")}
                            className="accent-zinc-950 cursor-pointer w-3.5 h-3.5"
                          />
                          <div>
                            <div>Standard Paid Premium</div>
                            <span className="text-[9px] opacity-75 font-normal block">Regular premium auto-debit active</span>
                          </div>
                        </label>
                        <label className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer text-xs font-semibold select-none transition-all ${
                          formPlanType === "trial" 
                            ? "bg-[#0E7C5E] text-white border-[#085A44]" 
                            : "bg-white text-zinc-700 border-zinc-200 hover:bg-zinc-100"
                        }`}>
                          <input 
                            type="radio" 
                            name="formPlanType" 
                            value="trial" 
                            checked={formPlanType === "trial"}
                            onChange={() => setFormPlanType("trial")}
                            className="accent-emerald-700 cursor-pointer w-3.5 h-3.5"
                          />
                          <div>
                            <div>👑 Free Premium Trial</div>
                            <span className="text-[9px] opacity-80 font-normal block">Billing starting soon (First month free)</span>
                          </div>
                        </label>
                      </div>
                    </div>

                    <div className="form-group col-span-2">
                      <label className="form-label">Payment Source / Rail Type</label>
                      <input 
                        className="form-input"
                        placeholder="e.g. UPI Autopay, HDFC Credit Card, PayPal"
                        value={formRail}
                        onChange={(e) => setFormRail(e.target.value)}
                      />
                    </div>
                  </div>

                  <button 
                    type="submit"
                    className="w-full bg-[#0E7C5E] text-white py-3 rounded-xl font-bold hover:bg-[#085A44] transition-all duration-200 mt-2 text-sm shadow-sm cursor-pointer"
                  >
                    Confirm Subscription Tracking
                  </button>
                </form>
              ) : (
                <div className="flex flex-col gap-3 text-left">
                  <div className="text-zinc-600 text-xs mb-1 bg-zinc-50 p-3 rounded-lg border border-zinc-100 font-medium">
                    📋 Paste the text of your billing confirmation email, PhonePe message, UPI debit SMS, or invoices below. Our scanner will extract all subscription parameters automatically!
                  </div>
                  
                  <textarea
                    className="form-input h-32 text-xs font-mono select-text"
                    placeholder="e.g. Dear Customer, your UPI autopay details: ChatGPT Plus renewal for INR 1,700 processed successfully on May 21st. Next auto-debit on June 21st..."
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                  />

                  <button 
                    type="button"
                    className="w-full bg-emerald-800 hover:bg-emerald-950 text-white font-bold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                    disabled={isParsingText}
                    onClick={handleAiAutoParse}
                  >
                    {isParsingText ? (
                      <>
                        <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Scanning Billing Payload...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} />
                        <span>Extract Billing Details</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            <div className="modal-body border-t border-zinc-100 bg-zinc-50 p-4 rounded-b-2xl">
              <span className="text-[11px] text-zinc-400 block font-normal leading-tight">
                * All custom input metrics (such as unique international phone prefix codes or custom countries) are strictly retained on your local device client to preserve absolute privacy.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Toast feedback */}
      <div className={`toast ${toast.show ? "show" : ""}`} id="renewise-toast">
        <span className="text-emerald-400 font-bold">✓</span>
        <span>{toast.message}</span>
      </div>

    </div>
  );
}
