/**
 * Generates audio files for the sales page demo lesson using OpenAI TTS.
 * Run once from the web/ directory: node scripts/generate-audio.mjs
 *
 * Requires OPENAI_API_KEY in web/.env or web/.env.local
 * Output: public/audio/{lang}-{index}.mp3
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env then .env.local (local takes precedence)
for (const name of [".env", ".env.local"]) {
  const envPath = path.join(__dirname, "../", name);
  if (fs.existsSync(envPath)) {
    for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
      const [key, ...rest] = line.split("=");
      if (key && rest.length) process.env[key.trim()] = rest.join("=").trim().replace(/^["']|["']$/g, "");
    }
  }
}

const API_KEY = process.env.OPENAI_API_KEY;
if (!API_KEY) {
  console.error("Missing OPENAI_API_KEY in web/.env or web/.env.local");
  process.exit(1);
}

// tts-1-hd = highest quality; voices: alloy, echo, fable, onyx, nova, shimmer
const MODEL = "tts-1-hd";
const VOICE = "nova";

const LESSONS = {
  es: [
    "Hola, ¿cómo estás?",
    "Mucho gusto",
    "¿Dónde está el baño?",
    "La cuenta, por favor",
    "No entiendo",
  ],
  fr: [
    "Bonjour, comment ça va?",
    "Enchanté",
    "Où sont les toilettes?",
    "L'addition, s'il vous plaît",
    "Je ne comprends pas",
  ],
  ja: [
    "はじめまして",
    "ありがとうございます",
    "トイレはどこですか？",
    "お会計をお願いします",
    "わかりません",
  ],
  zh: [
    "你好吗？",
    "很高兴认识你",
    "厕所在哪里？",
    "买单",
    "我不明白",
  ],
};

const OUT_DIR = path.join(__dirname, "../public/audio");
fs.mkdirSync(OUT_DIR, { recursive: true });

async function generateOne(lang, index, text) {
  const outPath = path.join(OUT_DIR, `${lang}-${index}.mp3`);
  if (fs.existsSync(outPath)) {
    console.log(`  skip  ${lang}-${index}.mp3 (already exists)`);
    return;
  }

  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, voice: VOICE, input: text }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI TTS error ${res.status}: ${await res.text()}`);
  }

  fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  console.log(`  ✓  ${lang}-${index}.mp3  "${text}"`);
}

(async () => {
  for (const [lang, phrases] of Object.entries(LESSONS)) {
    console.log(`\nGenerating ${lang.toUpperCase()}...`);
    for (let i = 0; i < phrases.length; i++) {
      await generateOne(lang, i, phrases[i]);
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  console.log("\nDone. Files in web/public/audio/");
})();
