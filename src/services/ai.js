import OpenAI from "openai";

// === ТВОИ ПЕРСОНАЛЬНЫЕ НАСТРОЙКИ ===
const WHITELIST = []; 
const BLACKLIST = []; 
// ===================================

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

export async function analyzeSpeech(audioBlob) {
  if (!apiKey) throw new Error("API Ключ не найден");

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true
  });

  try {
    console.log("1. Распознавание...");
    const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });
    const transcription = await client.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    const transcript = transcription.text;
    console.log("2. Поиск мусора и повторов...");

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Ты — технический фильтр текста и точный оценщик. Твоя задача — искать ТОЛЬКО два типа ошибок:
          1. СЛОВА-ПАРАЗИТЫ: "ну", "типа", "короче", "как бы", "вот", "э-э", "м-м" и подобные.
          2. ТАВТОЛОГИЯ: Неоправданное повторение одного и того же слова или корня в соседних фразах.

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
            "title": "краткое, емкое название темы",
            "score": число_от_0_до_100, // ОБЯЗАТЕЛЬНО ЧИСЛО
            "errors": [
              {"type": "паразит/тавтология", "text": "слово_ошибка", "suggestion": "на что заменить или просто удалить"}
            ]
          }
          ПРАВИЛА ОЦЕНКИ SCORE:
          - Если массив "errors" пуст, "score" ДОЛЖЕН БЫТЬ 100.
          - Если "errors" НЕ пуст, "score" должен быть НИЖЕ 100 и уменьшаться на 5-15 пунктов за каждую найденную ошибку.
          - Минимальный "score" может быть 0.
          - Если ошибок нет, верни "errors": [].`
        },
        {
          role: "user",
          content: transcript
        }
      ],
      response_format: { type: "json_object" }
    });

    const rawAIResponseText = response.choices[0].message.content;
    console.log("=== СЫРОЙ ОТВЕТ ИИ ===");
    console.log(rawAIResponseText);
    console.log("======================");

    const analysis = JSON.parse(rawAIResponseText);

    // Добавляем защиту: если score не число, ставим 50 по умолчанию
    const finalScore = typeof analysis.score === 'number' && !isNaN(analysis.score)
      ? Math.max(0, Math.min(100, analysis.score)) // Ограничиваем от 0 до 100
      : (analysis.errors && analysis.errors.length > 0 ? 50 : 100); // Если есть ошибки - 50, нет - 100

    console.log("=== ИТОГОВЫЙ SCORE ОТ AI SERVICE ===");
    console.log(finalScore);
    console.log("===================================");

    return {
      title: analysis.title,
      transcript: transcript,
      score: finalScore,
      errors: analysis.errors
    };

  } catch (error) {
    console.error("Groq Error:", error);
    throw error;
  }
}
