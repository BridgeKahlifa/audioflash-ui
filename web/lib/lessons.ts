import type { FlagCode } from "../components/FlagIcon";

export const LESSONS = {
  es: {
    flagCode: "ES" as FlagCode,
    label: "Spanish",
    langCode: "es-ES",
    cards: [
      {
        phrase: "Hola, ¿cómo estás?",
        romanization: "OH-la, KOH-mo es-TAS",
        meaning: "Hi, how are you?",
      },
      {
        phrase: "Mucho gusto",
        romanization: "MOO-cho GOOS-to",
        meaning: "Nice to meet you",
      },
      {
        phrase: "¿Dónde está el baño?",
        romanization: "DON-deh es-TA el BAN-yo",
        meaning: "Where is the bathroom?",
      },
      {
        phrase: "La cuenta, por favor",
        romanization: "la KWEN-ta por fa-VOR",
        meaning: "The bill, please",
      },
      {
        phrase: "No entiendo",
        romanization: "no en-TYEN-do",
        meaning: "I don't understand",
      },
    ],
  },
  fr: {
    flagCode: "FR" as FlagCode,
    label: "French",
    langCode: "fr-FR",
    cards: [
      {
        phrase: "Bonjour, comment ça va?",
        romanization: "bon-ZHOOR, koh-MAHN sa VA",
        meaning: "Hello, how are you?",
      },
      {
        phrase: "Enchanté",
        romanization: "ahn-shahn-TAY",
        meaning: "Nice to meet you",
      },
      {
        phrase: "Où sont les toilettes?",
        romanization: "oo SOHN lay twah-LET",
        meaning: "Where are the toilets?",
      },
      {
        phrase: "L'addition, s'il vous plaît",
        romanization: "la-dee-SYON seel voo PLAY",
        meaning: "The bill, please",
      },
      {
        phrase: "Je ne comprends pas",
        romanization: "zhuh nuh kohm-PRAHN pah",
        meaning: "I don't understand",
      },
    ],
  },
  ja: {
    flagCode: "JP" as FlagCode,
    label: "Japanese",
    langCode: "ja-JP",
    cards: [
      {
        phrase: "はじめまして",
        romanization: "Hajimemashite",
        meaning: "Nice to meet you",
      },
      {
        phrase: "ありがとうございます",
        romanization: "Arigatou gozaimasu",
        meaning: "Thank you very much",
      },
      {
        phrase: "トイレはどこですか？",
        romanization: "Toire wa doko desu ka",
        meaning: "Where is the toilet?",
      },
      {
        phrase: "お会計をお願いします",
        romanization: "Okaikei o onegaishimasu",
        meaning: "Check, please",
      },
      {
        phrase: "わかりません",
        romanization: "Wakarimasen",
        meaning: "I don't understand",
      },
    ],
  },
  zh: {
    flagCode: "CN" as FlagCode,
    label: "Mandarin",
    langCode: "zh-CN",
    cards: [
      {
        phrase: "你好吗？",
        romanization: "Nǐ hǎo ma",
        meaning: "How are you?",
      },
      {
        phrase: "很高兴认识你",
        romanization: "Hěn gāo xìng rèn shí nǐ",
        meaning: "Nice to meet you",
      },
      {
        phrase: "厕所在哪里？",
        romanization: "Cèsuǒ zài nǎlǐ",
        meaning: "Where is the bathroom?",
      },
      { phrase: "买单", romanization: "Mǎi dān", meaning: "Check, please" },
      {
        phrase: "我不明白",
        romanization: "Wǒ bù míng bái",
        meaning: "I don't understand",
      },
    ],
  },
} as const;

export type LessonKey = keyof typeof LESSONS;
export type Lesson = (typeof LESSONS)[LessonKey];
export type LessonCard = {
  phrase: string;
  romanization: string;
  meaning: string;
};
export type CardResult = LessonCard & { knew: boolean };

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function getWeeklyData(todayCards: number) {
  const fakePast = [0, 8, 5, 0, 12, 3];
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      day: DAY_LABELS[d.getDay()],
      cards: i < 6 ? fakePast[i] : todayCards,
      isToday: i === 6,
    };
  });
}
