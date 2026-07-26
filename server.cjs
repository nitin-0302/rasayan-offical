var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// server.ts
var server_exports = {};
__export(server_exports, {
  default: () => server_default
});
module.exports = __toCommonJS(server_exports);
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);
var import_nodemailer = __toESM(require("nodemailer"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_genai = require("@google/genai");
var import_https = __toESM(require("https"), 1);
var import_fs = __toESM(require("fs"), 1);
import_dotenv.default.config();
var isProduction = process.env.NODE_ENV === "production";
var aiClient = null;
function getGenAI() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key is not configured on the server. Please add it to your environment variables.");
    }
    aiClient = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiClient;
}
function getFallbackResponse(userMessage) {
  const msg = (userMessage || "").toLowerCase().trim();
  const techKeywords = [
    "bug",
    "error",
    "failed",
    "fail",
    "issue",
    "problem",
    "payment",
    "transaction",
    "login",
    "password",
    "reset",
    "otp",
    "account",
    "unable",
    "crash",
    "not working",
    "technical",
    "glitch",
    "broken",
    "stuck",
    "refund"
  ];
  if (techKeywords.some((kw) => msg.includes(kw))) {
    return "For technical issues, payment errors, or account help, please switch to the **'Admin Help'** tab at the top of this chat window to message our technical support team directly.";
  }
  const festKeywords = [
    "rasayan",
    "fest",
    "event",
    "panchtatva",
    "quiz",
    "mind battle",
    "mindscape",
    "shark",
    "elemental",
    "tatva",
    "trail",
    "forensics",
    "treasure",
    "hunt",
    "srishti",
    "rahasya",
    "shuffle",
    "atomic",
    "housie",
    "kismat",
    "doodle",
    "doodleium",
    "vision",
    "eco",
    "reel",
    "reel-iemental",
    "meme",
    "sustain",
    "register",
    "registration",
    "price",
    "rule",
    "rules",
    "fee",
    "cost",
    "date",
    "when",
    "venue",
    "where",
    "location",
    "college",
    "somaiya",
    "hi",
    "hello",
    "hey",
    "greetings",
    "theme",
    "time",
    "schedule",
    "help",
    "admin",
    "contact",
    "support"
  ];
  const isFestQuery = festKeywords.some((keyword) => msg.includes(keyword));
  if (!isFestQuery) {
    return "I am the Rasayan 2026 AI Assistant, strictly restricted to answering queries regarding the Rasayan 2026 Chemistry Festival, its events, registrations, schedule, and venue. Please ask me any question about the fest!";
  }
  if (msg.includes("register") || msg.includes("registration") || msg.includes("sign up") || msg.includes("apply") || msg.includes("join")) {
    return "You can easily register for any event through our website! Navigate to the **Events** or **Register** section, choose the events you want to participate in, fill out your team or individual details, and submit. You will receive an instant confirmation email with your unique Registration ID.";
  }
  if (msg.includes("price") || msg.includes("fee") || msg.includes("cost") || msg.includes("how much") || msg.includes("payment") || msg.includes("amount")) {
    return "Here are the official registration fees for Rasayan 2026 events:\n\n**On-Ground Events:**\n- \u{1F9E0} **Green Mind Battle (Quiz)**: \u20B950 (Solo)\n- \u{1F9E9} **Mindscape 17 (Memory Challenge)**: \u20B950 (Solo)\n- \u{1F988} **Elemental Sharks (Shark Tank)**: \u20B9150 (Group of 1-3)\n- \u23F1\uFE0F **Tatva Trail (Minute to Win It)**: \u20B9250 (Group of 5)\n- \u{1F50D} **Eco-forensics**: \u20B9150 (Group of 1-3)\n- \u{1F5FA}\uFE0F **Srishti Rahasya (Treasure Hunt)**: \u20B9250 (Group of 5)\n- \u{1F500} **Atomic Shuffle**: \u20B930 (Solo)\n- \u{1F39F}\uFE0F **Kismat (Housie)**: \u20B920 (Solo)\n\n**Online Events:**\n- \u{1F3A8} **Doodleium (Doodling)**: \u20B940 (Solo)\n- \u{1F4F7} **Eco-vision (Photography)**: \u20B940 (Solo)\n- \u{1F3A5} **Reel-iemental (Reels)**: \u20B940 (Solo)\n- \u{1F92A} **Sustain-a-meme (Memes)**: \u20B920 (Solo)";
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
    return "The **Green Mind Battle** is our on-ground Chemistry Quiz! It is a solo competition (\u20B950 fee) conducted on the Kahoot app testing environmental and chemistry knowledge.";
  }
  if (msg.includes("treasure") || msg.includes("hunt") || msg.includes("srishti rahasya")) {
    return "The **Srishti Rahasya** is our campus Treasure Hunt! Teams of 5 (\u20B9250 per team) solve chemistry riddles to navigate clues around the campus.";
  }
  if (msg.includes("help") || msg.includes("admin") || msg.includes("contact") || msg.includes("support")) {
    return "If you need direct assistance from a coordinator, please switch to the **'Admin Help'** tab at the top of this chat window to message our team directly!";
  }
  if (msg.includes("hello") || msg.includes("hi") || msg.includes("hey") || msg.includes("greetings")) {
    return "Hello! I am your Rasayan 2026 Assistant. How can I assist you with our Chemistry Festival events, registrations, schedule, or fees today?";
  }
  return "I am the Rasayan 2026 AI Assistant! I can answer questions about our 12 Chemistry Fest events, registration details, fees, schedule (Dec 16, 2026), venue, or theme 'Panchtatva'. Ask me anything about the festival!";
}
async function createServer() {
  const app = (0, import_express.default)();
  app.use((0, import_cors.default)());
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString(), env: process.env.NODE_ENV });
  });
  const activeDownloads = /* @__PURE__ */ new Map();
  const preCacheVideo = (fileId) => {
    const cachePath = import_path.default.join(process.cwd(), `video_cache_${fileId}.mp4`);
    const tempPath = import_path.default.join(process.cwd(), `video_cache_${fileId}.tmp`);
    if (import_fs.default.existsSync(cachePath) || activeDownloads.has(fileId)) return;
    const googleUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download`;
    const downloadPromise = new Promise((resolve, reject) => {
      console.log(`Pre-caching banner video in background: ${fileId}`);
      const fileStream = import_fs.default.createWriteStream(tempPath);
      const download = (url) => {
        import_https.default.get(url, (googleRes) => {
          if (googleRes.statusCode && googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
            download(googleRes.headers.location);
            return;
          }
          if (googleRes.statusCode !== 200) {
            fileStream.close();
            try {
              import_fs.default.unlinkSync(tempPath);
            } catch (e) {
              console.warn("Unlink error:", e);
            }
            reject(new Error(`Pre-cache failed status: ${googleRes.statusCode}`));
            return;
          }
          googleRes.pipe(fileStream);
          fileStream.on("finish", () => {
            fileStream.close();
            try {
              import_fs.default.renameSync(tempPath, cachePath);
              console.log(`Pre-cache complete for video ${fileId}`);
              resolve(cachePath);
            } catch (err) {
              reject(err);
            }
          });
        }).on("error", (err) => {
          fileStream.close();
          try {
            import_fs.default.unlinkSync(tempPath);
          } catch (e) {
            console.warn("Unlink error:", e);
          }
          reject(err);
        });
      };
      download(googleUrl);
    });
    activeDownloads.set(fileId, downloadPromise);
    downloadPromise.catch(() => activeDownloads.delete(fileId));
  };
  preCacheVideo("1QePHrtCffJD4oREs6rvtPvS9-J2BYJe_");
  preCacheVideo("1K8I6-RjaWRO9s36OP4eHryrBzXa8LLkH");
  app.get("/api/video-proxy", (req, res) => {
    const fileId = req.query.id || "1QePHrtCffJD4oREs6rvtPvS9-J2BYJe_";
    const cachePath = import_path.default.join(process.cwd(), `video_cache_${fileId}.mp4`);
    const tempPath = import_path.default.join(process.cwd(), `video_cache_${fileId}.tmp`);
    if (import_fs.default.existsSync(cachePath)) {
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
    if (!activeDownloads.has(fileId)) {
      const downloadPromise = new Promise((resolve, reject) => {
        console.log(`Starting background cache download for video ID: ${fileId}`);
        const fileStream = import_fs.default.createWriteStream(tempPath);
        const download = (url) => {
          import_https.default.get(url, (googleRes) => {
            if (googleRes.statusCode && googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
              download(googleRes.headers.location);
              return;
            }
            if (googleRes.statusCode !== 200) {
              fileStream.close();
              try {
                import_fs.default.unlinkSync(tempPath);
              } catch {
              }
              reject(new Error(`Failed to download from Google Drive, status: ${googleRes.statusCode}`));
              return;
            }
            googleRes.pipe(fileStream);
            fileStream.on("finish", () => {
              fileStream.close();
              try {
                import_fs.default.renameSync(tempPath, cachePath);
                console.log(`Successfully cached video ${fileId} locally!`);
                resolve(cachePath);
              } catch (err) {
                reject(err);
              }
            });
          }).on("error", (err) => {
            fileStream.close();
            try {
              import_fs.default.unlinkSync(tempPath);
            } catch {
            }
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
    const requestOptions = {
      headers: {}
    };
    if (req.headers.range) {
      requestOptions.headers["Range"] = req.headers.range;
    }
    const proxyStream = (targetUrl) => {
      import_https.default.get(targetUrl, requestOptions, (googleRes) => {
        if (googleRes.statusCode && googleRes.statusCode >= 300 && googleRes.statusCode < 400 && googleRes.headers.location) {
          proxyStream(googleRes.headers.location);
          return;
        }
        res.status(googleRes.statusCode || 200);
        Object.entries(googleRes.headers).forEach(([key, value]) => {
          if (value !== void 0) {
            const lowerKey = key.toLowerCase();
            if (lowerKey === "content-disposition") {
              res.setHeader("Content-Disposition", "inline");
            } else if (lowerKey !== "cross-origin-resource-policy" && lowerKey !== "cross-origin-opener-policy" && lowerKey !== "cross-origin-embedder-policy" && lowerKey !== "content-security-policy" && lowerKey !== "x-content-security-policy" && lowerKey !== "x-frame-options") {
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
    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not configured. Using local fallback response.");
      const fallback = getFallbackResponse(message);
      return res.json({ text: fallback });
    }
    try {
      const ai = getGenAI();
      const SYSTEM_INSTRUCTION = `You are the official AI Assistant for Rasayan 2026, the annual Chemistry Festival organized by K J Somaiya College of Science and Commerce, Vidyavihar, Mumbai.

CRITICAL SCOPE & ROUTING MANDATES:
1. RESTRICTED SCOPE: You are STRICTLY RESTRICTED to ONLY answering queries related to Rasayan 2026, its theme ('Panchtatva'), its 12 official events, registration process, fees, schedule, venue, rules, and event details.
2. OUT-OF-SCOPE PROMPTS: If the user asks about ANY UNRELATED TOPIC (e.g. general programming, math homework, general science, news, sports, recipes, politics, weather, personal advice, or off-topic chatter), YOU MUST DECLINE POLITELY WITH THIS EXACT PHRASE:
"I am the Rasayan 2026 AI Assistant, strictly restricted to answering queries regarding the Rasayan 2026 Chemistry Festival, its events, registrations, schedule, and venue. Please ask me any question about the fest!"
3. TECHNICAL ISSUES & ADMIN HELP ROUTING: If the user asks about ANY technical issues, website glitches, bugs, payment errors, login/account issues, password resets, or needs direct human support, YOU MUST ROUTE THEM DIRECTLY TO ADMIN HELP WITH THIS EXACT PHRASE:
"For technical issues, payment errors, or account help, please switch to the **'Admin Help'** tab at the top of this chat window to message our technical support team directly."

OFFICIAL FESTIVAL INFORMATION:
- Event Name: Rasayan 2026 (Annual Chemistry Festival)
- Organizer: K J Somaiya College of Science and Commerce, Vidyavihar, Mumbai
- Theme: "Panchtatva" (Earth, Water, Fire, Air, Space)
- Festival Date: December 16, 2026
- Venue: K J Somaiya College of Science and Commerce campus, Vidyavihar, Mumbai

OFFICIAL EVENTS & GAMES (TOTAL 12 EVENTS):
1. Green Mind Battle (Quiz): \u20B950 (Solo). On-ground Kahoot quiz testing environmental and chemistry knowledge.
2. Mindscape 17 (Memory Challenge): \u20B950 (Solo). 2 mins to memorize 17 sustainability principles.
3. Elemental Sharks (Shark Tank): \u20B9150 (Group of 1 to 3). Pitch sustainable chemistry idea/prototype (5-8 mins).
4. Tatva Trail (Minute to Win It): \u20B9250 (Group of 5). Fast-paced 1-minute elemental team tasks.
5. Eco-forensics: \u20B9150 (Group of 1 to 3). Solve eco-crime case with chemical evidence.
6. Srishti Rahasya (Treasure Hunt): \u20B9250 (Group of 5). Solve chemistry riddles to hunt treasure around campus.
7. Atomic Shuffle: \u20B930 (Solo). Dance/movement to music, form groups equal to announced atomic number.
8. Kismat (Housie): \u20B920 (Solo). Chemistry atomic numbers housie game.
9. Doodleium (Doodling): \u20B940 (Solo, Online). Digital or handmade doodle on Panchtatva/Chemistry. Deadline: Dec 15, 2026, 12:00 PM.
10. Eco-vision (Photography): \u20B940 (Solo, Online). High-res chemistry in nature photo + description. Deadline: Dec 15, 2026, 12:00 PM.
11. Reel-iemental (Reels): \u20B940 (Solo, Online). 10-30 sec creative video reel on Panchtatva/Chemistry. Deadline: Dec 15, 2026, 12:00 AM.
12. Sustain-a-meme (Memes): \u20B920 (Solo, Online). Chemistry & sustainability memes. Deadline: Dec 15, 2026, 12:00 AM.

REGISTRATION DETAILS:
Participants can register directly through the website under the "Events" or "Register" tabs. An email with a unique Registration ID will be sent upon registration.

HUMAN ADMIN ASSISTANCE:
If the user asks to talk to human event coordinators or needs technical help, tell them: "Please switch to the **'Admin Help'** tab at the top of this chatbot window to send a direct message to our support team."

FORMATTING GUIDELINES:
Keep answers concise, clear, polite, and well-structured using bullet points and **bold** text. Do NOT use raw code blocks or markdown code syntax.`;
      const formattedContents = [];
      if (Array.isArray(history) && history.length > 0) {
        for (const item of history) {
          if (item.text && (item.role === "user" || item.role === "model")) {
            formattedContents.push({
              role: item.role,
              parts: [{ text: item.text }]
            });
          }
        }
      }
      if (formattedContents.length === 0 || formattedContents[formattedContents.length - 1].role !== "user") {
        formattedContents.push({
          role: "user",
          parts: [{ text: message || "Hello" }]
        });
      }
      let response;
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: formattedContents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION
          }
        });
      } catch (primaryError) {
        console.warn("gemini-2.5-flash failed, trying gemini-2.5-pro fallback:", primaryError);
        response = await ai.models.generateContent({
          model: "gemini-2.5-pro",
          contents: formattedContents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION
          }
        });
      }
      if (!response || !response.text) {
        throw new Error("Empty response from AI");
      }
      res.json({ text: response.text });
    } catch (error) {
      console.error("Gemini Error:", error);
      const fallback = getFallbackResponse(message);
      res.json({ text: fallback });
    }
  });
  app.post("/api/notify-admin", async (req, res) => {
    const { registrationData, userName, userEmail, uniqueCode } = req.body;
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || "587");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const adminEmails = process.env.ADMIN_EMAIL || "brothernitin99@gmail.com,nitin.c@somaiya.edu";
    if (!host || !user || !pass) {
      console.warn("SMTP credentials not fully configured. Email skipped.");
      return res.status(200).json({ message: "Email skipped (SMTP not configured)", success: false });
    }
    try {
      const transporter = import_nodemailer.default.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      const eventsList = registrationData.map((reg) => `- ${reg.eventName} (${reg.type})`).join("\n");
      const adminMailOptions = {
        from: `"Rasayan 2026 Admin" <${user}>`,
        to: adminEmails,
        subject: `New Registration [ID: ${uniqueCode}]: ${userName}`,
        text: `Hello Admin,

A new user has registered for events at Rasayan 2026.

Participant Details:
- Name: ${userName}
- Email: ${userEmail}
- Registration ID: ${uniqueCode}
- College: ${registrationData[0]?.college || "Not specified"}

Events Registered:
${eventsList}

Please check the Admin Dashboard for more details.`
      };
      const userMailOptions = {
        from: `"Rasayan 2026" <${user}>`,
        to: userEmail,
        subject: `Registration Confirmed: Rasayan 2026`,
        text: `Hello ${userName},

Your registration for Rasayan 2026 is confirmed!

Your Unique Registration ID is: ${uniqueCode}

Please keep this ID safe as it will be required during the event for verification.

Events you registered for:
${eventsList}

Venue: K J Somaiya College of Science and Commerce
Date: 16th December, 2026

We look forward to seeing you!

Best regards,
Team Rasayan 2026`
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
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  return app;
}
async function startServer() {
  const app = await createServer();
  const PORT = 3e3;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}
if (process.env.NODE_ENV !== "test" && !process.env.VERCEL) {
  startServer();
}
var cachedApp = null;
var server_default = async (req, res) => {
  if (!cachedApp) {
    cachedApp = await createServer();
  }
  return cachedApp(req, res);
};
//# sourceMappingURL=server.cjs.map
