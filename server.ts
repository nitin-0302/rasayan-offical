import express from "express";
import path from "path";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import cors from "cors";
import { GoogleGenAI } from "@google/genai";
import { google } from "googleapis";
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
  
  // Technical issues check first
  const techKeywords = [
    "bug", "error", "failed", "fail", "issue", "problem", "payment", "transaction",
    "login", "password", "reset", "otp", "account", "unable", "crash", "not working",
    "technical", "glitch", "broken", "stuck", "refund"
  ];
  if (techKeywords.some(kw => msg.includes(kw))) {
    return "⚡ *Bzzzt!* Sounds like an activation energy error! For technical bugs, payment glitches, or direct human support, switch to the **'Admin Help'** tab at the top of this chat to message our event coordinators directly! 🛡️";
  }

  if (msg.includes("register") || msg.includes("registration") || msg.includes("sign up") || msg.includes("apply") || msg.includes("join")) {
    return "🚀 **Ready to react?** Registering is smoother than a noble gas reaction! Just head over to our **Events** or **Register** tab, pick your favorite elemental challenges, fill in your details, and boom—you'll get an instant confirmation pass with a unique QR code! 🎟️✨";
  } 
  
  if (msg.includes("price") || msg.includes("fee") || msg.includes("cost") || msg.includes("how much") || msg.includes("payment") || msg.includes("amount")) {
    return "💸 **Affordable element prices ahead!** Check out the official entry fees:\n\n" +
           "🏛️ **On-Ground Thrills:**\n" +
           "- 🧠 **Green Mind Battle (Quiz)**: ₹50 (Solo)\n" +
           "- 🧩 **Mindscape 17 (Memory Challenge)**: ₹50 (Solo)\n" +
           "- 🦈 **Elemental Sharks (Shark Tank)**: ₹150 (Group of 1-3)\n" +
           "- ⏱️ **Tatva Trail (Minute to Win It)**: ₹250 (Group of 5)\n" +
           "- 🔍 **Eco-forensics**: ₹150 (Group of 1-3)\n" +
           "- 🗺️ **Srishti Rahasya (Treasure Hunt)**: ₹250 (Group of 5)\n" +
           "- 🔀 **Atomic Shuffle**: ₹30 (Solo)\n" +
           "- 🎟️ **Kismat (Housie)**: ₹20 (Solo)\n\n" +
           "💻 **Online Creative Battles:**\n" +
           "- 🎨 **Doodleium (Doodling)**: ₹40 (Solo)\n" +
           "- 📷 **Eco-vision (Photography)**: ₹40 (Solo)\n" +
           "- 🎥 **Reel-iemental (Reels)**: ₹40 (Solo)\n" +
           "- 🤪 **Sustain-a-meme (Memes)**: ₹20 (Solo)";
  } 
  
  if (msg.includes("date") || msg.includes("when") || msg.includes("time") || msg.includes("schedule")) {
    return "📅 **Mark your atomic calendars!** The main festival explodes into action on **December 16th, 2026** at K J Somaiya Campus! 🌟 Note: Online submissions (Doodleium, Eco-vision, Reel-iemental, Sustain-a-meme) lock in on **December 15th, 2026**! Don't let your deadlines decay!";
  } 
  
  if (msg.includes("venue") || msg.includes("where") || msg.includes("location") || msg.includes("college") || msg.includes("place") || msg.includes("somaiya")) {
    return "📍 **Destination Science!** Rasayan 2026 takes place at **K J Somaiya College of Science and Commerce**, Vidyavihar, Mumbai. Follow the smell of chemical excitement and laughter!";
  } 
  
  if (msg.includes("theme") || msg.includes("panchtatva")) {
    return "🔥🌊🌍💨🌌 The theme is **'Panchtatva'** — honoring the five sacred elements of nature: **Earth (Prithvi), Water (Jal), Fire (Agni), Air (Vayu), and Space (Akash)**! Everything in chemistry traces back to these fundamental forces!";
  } 
  
  if (msg.includes("quiz") || msg.includes("mind battle") || msg.includes("green mind")) {
    return "🧠 **Green Mind Battle:** A high-octane Kahoot quiz (₹50 solo) where you test your eco-chemistry brainpower! Fast thumbs + sharp memory = Gold medal!";
  } 
  
  if (msg.includes("treasure") || msg.includes("hunt") || msg.includes("srishti rahasya")) {
    return "🗺️ **Srishti Rahasya:** The ultimate campus Treasure Hunt! Teams of 5 (₹250) crack chemical riddles and navigate mystery trails around Somaiya campus. Bring your Sherlock Holmes goggles!";
  } 

  if (msg.includes("joke") || msg.includes("funny") || msg.includes("pun")) {
    return "🧪 **Chemistry Joke Time!** Why do chemists like nitrates so much? Because they're cheaper than day rates! 💥 Or why can't you trust atoms? Because they make up everything! ⚛️ Ask me anything else about Rasayan 2026 events!";
  }
  
  if (msg.includes("help") || msg.includes("admin") || msg.includes("contact") || msg.includes("support")) {
    return "🤝 Need direct human interaction? Switch to the **'Admin Help'** tab at the top of this chat window to talk directly with our festival organizers!";
  }

  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("greetings")) {
    return "👋 **Hey there, fellow atom!** Welcome to the Rasayan 2026 Fest AI! I'm loaded with energy, chemistry puns, and all details about our 12 amazing Panchtatva events. What would you like to explore today? 🧪✨";
  } 
  
  return "🧪 **I am Rasayan 2026 AI — reacting with answers!** Ask me about any of our 12 events (Treasure Hunt, Shark Tank, Memory, Memes, Reels, etc.), fees, schedule (Dec 16, 2026), Panchtatva theme, or even for a chemistry joke! What's on your mind?";
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

      const SYSTEM_INSTRUCTION = `You are "Rasayan AI" — the ultimate, high-energy, witty, hilarious, and deeply knowledgeable Chemistry Fest Genie & AI Assistant for Rasayan 2026, the annual Chemistry Festival of K J Somaiya College of Science and Commerce, Vidyavihar, Mumbai.

YOUR PERSONALITY & WITTY HUMOR:
- Tone: Highly energetic, witty, clever, funny, and engaging! Always weave in hilarious chemistry puns (e.g., "Reacting with excitement!", "Don't lose your valence electrons!", "This event is noble-gas tier awesome!", "Zero activation energy required!", "I'm positively charged to help!").
- Humor: Explain events, rules, winning strategies, memory hacks, and chemistry concepts with punchy jokes, funny analogies, witty banter, and lively emojis!
- Deep Knowledge: You know EVERYTHING about Rasayan 2026, its theme "Panchtatva", its 12 official events, fees, schedule, venue, registration steps, winning tips, Kahoot quizzes, treasure hunt secrets, meme advice, and general chemistry trivia!

OFFICIAL FESTIVAL INFORMATION:
- Event Name: Rasayan 2026 (Annual Chemistry Festival)
- Organizer: K J Somaiya College of Science and Commerce, Vidyavihar, Mumbai
- Theme: "Panchtatva" (Earth, Water, Fire, Air, Space)
- Main Event Date: December 16, 2026
- Venue: K J Somaiya College of Science and Commerce campus, Vidyavihar, Mumbai

OFFICIAL 12 EVENTS & GAMES (EXPLAIN WITH WIT & ENTHUSIASM):
1. 🧠 Green Mind Battle (Quiz): ₹50 (Solo). On-ground Kahoot quiz clash! Fast-paced eco & chemistry trivia. Win with rapid thumbs and sharp electron brainpower!
2. 🧩 Mindscape 17 (Memory Challenge): ₹50 (Solo). You get 2 minutes to memorize 17 sustainability principles shown in random order. Test if your brain storage is ultra-fast SSD or RAM-limited!
3. 🦈 Elemental Sharks (Shark Tank): ₹150 (Group of 1-3). Pitch your sustainable chemistry startup or eco-prototype in 5-8 mins to the ruthless Sharks!
4. ⏱️ Tatva Trail (Minute to Win It): ₹250 (Group of 5). 1-minute elemental team tasks representing Earth, Water, Fire, Air, Space! Fast, chaotic, and hilarious!
5. 🔍 Eco-forensics: ₹150 (Group of 1-3). Play eco-detective! Solve chemical crime scenes, analyze toxic evidence, and unmask the environmental villain.
6. 🗺️ Srishti Rahasya (Treasure Hunt): ₹250 (Group of 5). Campus-wide adventure! Solve chemistry riddles to hunt hidden clues across Somaiya campus. Bring your detective goggles!
7. 🔀 Atomic Shuffle: ₹30 (Solo). Dance when music plays, then group up according to the atomic number called! Miss a group and you get oxidized (eliminated)!
8. 🎟️ Kismat (Housie): ₹20 (Solo). Chemistry atomic number housie! Let your lucky isotopes decide your win.
9. 🎨 Doodleium (Doodling): ₹40 (Solo, Online). Digital or handmade doodles on Panchtatva & Chemistry. Deadline: Dec 15, 2026, 12:00 PM.
10. 📷 Eco-vision (Photography): ₹40 (Solo, Online). Capture chemistry in nature (refraction in droplets, leaf colors). Deadline: Dec 15, 2026, 12:00 PM.
11. 🎥 Reel-iemental (Reels): ₹40 (Solo, Online). 10-30 sec Instagram-style reels on chemical phenomena or lab humor. Deadline: Dec 15, 2026, 12:00 AM.
12. 🤪 Sustain-a-meme (Memes): ₹20 (Solo, Online). Craft viral chemistry & green sustainability memes. Deadline: Dec 15, 2026, 12:00 AM.

ROUTING FOR TECHNICAL BUGS & ADMIN SUPPORT:
If the user asks about payment glitches, ticket verification, account issues, or wants to talk to human event coordinators, politely remind them:
"For technical issues, payment errors, or human coordinator help, please switch to the **'Admin Help'** tab at the top of this chat window to message our team directly!"

FORMATTING & RESPONSE STYLE:
Always answer thoroughly, humorously, and clearly using bold text, bullet points, and fun emojis. Keep answers entertaining and informative!`;

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
          model: "gemini-2.5-flash",
          contents: formattedContents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
      } catch (primaryError: any) {
        console.warn("gemini-2.5-flash failed, trying gemini-2.5-pro fallback:", primaryError);
        response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
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

  // =========================================================
  // GOOGLE SHEETS SYNC & INTEGRATION ENDPOINTS
  // =========================================================

  function formatRegistrationRow(reg: any) {
    const code = reg.uniqueCode || reg.id || 'N/A';
    const name = reg.userName || reg.name || 'Participant';
    const email = reg.userEmail || reg.email || 'N/A';
    const phone = reg.phone || 'N/A';
    const college = reg.college || 'N/A';
    const eventsStr = Array.isArray(reg.eventNames)
      ? reg.eventNames.join(', ')
      : Array.isArray(reg.eventIds)
        ? reg.eventIds.join(', ')
        : String(reg.events || 'N/A');
    const fee = reg.totalAmount !== undefined ? reg.totalAmount : 0;
    const method = String(reg.paymentMethod || 'upi').toUpperCase();
    const utr = reg.transactionId || 'N/A';
    const status = String(reg.paymentStatus || 'pending').toUpperCase();
    const dateStr = reg.registrationTime ? new Date(reg.registrationTime).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }) : new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });

    return [code, name, email, phone, college, eventsStr, fee, method, utr, status, dateStr];
  }

  // Route 1: Create a new Rasayan 2026 Google Sheet on behalf of user
  app.post("/api/gsheets/create", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = req.body.accessToken || (authHeader ? authHeader.replace('Bearer ', '') : null);

      if (!accessToken) {
        return res.status(401).json({ error: "Google OAuth Access Token is required to create a spreadsheet." });
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const sheets = google.sheets({ version: 'v4', auth });

      const createRes = await sheets.spreadsheets.create({
        requestBody: {
          properties: {
            title: 'Rasayan 2026 - Participant Registrations',
          },
          sheets: [
            {
              properties: {
                title: 'Participants',
                gridProperties: {
                  frozenRowCount: 1,
                },
              },
            },
          ],
        },
      });

      const spreadsheetId = createRes.data.spreadsheetId;
      const spreadsheetUrl = createRes.data.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

      const headers = [
        ['Unique Pass Code', 'Participant Name', 'Email', 'Phone Number', 'College Name', 'Registered Events', 'Total Fee (₹)', 'Payment Method', 'Transaction ID / UTR', 'Payment Status', 'Registration Date']
      ];

      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Participants!A1:K1',
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: headers },
      });

      try {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId,
          requestBody: {
            requests: [
              {
                repeatCell: {
                  range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                  cell: {
                    userEnteredFormat: {
                      backgroundColor: { red: 0.08, green: 0.12, blue: 0.25 },
                      textFormat: { bold: true, foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 11 },
                      horizontalAlignment: 'CENTER',
                    },
                  },
                  fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)',
                },
              },
            ],
          },
        });
      } catch (styleErr) {
        console.warn("Header formatting warning (non-fatal):", styleErr);
      }

      res.json({ success: true, spreadsheetId, spreadsheetUrl });
    } catch (err: any) {
      console.error("Failed to create Google Sheet:", err);
      res.status(500).json({ error: err.message || "Failed to create Google Sheet." });
    }
  });

  // Route 2: Sync all participants batch to a Google Sheet
  app.post("/api/gsheets/sync", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = req.body.accessToken || (authHeader ? authHeader.replace('Bearer ', '') : null);
      const { spreadsheetId, registrations } = req.body;

      if (!spreadsheetId) {
        return res.status(400).json({ error: "spreadsheetId parameter is required." });
      }
      if (!accessToken) {
        return res.status(401).json({ error: "Google OAuth Access Token is required." });
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const sheets = google.sheets({ version: 'v4', auth });

      const headers = [
        ['Unique Pass Code', 'Participant Name', 'Email', 'Phone Number', 'College Name', 'Registered Events', 'Total Fee (₹)', 'Payment Method', 'Transaction ID / UTR', 'Payment Status', 'Registration Date']
      ];

      const rows = (Array.isArray(registrations) ? registrations : []).map(formatRegistrationRow);

      await sheets.spreadsheets.values.update({
        spreadsheetId: spreadsheetId.trim(),
        range: 'Participants!A1',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [...headers, ...rows]
        },
      });

      res.json({
        success: true,
        updatedCount: rows.length,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId.trim()}/edit`
      });
    } catch (err: any) {
      console.error("Failed to sync registrations to Google Sheet:", err);
      res.status(500).json({ error: err.message || "Failed to sync to Google Sheet." });
    }
  });

  // Route 3: Append single new participant row
  app.post("/api/gsheets/append", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const accessToken = req.body.accessToken || (authHeader ? authHeader.replace('Bearer ', '') : null);
      const { spreadsheetId, registration } = req.body;

      if (!spreadsheetId) {
        return res.status(400).json({ error: "spreadsheetId parameter is required." });
      }
      if (!accessToken) {
        return res.status(401).json({ error: "Google OAuth Access Token is required." });
      }

      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: accessToken });

      const sheets = google.sheets({ version: 'v4', auth });
      const row = formatRegistrationRow(registration);

      await sheets.spreadsheets.values.append({
        spreadsheetId: spreadsheetId.trim(),
        range: 'Participants!A:K',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [row]
        },
      });

      res.json({ success: true, message: "Participant appended to Google Sheet." });
    } catch (err: any) {
      console.error("Failed to append participant to Google Sheet:", err);
      res.status(500).json({ error: err.message || "Failed to append to Google Sheet." });
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

