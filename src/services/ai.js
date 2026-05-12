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
          content: `Ты — технический фильтр текста. Твоя задача — искать ТОЛЬКО два типа ошибок:
          1. СЛОВА-ПАРАЗИТЫ: "ну", "типа", "короче", "как бы", "вот", "э-э", "м-м" и подобные.
          2. ТАВТОЛОГИЯ: Неоправданное повторение одного и того же слова в соседних фразах.

          СТРОЖАЙШИЕ ЗАПРЕТЫ:
          - НЕ исправляй стиль.
          - НЕ исправляй грамматику.
          - НЕ пытайся "улучшить" предложение или сделать его "понятнее".
          - Литературные описания, метафоры и сложные обороты — ЭТО НЕ ОШИБКИ. 
          - Если в предложении нет прямого повтора слова или слова-паразита, оно ИДЕАЛЬНОЕ.

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
    console.error("Groq Error:", error);
    throw error;
  }
}
