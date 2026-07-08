import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini SDK with telemetry header as requested
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// List of Hebrew fallback words in case of API failure or missing keys
const fallbackWords = [
  { word: "תפוח", category: "אוכל" },
  { word: "כלב", category: "בעלי חיים" },
  { word: "מכונית", category: "כלי תחבורה" },
  { word: "שולחן", category: "רהיטים" },
  { word: "מטוס", category: "כלי תחבורה" },
  { word: "אריה", category: "בעלי חיים" },
  { word: "בננה", category: "אוכל" },
  { word: "עגבנייה", category: "ירקות" },
  { word: "ספר", category: "חפצים בבית" },
  { word: "מפתח", category: "חפצים בבית" },
];

// Helper to check if API key exists
const isGeminiEnabled = () => !!process.env.GEMINI_API_KEY;

// API: Generate secret word and category
app.post("/api/game/generate-word", async (req, res) => {
  try {
    if (!isGeminiEnabled()) {
      const randomWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
      return res.json({ word: randomWord.word, category: randomWord.category });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: "בחר מילה סודית אחת בעברית, נפוצה ומוכרת, ורשום את הקטגוריה הכללית שלה (למשל: אוכל, בעלי חיים, מקצועות, חפצים יומיומיים). המילה צריכה להיות פשוטה ונוחה לתיאור עקיף.",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            word: {
              type: Type.STRING,
              description: "The secret word in Hebrew, e.g., 'תפוח' or 'מטוס'",
            },
            category: {
              type: Type.STRING,
              description: "The broad category of the word in Hebrew, e.g., 'אוכל' or 'כלי תחבורה'",
            },
          },
          required: ["word", "category"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    if (data.word && data.category) {
      return res.json({ word: data.word.trim(), category: data.category.trim() });
    }
    
    throw new Error("Invalid response format from Gemini");
  } catch (error) {
    console.error("Error generating secret word:", error);
    // Return random fallback
    const randomWord = fallbackWords[Math.floor(Math.random() * fallbackWords.length)];
    res.json({ word: randomWord.word, category: randomWord.category });
  }
});

// API: Generate a bot's clue
app.post("/api/game/bot-clue", async (req, res) => {
  const { secretWord, category, personality, isImpostor, previousClues } = req.body;

  try {
    if (!isGeminiEnabled()) {
      // Simple fallback clues
      if (isImpostor) {
        return res.json({ clue: `משהו מעניין בקטגוריה ${category}` });
      } else {
        return res.json({ clue: `יש לי קשר לזה בחיים` });
      }
    }

    let prompt = "";
    if (isImpostor) {
      prompt = `אתה משתתף במשחק החברתי 'מי המתחזה' (Undercover / קו המשווה).
אינך יודע מה המילה הסודית, אך הקטגוריה הכללית שלה היא: "${category}".
אתה רוצה לכתוב רמז שיראה קשור, כדי שלא יחשדו בך, מבלי שתדע את המילה עצמה.
הרמזים האחרים שנכתבו עד כה בסיבוב הם: ${JSON.stringify(previousClues || [])}.
האישיות והסגנון שלך הם: "${personality}".
כתוב רמז קצר מאוד בעברית (רמז של מילה אחת או משפט קצרצר של עד 4 מילים) שיגרום לשחקנים אחרים לחשוב שאתה יודע את המילה ולא לחשוד בך. השתמש בסגנון האישיות שלך.
החזר רק את הרמז עצמו בעברית ללא מירכאות, ללא הסברים וללא תוספות.`;
    } else {
      prompt = `אתה משתתף במשחק החברתי 'מי המתחזה' (Undercover / קו המשווה).
המילה הסודית היא: "${secretWord}".
הקטגוריה הכללית של המילה היא: "${category}".
האישיות והסגנון שלך הם: "${personality}".
כתוב רמז קצר מאוד בעברית (רמז של מילה אחת או משפט קצרצר של עד 4 מילים) שקשור למילה בצורה מעט עקיפה או מתוחכמת כדי שהמתחזה (שלא יודע את המילה, רק את הקטגוריה) לא ינחש אותה בקלות, אך שחקנים רגילים יבינו שאתה בעניין. השתמש בסגנון האישיות שלך.
החזר רק את הרמז עצמו בעברית ללא מירכאות, ללא הסברים וללא תוספות.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        temperature: 0.8,
      },
    });

    const clue = response.text?.trim().replace(/^"|"$/g, "") || "נראה לי משהו מגניב";
    res.json({ clue });
  } catch (error) {
    console.error("Error generating bot clue:", error);
    res.json({ clue: isImpostor ? "זה קשור לקטגוריה לגמרי" : "אני מכיר את זה טוב" });
  }
});

// API: Generate bot vote decision
app.post("/api/game/bot-vote", async (req, res) => {
  const { botId, players, isImpostor, secretWord, category } = req.body;

  try {
    if (!isGeminiEnabled()) {
      // Vote for a random non-eliminated player who is not the bot itself
      const candidates = players.filter((p: any) => !p.isEliminated && p.id !== botId);
      if (candidates.length > 0) {
        const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
        return res.json({ votedFor: randomCandidate.id, reason: "הצבעה אקראית בהתאם לחשד כללי" });
      }
      return res.json({ votedFor: null, reason: "אין מועמדים תקפים" });
    }

    // Prepare clue list for prompt
    const clueLines = players
      .filter((p: any) => !p.isEliminated)
      .map((p: any) => `שחקן: ${p.name} (מזהה: ${p.id}) | רמז: "${p.currentClue}"`)
      .join("\n");

    let prompt = "";
    if (isImpostor) {
      prompt = `אתה משתתף כמתחזה במשחק 'מי המתחזה'. אינך יודע מה המילה הסודית, אך הקטגוריה היא "${category}".
עליך להצביע למישהו שאינו אתה כדי להסיט את האש ממך.
הנה רשימת השחקנים והרמזים שלהם בסיבוב הזה:
${clueLines}

המזהה שלך (הבוט) הוא: "${botId}".
בחר שחקן אחד מתוך הרשימה (שאנו מודח ואינו אתה) כדי להצביע לו. החזר את ה-id שלו וסיבה משעשעת או הגיונית בעברית למה אתה מצביע לו.
החזר תשובה בפורמט JSON בלבד.`;
    } else {
      prompt = `אתה משתתף במשחק 'מי המתחזה'. המילה הסודית שכולם קיבלו (חוץ מהמתחזה) היא: "${secretWord}". הקטגוריה היא "${category}".
עליך לנתח את הרמזים של כל השחקנים ולבחור את מי שהרמז שלו נראה הכי פחות קשור למילה, או כללי מדי, או נראה כמו ניחוש עיוור (כלומר המתחזה).
הנה רשימת השחקנים והרמזים שלהם בסיבוב הזה:
${clueLines}

המזהה שלך (הבוט) הוא: "${botId}".
בחר את השחקן החשוד ביותר (ה-id שלו) ורשום סיבה קצרה ומשעשעת בעברית שמסבירה למה הרמז שלו לא קשור למילה "${secretWord}".
החזר תשובה בפורמט JSON בלבד.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            votedFor: {
              type: Type.STRING,
              description: "The ID of the player being voted for",
            },
            reason: {
              type: Type.STRING,
              description: "A short humorous explanation in Hebrew of why they are suspicious",
            },
          },
          required: ["votedFor", "reason"],
        },
      },
    });

    const data = JSON.parse(response.text || "{}");
    res.json({
      votedFor: data.votedFor || null,
      reason: data.reason || "הרמז שלו נראה לי חשוד מאוד!",
    });
  } catch (error) {
    console.error("Error making bot vote decision:", error);
    // Fallback
    const candidates = players.filter((p: any) => !p.isEliminated && p.id !== botId);
    if (candidates.length > 0) {
      const randomCandidate = candidates[Math.floor(Math.random() * candidates.length)];
      res.json({ votedFor: randomCandidate.id, reason: "לא הצלחתי להחליט אז בחרתי בו באופן אקראי!" });
    } else {
      res.json({ votedFor: null, reason: "לא מצאתי מישהו להצביע לו." });
    }
  }
});

// Serve frontend Vite static or middleware
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // In dev mode, create Vite server and use as middleware
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In prod, serve built files
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
