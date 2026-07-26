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
  const msg = (userMessage || "").toLowerCase();
  let reply;
  if (msg.includes("register") || msg.includes("registration") || msg.includes("sign up") || msg.includes("apply") || msg.includes("join")) {
    reply = "You can easily register for any event through our platform! Head to the **Events** or **Dashboard** section, select the game you want to join, fill in the required participant or team details, and submit your registration details to secure your spot.";
  } else if (msg.includes("price") || msg.includes("fee") || msg.includes("cost") || msg.includes("how much") || msg.includes("payment") || msg.includes("amount")) {
    reply = "Here are the registration fees for the Rasayan 2026 events:\n\n**On-Ground Events:**\n- \u{1F9E0} **Green Mind Battle (Quiz)**: \u20B950 (Solo)\n- \u{1F9E9} **Mindscape 17 (Memory Challenge)**: \u20B950 (Solo)\n- \u{1F988} **Elemental Sharks (Shark Tank)**: \u20B9150 (Group of up to 3)\n- \u23F1\uFE0F **Tatva Trail (Minute to Win It)**: \u20B9250 (Group of 5)\n- \u{1F50D} **Eco-forensics**: \u20B9150 (Group of up to 3)\n- \u{1F5FA}\uFE0F **Srishti Rahasya (Treasure Hunt)**: \u20B9250 (Group of 5)\n- \u{1F500} **Atomic Shuffle**: \u20B930 (Solo)\n- \u{1F39F}\uFE0F **Kismat (Housie)**: \u20B920 (Solo)\n\n**Online/Digital Events:**\n- \u{1F3A8} **Doodleium (Doodling)**: \u20B940 (Solo)\n- \u{1F4F7} **Eco-vision (Photography)**: \u20B940 (Solo)\n- \u{1F3A5} **Reel-iemental (Reels)**: \u20B940 (Solo)\n- \u{1F3F7}\uFE0F **Labellab (Label Designing)**: \u20B940 (Solo)\n- \u{1F92A} **Sustain-a-meme (Memes)**: \u20B920 (Solo)";
  } else if (msg.includes("date") || msg.includes("when") || msg.includes("time") || msg.includes("schedule")) {
    reply = "Rasayan 2026 is scheduled to take place on **December 16th, 2026**. Make sure to register in advance to reserve your entry!";
  } else if (msg.includes("venue") || msg.includes("where") || msg.includes("location") || msg.includes("college") || msg.includes("place")) {
    reply = "The festival is hosted at the **K J Somaiya College of Science and Commerce** campus located in Vidyavihar, Mumbai.";
  } else if (msg.includes("theme") || msg.includes("panchtatva")) {
    reply = "The theme for Rasayan 2026 is **'Panchtatva'**, celebrating the five basic elements of nature: Earth, Water, Fire, Air, and Space. All fests, games, and competitions are designed around this beautiful theme!";
  } else if (msg.includes("quiz") || msg.includes("mind battle") || msg.includes("green mind")) {
    reply = "The **Green Mind Battle** is our premium Chemistry Quiz event! It is a solo competition with a nominal fee of \u20B950. It features multiple exciting rounds testing your scientific wit.";
  } else if (msg.includes("treasure") || msg.includes("hunt") || msg.includes("srishti rahasya")) {
    reply = "The **Srishti Rahasya** is our popular Chemistry Treasure Hunt! Designed for a team of 5, the registration fee is \u20B9250 per team. Participants solve chemistry riddles to navigate around the campus!";
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
  const app = (0, import_express.default)();
  app.use((0, import_cors.default)());
  app.use(import_express.default.json());
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString(), env: process.env.NODE_ENV });
  });
  const activeDownloads = /* @__PURE__ */ new Map();
  app.get("/api/video-proxy", (req, res) => {
    const fileId = req.query.id || "1K8I6-RjaWRO9s36OP4eHryrBzXa8LLkH";
    const cachePath = import_path.default.join(process.cwd(), `video_cache_${fileId}.mp4`);
    const tempPath = import_path.default.join(process.cwd(), `video_cache_${fileId}.tmp`);
    if (import_fs.default.existsSync(cachePath)) {
      return res.sendFile(cachePath, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "video/mp4"
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
    const { message } = req.body;
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
            systemInstruction: "You are the Rasayan 2026 Assistant. Rasayan is the annual Chemistry Festival organized by K J Somaiya College of Science and Commerce. This year's theme is 'Panchtatva'. You help users with event information, registration queries, and general fest details.\n\nHere are the official event/game prices for registration:\n- Green Mind Battle (Quiz): \u20B950 (Solo)\n- Mindscape 17 (Memory Challenge): \u20B950 (Solo)\n- Elemental Sharks (Shark Tank): \u20B9150 (Group up to 3)\n- Tatva Trail (Minute to Win It): \u20B9250 (Group of 5)\n- Eco-forensics: \u20B9150 (Group up to 3)\n- Srishti Rahasya (Treasure Hunt): \u20B9250 (Group of 5)\n- Atomic Shuffle: \u20B930 (Solo)\n- Kismat (Housie): \u20B920 (Solo)\n- Doodleium (Doodling): \u20B940 (Solo, Online)\n- Eco-vision (Photography): \u20B940 (Solo, Online)\n- Reel-iemental (Reels): \u20B940 (Solo, Online)\n- Labellab (Label Designing): \u20B940 (Solo, Online)\n- Sustain-a-meme (Memes): \u20B920 (Solo, Online)\n\nIf you don't know something, be honest. Keep replies concise, clean, and friendly. Avoid using raw markdown symbols for formatting that look like code blocks, but bold text using **bold** is completely fine. If the user wants to talk to a human admin, tell them they can switch to 'Admin Chat' mode in the chatbot."
          }
        });
      } catch (liteError) {
        console.warn("gemini-3.1-flash-lite failed, trying gemini-3.5-flash fallback:", liteError);
        response = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: message || "Hello",
          config: {
            systemInstruction: "You are the Rasayan 2026 Assistant. Rasayan is the annual Chemistry Festival organized by K J Somaiya College of Science and Commerce. This year's theme is 'Panchtatva'. You help users with event information, registration queries, and general fest details.\n\nHere are the official event/game prices for registration:\n- Green Mind Battle (Quiz): \u20B950 (Solo)\n- Mindscape 17 (Memory Challenge): \u20B950 (Solo)\n- Elemental Sharks (Shark Tank): \u20B9150 (Group up to 3)\n- Tatva Trail (Minute to Win It): \u20B9250 (Group of 5)\n- Eco-forensics: \u20B9150 (Group up to 3)\n- Srishti Rahasya (Treasure Hunt): \u20B9250 (Group of 5)\n- Atomic Shuffle: \u20B930 (Solo)\n- Kismat (Housie): \u20B920 (Solo)\n- Doodleium (Doodling): \u20B940 (Solo, Online)\n- Eco-vision (Photography): \u20B940 (Solo, Online)\n- Reel-iemental (Reels): \u20B940 (Solo, Online)\n- Labellab (Label Designing): \u20B940 (Solo, Online)\n- Sustain-a-meme (Memes): \u20B920 (Solo, Online)\n\nIf you don't know something, be honest. Keep replies concise, clean, and friendly. Avoid using raw markdown symbols for formatting that look like code blocks, but bold text using **bold** is completely fine. If the user wants to talk to a human admin, tell them they can switch to 'Admin Chat' mode in the chatbot."
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
