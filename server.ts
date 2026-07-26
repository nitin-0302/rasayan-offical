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
  const msg = (userMessage || "").toLowerCase();
  
  let reply: string;
  if (msg.includes("register") || msg.includes("registration") || msg.includes("sign up") || msg.includes("apply") || msg.includes("join")) {
    reply = "You can easily register for any event through our platform! Head to the **Events** or **Dashboard** section, select the game you want to join, fill in the required participant or team details, and submit your registration details to secure your spot.";
  } else if (msg.includes("price") || msg.includes("fee") || msg.includes("cost") || msg.includes("how much") || msg.includes("payment") || msg.includes("amount")) {
    reply = "Here are the registration fees for the Rasayan 2026 events:\n\n" +
            "**On-Ground Events:**\n" +
            "- 🧠 **Green Mind Battle (Quiz)**: ₹50 (Solo)\n" +
            "- 🧩 **Mindscape 17 (Memory Challenge)**: ₹50 (Solo)\n" +
            "- 🦈 **Elemental Sharks (Shark Tank)**: ₹150 (Group of up to 3)\n" +
            "- ⏱️ **Tatva Trail (Minute to Win It)**: ₹250 (Group of 5)\n" +
            "- 🔍 **Eco-forensics**: ₹150 (Group of up to 3)\n" +
            "- 🗺️ **Srishti Rahasya (Treasure Hunt)**: ₹250 (Group of 5)\n" +
            "- 🔀 **Atomic Shuffle**: ₹30 (Solo)\n" +
            "- 🎟️ **Kismat (Housie)**: ₹20 (Solo)\n\n" +
            "**Online/Digital Events:**\n" +
            "- 🎨 **Doodleium (Doodling)**: ₹40 (Solo)\n" +
            "- 📷 **Eco-vision (Photography)**: ₹40 (Solo)\n" +
            "- 🎥 **Reel-iemental (Reels)**: ₹40 (Solo)\n" +
            "- 🏷️ **Labellab (Label Designing)**: ₹40 (Solo)\n" +
            "- 🤪 **Sustain-a-meme (Memes)**: ₹20 (Solo)";
  } else if (msg.includes("date") || msg.includes("when") || msg.includes("time") || msg.includes("schedule")) {
    reply = "Rasayan 2026 is scheduled to take place on **December 16th, 2026**. Make sure to register in advance to reserve your entry!";
  } else if (msg.includes("venue") || msg.includes("where") || msg.includes("location") || msg.includes("college") || msg.includes("place")) {
    reply = "The festival is hosted at the **K J Somaiya College of Science and Commerce** campus located in Vidyavihar, Mumbai.";
  } else if (msg.includes("theme") || msg.includes("panchtatva")) {
    reply = "The theme for Rasayan 2026 is **'Panchtatva'**, celebrating the five basic elements of nature: Earth, Water, Fire, Air, and Space. All fests, games, and competitions are designed around this beautiful theme!";
  } else if (msg.includes("quiz") || msg.includes("mind battle") || msg.includes("green mind")) {
    reply = "The **Green Mind Battle** is our premium Chemistry Quiz event! It is a solo competition with a nominal fee of ₹50. It features multiple exciting rounds testing your scientific wit.";
  } else if (msg.includes("treasure") || msg.includes("hunt") || msg.includes("srishti rahasya")) {
    reply = "The **Srishti Rahasya** is our popular Chemistry Treasure Hunt! Designed for a team of 5, the registration fee is ₹250 per team. Participants solve chemistry riddles to navigate around the campus!";
  } else if (msg.includes("help") || msg.includes("admin") || msg.includes("human") || msg.includes("contact") || msg.includes("support") || msg.includes("talk")) {
    reply = "If you have a specific inquiry or need direct assistance, you can switch the chatbot to the **'Admin Help'** tab right at the top of this window. This connects you directly with our student coordinator helpdesk!";
  } else if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("greetings")) {
    reply = "Hello there! I am your Rasayan 2026 Assistant. How can I assist you with the chemistry festival today?";
  } else {
    reply = "I'm the Rasayan 2026 Assistant! I can help you with event details, registrations, fees, rules, schedule, and venue of the Chemistry Festival. Ask me about our theme **'Panchtatva'**, any of our 13 events, or toggle to **'Admin Help'** to contact a coordinator.";
  }

  return reply;
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

  app.get("/api/video-proxy", (req, res) => {
    const fileId = req.query.id as string || "1K8I6-RjaWRO9s36OP4eHryrBzXa8LLkH";
    const cachePath = path.join(process.cwd(), `video_cache_${fileId}.mp4`);
    const tempPath = path.join(process.cwd(), `video_cache_${fileId}.tmp`);

    // If the complete cached file exists, serve it directly
    if (fs.existsSync(cachePath)) {
      return res.sendFile(cachePath, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "video/mp4",
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
    const { message } = req.body;
    
    // Check if key is available
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not configured. Using local fallback response.");
      const fallback = getFallbackResponse(message);
      return res.json({ text: fallback });
    }
    
    try {
      const ai = getGenAI();
      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: message || "Hello",
          config: {
            systemInstruction: "You are the Rasayan 2026 Assistant. Rasayan is the annual Chemistry Festival organized by K J Somaiya College of Science and Commerce. This year's theme is 'Panchtatva'. You help users with event information, registration queries, and general fest details.\n\nHere are the official event/game prices for registration:\n- Green Mind Battle (Quiz): ₹50 (Solo)\n- Mindscape 17 (Memory Challenge): ₹50 (Solo)\n- Elemental Sharks (Shark Tank): ₹150 (Group up to 3)\n- Tatva Trail (Minute to Win It): ₹250 (Group of 5)\n- Eco-forensics: ₹150 (Group up to 3)\n- Srishti Rahasya (Treasure Hunt): ₹250 (Group of 5)\n- Atomic Shuffle: ₹30 (Solo)\n- Kismat (Housie): ₹20 (Solo)\n- Doodleium (Doodling): ₹40 (Solo, Online)\n- Eco-vision (Photography): ₹40 (Solo, Online)\n- Reel-iemental (Reels): ₹40 (Solo, Online)\n- Labellab (Label Designing): ₹40 (Solo, Online)\n- Sustain-a-meme (Memes): ₹20 (Solo, Online)\n\nIf you don't know something, be honest. Keep replies concise, clean, and friendly. Avoid using raw markdown symbols for formatting that look like code blocks, but bold text using **bold** is completely fine. If the user wants to talk to a human admin, tell them they can switch to 'Admin Chat' mode in the chatbot.",
          },
        });
      } catch (liteError: any) {
        console.warn("gemini-3.1-flash-lite failed, trying gemini-3.5-flash fallback:", liteError);
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: message || "Hello",
          config: {
            systemInstruction: "You are the Rasayan 2026 Assistant. Rasayan is the annual Chemistry Festival organized by K J Somaiya College of Science and Commerce. This year's theme is 'Panchtatva'. You help users with event information, registration queries, and general fest details.\n\nHere are the official event/game prices for registration:\n- Green Mind Battle (Quiz): ₹50 (Solo)\n- Mindscape 17 (Memory Challenge): ₹50 (Solo)\n- Elemental Sharks (Shark Tank): ₹150 (Group up to 3)\n- Tatva Trail (Minute to Win It): ₹250 (Group of 5)\n- Eco-forensics: ₹150 (Group up to 3)\n- Srishti Rahasya (Treasure Hunt): ₹250 (Group of 5)\n- Atomic Shuffle: ₹30 (Solo)\n- Kismat (Housie): ₹20 (Solo)\n- Doodleium (Doodling): ₹40 (Solo, Online)\n- Eco-vision (Photography): ₹40 (Solo, Online)\n- Reel-iemental (Reels): ₹40 (Solo, Online)\n- Labellab (Label Designing): ₹40 (Solo, Online)\n- Sustain-a-meme (Memes): ₹20 (Solo, Online)\n\nIf you don't know something, be honest. Keep replies concise, clean, and friendly. Avoid using raw markdown symbols for formatting that look like code blocks, but bold text using **bold** is completely fine. If the user wants to talk to a human admin, tell them they can switch to 'Admin Chat' mode in the chatbot.",
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

