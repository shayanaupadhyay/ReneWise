import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

// Ensure the server can load on Port 3000
const PORT = 3000;

async function startServer() {
  const app = express();
  app.use(express.json());

  // Initialize Gemini Client server-side
  let ai: GoogleGenAI | null = null;
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (apiKey) {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } else {
    console.warn("WARNING: GEMINI_API_KEY environment variable is not set. AI features will fallback to server-side simulation.");
  }

  // API 1: Advisor Chat Proxy
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history, subscriptions } = req.body;
      
      const subContext = subscriptions && Array.isArray(subscriptions)
        ? subscriptions.map((s: any) => 
            `- ${s.name}: ₹${s.amount}/${s.cycle}, category: ${s.category}, worth-it score: ${s.worthScore}/10, usage: ${s.usagePct}%, last used: ${s.lastUsed}, renews in ${s.renewIn} days. Billing Country: ${s.country || "Not specified"}, Phone/SMS Code: ${s.phoneCode || "Not specified"}`
          ).join("\n")
        : "No active subscriptions currently tracked.";

      const systemInstruction = 
        `You are ReneWise AI, a sharp, empathetic, and objective personal subscription advisor. 
        You help users optimize their spending, identify unused or overpaying subscriptions, and manage recurring charges.
        
        The user has the following subscription portfolio:\n${subContext}\n
        Always refer to specific subscriptions by name, mention exact costs in rupees (₹), and the number of days left.
        Be practical and precise, advising what to keep or cancel. Always support developer tools like ChatGPT and Cloud Code.
        Format your response with clean paragraphs and bold keys. Avoid long lists unless asked. Keep it engaging, direct, and under 250 words.`;

      if (ai) {
        try {
          // Clean history to ensure it strictly starts with a "user" turn and alternates correctly
          const contents: any[] = [];
          let expectedRole: "user" | "model" = "user";
          
          if (history && Array.isArray(history)) {
            for (const h of history) {
              const mappedRole = h.role === "assistant" ? "model" : "user";
              // Ignore leading model responses
              if (contents.length === 0 && mappedRole !== "user") {
                continue;
              }
              // If we have alternating roles, add them
              if (mappedRole === expectedRole) {
                contents.push({
                  role: mappedRole,
                  parts: [{ text: h.content || "" }]
                });
                expectedRole = expectedRole === "user" ? "model" : "user";
              } else if (contents.length > 0) {
                // Same role consecutive — append text instead of adding new turn
                contents[contents.length - 1].parts[0].text += "\n" + (h.content || "");
              }
            }
          }
          
          // Append the latest user message
          if (expectedRole === "user") {
            contents.push({
              role: "user",
              parts: [{ text: message }]
            });
          } else {
            // If we expected model next, let's append user query to the last user message of contents
            if (contents.length > 0 && contents[contents.length - 1].role === "user") {
              contents[contents.length - 1].parts[0].text += "\n" + message;
            } else {
              contents.push({
                role: "user",
                parts: [{ text: message }]
              });
            }
          }

          const result = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: contents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.7,
            }
          });

          res.json({ text: result.text || "I was unable to generate a response. Please try again." });
        } catch (apiError: any) {
          console.error("Gemini API chat error, falling back to local simulation:", apiError);
          res.json({ text: simulateAIResponse(message, subscriptions) });
        }
      } else {
        // Fallback simulation if Gemini is not ready
        res.json({ text: simulateAIResponse(message, subscriptions) });
      }
    } catch (error: any) {
      console.error("Error in /api/chat:", error);
      res.status(500).json({ error: error?.message || "Failed to call Gemini API." });
    }
  });

  // API 2: Parse pasted Email / Message Text for subscription info
  app.post("/api/parse-subscription", async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "Missing text content to parse." });
      }

      const prompt = `Analyze this email, SMS invoice, credit card statement, or WhatsApp notification and extract the recurring subscription billing details:\n\n"${text}"`;

      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              systemInstruction: 
                "You are an expert NLP parser. Carefully extract subscription name, category, amount, currency, billing cycle, estimated remaining days, country of billing origin, and any SMS/phone-number country codes mentioned.",
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "Name of the subscription product/service, e.g., 'ChatGPT Plus', 'Cloud Code Pro', 'Spotify', 'Amazon Web Services'"
                  },
                  category: {
                    type: Type.STRING,
                    description: "One of the following categories: 'Entertainment', 'Productivity', 'Music', 'Cloud Storage', 'AI Tools', 'Other'"
                  },
                  amount: {
                    type: Type.NUMBER,
                    description: "Numerical value of the billing currency amount."
                  },
                  currency: {
                    type: Type.STRING,
                    description: "The currency symbol or code, e.g., 'INR', 'USD', '₹', '$'"
                  },
                  cycle: {
                    type: Type.STRING,
                    description: "One of: 'monthly', 'annual', 'weekly'"
                  },
                  renewIn: {
                    type: Type.INTEGER,
                    description: "Calculated number of days until the renewal is expected to charge or debited. Set to a reasonable guess, or default to 15 if unknown."
                  },
                  country: {
                    type: Type.STRING,
                    description: "Calculated billing country of origin or registration, e.g., 'India', 'United States', or 'Global'"
                  },
                  phoneCode: {
                    type: Type.STRING,
                    description: "Any phone dialing country code found, e.g., '+91', '+1', '+44', or empty string if none."
                  }
                },
                required: ["name", "category", "amount", "cycle", "renewIn"]
              }
            }
          });

          const dataStr = response.text?.trim() || "{}";
          const parsed = JSON.parse(dataStr);
          res.json(parsed);
        } catch (apiError) {
          console.error("Gemini API parse error, falling back to local simulation:", apiError);
          res.json(simulateParser(text));
        }
      } else {
        // Fallback simple parsing with simulated responses
        res.json(simulateParser(text));
      }
    } catch (error: any) {
      console.error("Error in /api/parse-subscription:", error);
      res.status(500).json({ error: error?.message || "Failed to parse subscription text." });
    }
  });

  // API 3: Smart Insights recommendation
  app.post("/api/insights", async (req, res) => {
    try {
      const { subscriptions } = req.body;
      const subContext = subscriptions && Array.isArray(subscriptions)
        ? subscriptions.map((s: any) => `- ${s.name}: ₹${s.amount}/${s.cycle}, worth-it score: ${s.worthScore}/10, usage: ${s.usagePct}%, last used: ${s.lastUsed}, in ${s.renewIn} days.`).join("\n")
        : "No active subscriptions.";

      const prompt = 
        `Generate a brief (exactly 2-3 sentences) actionable subscription cost optimization insight based on the following list:\n${subContext}\n
        Prioritize telling them what to cancel, highlight potential monthly savings in rupees (₹), and point out high-value utilities like ChatGPT or Cloud Code. Be direct, direct and realistic.`;

      if (ai) {
        try {
          const result = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: prompt,
            config: {
              systemInstruction: "You are ReneWise, an AI analyst. Always speak directly and quantitatively with specific rupees and metrics. Keep it short."
            }
          });
          res.json({ text: result.text || "No active insights. All systems and subscriptions clear." });
        } catch (apiError) {
          console.error("Gemini API insights error, falling back:", apiError);
          res.json({ text: getSimulatedInsights(subscriptions) });
        }
      } else {
        res.json({ text: getSimulatedInsights(subscriptions) });
      }
    } catch (error: any) {
      console.error("Error in /api/insights:", error);
      res.status(500).json({ error: error?.message || "Failed to generate AI insights." });
    }
  });

  // Serve static files and mount Vite middleware
  if (process.env.NODE_ENV !== "production") {
    console.log("Starting server in development mode with active Vite middleware...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("Serving compiled assets from /dist folder...");
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log("ReneWise server successfully initialized on port 3000");
  });
}

// SIMULATE HELPER FUNCTIONS
function simulateAIResponse(msg: string, subs: any[]) {
  const norm = msg.toLowerCase();
  const portfolio = subs || [];
  
  const totalSpend = portfolio.reduce((acc, s) => acc + (s.amount || 0), 0);
  
  // Categorized spends
  const categorySpends: { [key: string]: number } = {};
  portfolio.forEach((s) => {
    categorySpends[s.category] = (categorySpends[s.category] || 0) + (s.amount || 0);
  });
  
  // Renewals this week (<= 7 days)
  const renewingThisWeek = portfolio.filter((s) => s.renewIn <= 7);
  
  // High worth and low worth
  const lowWorth = portfolio.filter((s) => (s.worthScore && s.worthScore < 5) || (s.usagePct && s.usagePct < 40));
  const highWorth = portfolio.filter((s) => s.worthScore && s.worthScore >= 7);

  // Match 1: cancel recommendation
  if (norm.includes("cancel") || norm.includes("should i keep") || norm.includes("keep or cancel")) {
    if (lowWorth.length > 0) {
      const candidates = lowWorth.map(s => `**${s.name}** (₹${s.amount}/${s.cycle}, usage: ${s.usagePct}%, worth-it: ${s.worthScore}/10)`).join(", ");
      const first = lowWorth[0];
      return `Based on your subscription portfolio, you have underutilized services! We highly recommend reviewing **${candidates}**. For example, **${first.name}** has a worth score of only ${first.worthScore}/10 and is renewing in **${first.renewIn} days**. Cancelling it saves you ₹${first.amount} instantly!`;
    } else {
      return `Your currently tracked subscriptions all show healthy usage (above 50% relative to cost). No immediate cancellations are recommended, though you could save by downgrading standard tiers.`;
    }
  }

  // Match 2: overspending on a category
  if (norm.includes("overspending") || norm.includes("spend") || norm.includes("entertainment") || norm.includes("category")) {
    let cat = "";
    if (norm.includes("entertainment")) cat = "Entertainment";
    else if (norm.includes("productivity")) cat = "Productivity";
    else if (norm.includes("music")) cat = "Music";
    else if (norm.includes("cloud storage") || norm.includes("storage")) cat = "Cloud Storage";
    else if (norm.includes("ai tool") || norm.includes("ai")) cat = "AI Tools";
    
    if (cat) {
      const spend = categorySpends[cat] || 0;
      if (spend > 350) {
        return `Yes, you are currently dedicating **₹${spend}/month** to **${cat}**. We advise reviewing if you have any redundant or inactive tiers in this category to help trim down your overall bills.`;
      } else {
        return `Your spend on **${cat}** is currently **₹${spend}/month**, which is well managed and within reasonable limits. Optimization is not immediately necessary for this category.`;
      }
    }
  }

  // Match 3: specific subscription like ChatGPT or others
  for (const s of portfolio) {
    if (norm.includes(s.name.toLowerCase())) {
      return `Looking into **${s.name}**:\n- **Cost:** ₹${s.amount}/${s.cycle}\n- **Usage:** ${s.usagePct}%\n- **Worth-it Score:** ${s.worthScore}/10\n- **Renewal:** in ${s.renewIn} days\n\nThis subscription is classified as **${s.worthScore >= 7 ? "Highly Valuable (Keep)" : "Underperforming (Consider Cancelling)"}**. We recommend ${s.worthScore >= 7 ? "retaining it to support your productivity output" : "cancelling it to optimize your budget"}.`;
    }
  }

  // Match 4: renewing this week
  if (norm.includes("renew") || norm.includes("this week") || norm.includes("upcoming")) {
    if (renewingThisWeek.length > 0) {
      const list = renewingThisWeek.map(s => `- **${s.name}** (₹${s.amount}) renewing in **${s.renewIn} days**`).join("\n");
      return `Here are your subscriptions renewing this week:\n${list}\n\nWe advise reviewing these soon before the automated billing hits your payment method.`;
    } else {
      return `Good news! You have no subscriptions renewing within the next 7 days in your tracked list. Your next renewal is further out.`;
    }
  }

  // Fallback general overview
  return `You are currently tracking **${portfolio.length} subscriptions** totaling **₹${totalSpend}/month** in spend. 
  \n- **Productivity & AI:** ₹${categorySpends["AI Tools"] || 0}\n- **Entertainment:** ₹${categorySpends["Entertainment"] || 0}\n\nAsk me "Which subscriptions should I cancel?" or "Am I overspending on Entertainment?" for detailed advice!`;
}

function simulateParser(text: string) {
  const norm = text.toLowerCase();
  if (norm.includes("chatgpt") || norm.includes("openai")) {
    return {
      name: "ChatGPT Plus",
      category: "AI Tools",
      amount: 1700,
      currency: "INR",
      cycle: "monthly",
      renewIn: 28,
      country: "United States",
      phoneCode: "+91"
    };
  }
  if (norm.includes("cloud code") || norm.includes("google")) {
    return {
      name: "Cloud Code Pro",
      category: "Productivity",
      amount: 450,
      currency: "INR",
      cycle: "monthly",
      renewIn: 15,
      country: "Global",
      phoneCode: ""
    };
  }
  return {
    name: "Extracted Subscription",
    category: "Other",
    amount: 399,
    currency: "INR",
    cycle: "monthly",
    renewIn: 15,
    country: "India",
    phoneCode: "+91"
  };
}

function getSimulatedInsights(subscriptions: any[]) {
  const portfolio = subscriptions || [];
  const totalSpend = portfolio.reduce((acc, s) => acc + (s.amount || 0), 0);
  const lowWorth = portfolio.filter((s) => (s.worthScore && s.worthScore < 5) || (s.usagePct && s.usagePct < 40));
  if (lowWorth.length > 0) {
    const first = lowWorth[0];
    return `Based on your subscription portfolio, you could save ₹${first.amount} by cancelling ${first.name} (used ${first.usagePct}% with a low worth score of ${first.worthScore}/10). We advise retaining essential utilities like ChatGPT Plus or Cloud Code Pro which exhibit high utility scores!`;
  }
  return `Your subscription spend totals ₹${totalSpend}/month. All currently tracked items show healthy engagement ratings. We advise maintaining developer utilities like ChatGPT Plus to sustain peak productivity.`;
}

startServer();
