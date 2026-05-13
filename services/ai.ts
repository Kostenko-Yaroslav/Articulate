import OpenAI from "openai";
import * as FileSystem from 'expo-file-system';
import { Buffer } from 'buffer'; // Для React Native нужен буфер

// === ТВОИ ПЕРСОНАЛЬНЫЕ НАСТРОЙКИ (для Few-Shot, White/Black lists) ===
const WHITELIST: string[] = []; 
const BLACKLIST: string[] = []; 
// ===================================

const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY; // Ключ из Expo.env

export async function analyzeSpeech(audioUri: string) { // Теперь принимаем URI файла
  if (!GROQ_API_KEY) {
    throw new Error("GROQ API Key не найден. Проверьте EXPO_PUBLIC_GROQ_API_KEY в .env");
  }

  // Для React Native нужен специальный baseURL для Groq
  const client = new OpenAI({
    apiKey: GROQ_API_KEY,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true 
  });

  try {
    console.log("1. Читаем аудиофайл...");
    // Читаем аудиофайл в Base64
    const audioData = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Для Groq/OpenAI Whisper нужен Buffer
    const fileBuffer = Buffer.from(audioData, 'base64');
    const file = new File([fileBuffer], "audio.m4a", { type: "audio/m4a" }); // В Expo Audio записывает в m4a
    
    console.log("2. Отправляем аудио в Whisper...");
    const transcription = await client.audio.transcriptions.create({
      file: file as any, // TypeScript может ругаться, но на практике это работает
      model: "whisper-large-v3",
    });

    const transcript = transcription.text;
    console.log("3. Анализируем текст через Llama 3...");

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Ты — технический фильтр текста. Твоя задача — искать ТОЛЬКО два типа ошибок:
          1. СЛОВА-ПАРАЗИТЫ: "ну", "типа", "короче", "как бы", "вот", "э-э", "м-м" и подобные.
          2. ТАВТОЛОГИЯ: Неоправданное повторение одного и того же слова в соседних фразах.

          СТРОЖАЙШИЕ ЗАПРЕТЫ:
          - НЕ исправляй стиль.
          - НЕ исправляй грамматику.
          - НЕ пытайся "улучшить" предложение или сделать его "понятнее".
          - Литературные описания, метафоры и сложные обороты — ЭТО НЕ ОШИБКИ. 
          - Если в предложении нет прямого повтора слова или слова-паразита, оно ИДЕАЛЬНОЕ.

          БЕЛЫЙ СПИСОК (ИГНОРИРУЙ ЭТИ СЛОВА): ${WHITELIST.join(", ")}
          ЧЕРНЫЙ СПИСОК (ВСЕГДА ПОМЕЧАЙ КАК ОШИБКУ): ${BLACKLIST.join(", ")}

          Верни ответ СТРОГО в формате JSON:
          {
            "title": "название темы",
            "score": 100 если нет паразитов и тавтологии, иначе ниже,
            "errors": [
              {"type": "паразит/тавтология", "text": "слово_ошибка", "suggestion": "на что заменить или просто удалить"}
            ]
          }
          Если ошибок нет, верни "errors": [].`
        },
        {
          role: "user",
          content: transcript
        }
      ],
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    return {
      title: analysis.title,
      transcript: transcript,
      score: analysis.score,
      errors: analysis.errors
    };

  } catch (error) {
    console.error("Groq AI Service Error:", error);
    throw new Error(`Ошибка ИИ: ${error.message}`);
  }
}
