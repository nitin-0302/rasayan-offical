import express from "express";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import https from "https";
import fs from "fs";

dotenv.config();

const isProduction = process.env.NODE_ENV === "production";

let aiClient: GoogleGenAI | null = null;

function getGenAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is not configured on the server. Please add it to your environment variables.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

function getFallbackResponse(userMessage: string): string {
  const msg = (userMessage || "").toLowerCase().trim();
  
  // List of valid fest-related keywords
  const festKeywords = [
    "rasayan", "fest", "event", "panchtatva", "quiz", "mind battle", "mindscape", "shark", 
    "elemental", "tatva", "trail", "forensics", "treasure", "hunt", "srishti", "rahasya", 
    "shuffle", "atomic", "housie", "kismat", "doodle", "doodleium", "vision", "eco", 
    "reel", "reel-iemental", "meme", "sustain", "register", "price", 
    "fee", "cost", "date", "when", "venue", "where", "location", "college", "somaiya", 
    "admin", "help", "support", "contact", "human", "hi", "hello", "hey", "greetings"
  ];

  const isFestQuery = festKeywords.some(keyword => msg.includes(keyword));

  if (!isFestQuery) {
    return "I am the Rasayan 2026 AI Assistant, strictly sandboxed to assist with queries regarding the Rasayan 2026 Chemistry Festival, its events, registrations, schedule, and venue. Please ask me any question about the fest!";
  }

  if (msg.includes("register") || msg.includes("registration") || msg.includes("sign up") || msg.includes("apply") || msg.includes("join")) {
    return "You can easily register for any event through our website! Navigate to the **Events** or **Register** section, choose the events you want to participate in, fill out your team or individual details, and submit. You will receive an instant confirmation email with your unique Registration ID.";
  } 
  
  if (msg.includes("price") || msg.includes("fee") || msg.includes("cost") || msg.includes("how much") || msg.includes("payment") || msg.includes("amount")) {
    return "Here are the official registration fees for Rasayan 2026 events:\n\n" +
           "**On-Ground Events:**\n" +
           "- 🧠 **Green Mind Battle (Quiz)**: ₹50 (Solo)\n" +
           "- 🧩 **Mindscape 17 (Memory Challenge)**: ₹50 (Solo)\n" +
           "- 🦈 **Elemental Sharks (Shark Tank)**: ₹150 (Group of 1-3)\n" +
           "- ⏱️ **Tatva Trail (Minute to Win It)**: ₹250 (Group of 5)\n" +
           "- 🔍 **Eco-forensics**: ₹150 (Group of 1-3)\n" +
           "- 🗺️ **Srishti Rahasya (Treasure Hunt)**: ₹250 (Group of 5)\n" +
           "- 🔀 **Atomic Shuffle**: ₹30 (Solo)\n" +
           "- 🎟️ **Kismat (Housie)**: ₹20 (Solo)\n\n" +
           "**Online Events:**\n" +
           "- 🎨 **Doodleium (Doodling)**: ₹40 (Solo)\n" +
           "- 📷 **Eco-vision (Photography)**: ₹40 (Solo)\n" +
           "- 🎥 **Reel-iemental (Reels)**: ₹40 (Solo)\n" +
           "- 🤪 **Sustain-a-meme (Memes)**: ₹20 (Solo)";
  } 
  
  if (msg.includes("date") || msg.includes("when") || msg.includes("time") || msg.includes("schedule")) {
    return "Rasayan 2026 will be held on **December 16th, 2026**. Online event submissions (Doodleium, Eco-vision, Reel-iemental, Sustain-a-meme) close on **December 15th, 2026**.";
  } 
  
  if (msg.includes("venue") || msg.includes("where") || msg.includes("location") || msg.includes("college") || msg.includes("place") || msg.includes("somaiya")) {
    return "The festival is hosted at the **K J Somaiya College of Science and Commerce** campus located in Vidyavihar, Mumbai.";
  } 
  
  if (msg.includes("theme") || msg.includes("panchtatva")) {
    return "The theme for Rasayan 2026 is **'Panchtatva'**, celebrating the five basic elements of nature: Earth, Water, Fire, Air, and Space.";
  } 
  
  if (msg.includes("quiz") || msg.includes("mind battle") || msg.includes("green mind")) {
    return "The **Green Mind Battle** is our on-ground Chemistry Quiz! It is a solo competition (₹50 fee) conducted on the Kahoot app testing environmental and chemistry knowledge.";
  } 
  
  if (msg.includes("treasure") || msg.includes("hunt") || msg.includes("srishti rahasya")) {
    return "The **Srishti Rahasya** is our campus Treasure Hunt! Teams of 5 (₹250 per team) solve chemistry riddles to navigate clues around the campus.";
  } 
  
  if (msg.includes("help") || msg.includes("admin") || msg.includes("human") || msg.includes("contact") || msg.includes("support") || msg.includes("talk")) {
    return "If you need direct assistance from a coordinator, please switch to the **'Admin Chat'** mode at the top of this chat window to message our team directly!";
  } 
  
  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("greetings")) {
    return "Hello! I am your Rasayan 2026 Assistant. How can I assist you with our Chemistry Festival events, registrations, schedule, or fees today?";
  } 
  
  return "I am the Rasayan 2026 Assistant! I can answer questions about our 12 Chemistry Fest events, registration details, fees, schedule (Dec 16, 2026), venue, or theme 'Panchtatva'. Ask me anything about the festival!";
}

async function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), env: process.env.NODE_ENV });
  });

  // Global map to track active downloads to avoid duplicate simultaneous downloads for the same file
  const activeDownloads = new Map<string, Promise<string>>();

  // Function to ensure default videos are pre-cached in background on server start
  const preCacheVideo = (fileId: string) => {
    const cachePath = path.join(process.cwd(), `video_cache_${fileId}.mp4`);
    const tempPath = path.join(process.cwd(), `video_cache_${fileId}.tmp`);
    if (fs.existsSync(cachePath) || activeDownloads.has(fileId)) return;

    const googleUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
    const downloadPromise = new Promise<string>((resolve, reject) => {
      console.log(`Pre-caching banner video in background: ${fileId}`);
      const fileStream = fs.createWriteStream(tempPath);
      const download = (url: string) => {
        https.get(url, (googleRes) => {
          if (googleRes.statusCode && googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
            download(googleRes.headers.location);
            return;
          }
          if (googleRes.statusCode !== 200) {
            fileStream.close();
            try { fs.unlinkSync(tempPath); } catch (e) { console.warn("Unlink error:", e); }
            reject(new Error(`Pre-cache failed status: ${googleRes.statusCode}`));
            return;
          }
          googleRes.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close();
            try {
              fs.renameSync(tempPath, cachePath);
              console.log(`Pre-cache complete for video ${fileId}`);
              resolve(cachePath);
            } catch (err) { reject(err); }
          });
        }).on("error", (err) => {
          fileStream.close();
          try { fs.unlinkSync(tempPath); } catch (e) { console.warn("Unlink error:", e); }
          reject(err);
        });
      };
      download(googleUrl);
    });

    activeDownloads.set(fileId, downloadPromise);
    downloadPromise.catch(() => activeDownloads.delete(fileId));
  };

  // Pre-cache primary video assets
  preCacheVideo("1QePHrtCffJD4oREs6rvtPvS9-J2BYJe_");
  preCacheVideo("1K8I6-RjaWRO9s36OP4eHryrBzXa8LLkH");

  app.get("/api/video-proxy", (req, res) => {
    const fileId = req.query.id as string || "1QePHrtCffJD4oREs6rvtPvS9-J2BYJe_";
    const cachePath = path.join(process.cwd(), `video_cache_${fileId}.mp4`);
    const tempPath = path.join(process.cwd(), `video_cache_${fileId}.tmp`);

    // If the complete cached file exists, serve it directly with strong browser caching
    if (fs.existsSync(cachePath)) {
      return res.sendFile(cachePath, {
        maxAge: "30d",
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "video/mp4",
          "Cache-Control": "public, max-age=2592000, immutable"
        }
      });
    }

    const googleUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;

    // Start background download to cache if not already downloading
    if (!activeDownloads.has(fileId)) {
      const downloadPromise = new Promise<string>((resolve, reject) => {
        console.log(`Starting background cache download for video ID: ${fileId}`);
        const fileStream = fs.createWriteStream(tempPath);
        
        const download = (url: string) => {
          https.get(url, (googleRes) => {
            if (googleRes.statusCode && googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
              download(googleRes.headers.location);
              return;
            }
            if (googleRes.statusCode !== 200) {
              fileStream.close();
              try { fs.unlinkSync(tempPath); } catch { /* ignore if already unlinked */ }
              reject(new Error(`Failed to download from Google Drive, status: ${googleRes.statusCode}`));
              return;
            }

            googleRes.pipe(fileStream);

            fileStream.on("finish", () => {
              fileStream.close();
              try {
                fs.renameSync(tempPath, cachePath);
                console.log(`Successfully cached video ${fileId} locally!`);
                resolve(cachePath);
              } catch (err) {
                reject(err);
              }
            });
          }).on("error", (err) => {
            fileStream.close();
            try { fs.unlinkSync(tempPath); } catch { /* ignore if already unlinked */ }
            reject(err);
          });
        };

        download(googleUrl);
      });

      activeDownloads.set(fileId, downloadPromise);
      downloadPromise.catch((err) => {
        console.error(`Background download failed for ${fileId}:`, err);
        activeDownloads.delete(fileId);
      });
    }

    // For the current request, if the file is not cached yet, we proxy the stream directly to the client.
    // This ensures the video starts playing immediately on the first load while caching compiles in the background.
    const requestOptions: https.RequestOptions = {
      headers: {}
    };
    if (req.headers.range) {
      requestOptions.headers!["Range"] = req.headers.range;
    }

    const proxyStream = (targetUrl: string) => {
      https.get(targetUrl, requestOptions, (googleRes) => {
        if (googleRes.statusCode && googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
          proxyStream(googleRes.headers.location);
          return;
        }

        res.status(googleRes.statusCode || 200);
        
        // Forward headers except CSP and Attachment dispositive headers
        Object.entries(googleRes.headers).forEach(([key, value]) => {
          if (value !== undefined) {
            const lowerKey = key.toLowerCase();
            if (lowerKey === "content-disposition") {
              res.setHeader("Content-Disposition", "inline");
            } else if (
              lowerKey !== "cross-origin-resource-policy" && 
              lowerKey !== "cross-origin-opener-policy" && 
              lowerKey !== "cross-origin-embedder-policy" &&
              lowerKey !== "content-security-policy" &&
              lowerKey !== "x-content-security-policy" &&
              lowerKey !== "x-frame-options"
            ) {
              res.setHeader(key, value);
            }
          }
        });

        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Content-Disposition", "inline");
        googleRes.pipe(res);
      }).on("error", (err) => {
        console.error("Proxy stream error:", err);
        if (!res.headersSent) {
          res.status(500).send("Video streaming error");
        }
      });
    };

    proxyStream(googleUrl);
  });

  app.post("/api/gemini/chat", async (req, res) => {
    const { message, history } = req.body;
    
    // Check if key is available
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not configured. Using local fallback response.");
      const fallback = getFallbackResponse(message);
      return res.json({ text: fallback });
    }
    
    try {
      const ai = getGenAI();

      const SYSTEM_INSTRUCTION = `You are the official AI Assistant for Rasayan 2026, the annual Chemistry Festival organized by K J Somaiya College of Science and Commerce, Vidyavihar, Mumbai.

CRITICAL SANDBOX RULE (STRICT MANDATE):
You are STRICTLY RESTRICTED to ONLY answering queries related to Rasayan 2026, its theme ('Panchtatva'), its 13 events, registration process, fees, schedule, venue, rules, and admin support.
If the user asks about ANY UNRELATED TOPIC (such as general programming, math homework, general science, news, sports, recipes, politics, weather, personal advice, or off-topic chatter), YOU MUST DECLINE IMMEDIATELY WITH THIS EXACT PHRASE:
"I am the Rasayan 2026 AI Assistant, strictly sandboxed to assist with queries regarding the Rasayan 2026 Chemistry Festival, its events, registrations, schedule, and venue. Please ask me any question about the fest!"

OFFICIAL FESTIVAL INFORMATION:
- Event Name: Rasayan 2026 (Annual Chemistry Festival)
- Organizer: K J Somaiya College of Science and Commerce, Vidyavihar, Mumbai
- Theme: "Panchtatva" (Earth, Water, Fire, Air, Space)
- Festival Date: December 16, 2026
- Venue: K J Somaiya College of Science and Commerce campus, Vidyavihar, Mumbai

OFFICIAL EVENTS & GAMES (TOTAL 12 EVENTS):
1. Green Mind Battle (Quiz): ₹50 (Solo). On-ground Kahoot quiz testing environmental and chemistry knowledge.
2. Mindscape 17 (Memory Challenge): ₹50 (Solo). 2 mins to memorize 17 sustainability principles.
3. Elemental Sharks (Shark Tank): ₹150 (Group of 1 to 3). Pitch sustainable chemistry idea/prototype (5-8 mins).
4. Tatva Trail (Minute to Win It): ₹250 (Group of 5). Fast-paced 1-minute elemental team tasks.
5. Eco-forensics: ₹150 (Group of 1 to 3). Solve eco-crime case with chemical evidence.
6. Srishti Rahasya (Treasure Hunt): ₹250 (Group of 5). Solve chemistry riddles to hunt treasure around campus.
7. Atomic Shuffle: ₹30 (Solo). Dance/movement to music, form groups equal to announced atomic number.
8. Kismat (Housie): ₹20 (Solo). Chemistry atomic numbers housie game.
9. Doodleium (Doodling): ₹40 (Solo, Online). Digital or handmade doodle on Panchtatva/Chemistry. Deadline: Dec 15, 2026, 12:00 PM.
10. Eco-vision (Photography): ₹40 (Solo, Online). High-res chemistry in nature photo + description. Deadline: Dec 15, 2026, 12:00 PM.
11. Reel-iemental (Reels): ₹40 (Solo, Online). 10-30 sec creative video reel on Panchtatva/Chemistry. Deadline: Dec 15, 2026, 12:00 AM.
12. Sustain-a-meme (Memes): ₹20 (Solo, Online). Chemistry & sustainability memes. Deadline: Dec 15, 2026, 12:00 AM.

REGISTRATION DETAILS:
Participants can register directly through the website under the "Events" or "Register" tabs. An email with a unique Registration ID will be sent upon registration.

HUMAN ADMIN ASSISTANCE:
If the user wants to speak with a human student coordinator or needs custom assistance, tell them: "You can switch to 'Admin Chat' at the top of this chatbot window to send a direct message to our coordinator team."

FORMATTING GUIDELINES:
Keep answers concise, clear, polite, and well-structured using bullet points and **bold** text. Do NOT use raw code blocks or markdown code syntax.`;

      // Construct contents array with history if provided
      const formattedContents: any[] = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history) {
          if (item.text && (item.role === 'user' || item.role === 'model')) {
            formattedContents.push({
              role: item.role,
              parts: [{ text: item.text }]
            });
          }
        }
      }
      if (formattedContents.length === 0 || formattedContents[formattedContents.length - 1].role !== 'user') {
        formattedContents.push({
          role: 'user',
          parts: [{ text: message || "Hello" }]
        });
      }

      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: formattedContents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
      } catch (primaryError: any) {
        console.warn("gemini-3.6-flash failed, trying gemini-3.1-flash-lite fallback:", primaryError);
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: formattedContents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
      }

      if (!response || !response.text) {
        throw new Error("Empty response from AI");
      }

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini Error:", error);
      const fallback = getFallbackResponse(message);
      res.json({ text: fallback });
    }
  });

  app.post("/api/notify-admin", async (req, res) => {
    const { registrationData, userName, userEmail, uniqueCode } = req.body;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const adminEmails = process.env.ADMIN_EMAIL || 'brothernitin99@gmail.com,nitin.c@somaiya.edu';

    if (!host || !user || !pass) {
      console.warn("SMTP credentials not fully configured. Email skipped.");
      return res.status(200).json({ message: "Email skipped (SMTP not configured)", success: false });
    }

    try {
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });

      const eventsList = registrationData.map((reg: any) => `- ${reg.eventName} (${reg.type})`).join('\n');

      const adminMailOptions = {
        from: `"Rasayan 2026 Admin" <${user}>`,
        to: adminEmails,
        subject: `New Registration [ID: ${uniqueCode}]: ${userName}`,
        text: `Hello Admin,\n\nA new user has registered for events at Rasayan 2026.\n\nParticipant Details:\n- Name: ${userName}\n- Email: ${userEmail}\n- Registration ID: ${uniqueCode}\n- College: ${registrationData[0]?.college || 'Not specified'}\n\nEvents Registered:\n${eventsList}\n\nPlease check the Admin Dashboard for more details.`,
      };

      const userMailOptions = {
        from: `"Rasayan 2026" <${user}>`,
        to: userEmail,
        subject: `Registration Confirmed: Rasayan 2026`,
        text: `Hello ${userName},\n\nYour registration for Rasayan 2026 is confirmed!\n\nYour Unique Registration ID is: ${uniqueCode}\n\nPlease keep this ID safe as it will be required during the event for verification.\n\nEvents you registered for:\n${eventsList}\n\nVenue: K J Somaiya College of Science and Commerce\nDate: 16th December, 2026\n\nWe look forward to seeing you!\n\nBest regards,\nTeam Rasayan 2026`,
      };

      await transporter.sendMail(adminMailOptions);
      await transporter.sendMail(userMailOptions);

      res.json({ message: "Notification emails sent", success: true });
    } catch (error) {
      console.error("Error sending registration emails:", error);
      res.status(500).json({ error: "Failed to send notification emails", success: false });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production (Vercel or build), serve static files
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  return app;
}

async function startServer() {
  const app = await createServer();
  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer();
}

let cachedApp: any = null;

export default async (req: any, res: any) => {
  if (!cachedApp) {
    cachedApp = await createServer();
  }
  return cachedApp(req, res);
};

