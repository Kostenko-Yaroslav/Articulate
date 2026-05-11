import OpenAI from "openai";

const apiKey = import.meta.env.VITE_GROQ_API_KEY;

export async function analyzeSpeech(audioBlob) {

  const client = new OpenAI({
    apiKey: apiKey,
    baseURL: "https://api.groq.com/openai/v1",
    dangerouslyAllowBrowser: true
  });

  try {
    console.log("1. Отправляем аудио...");
    const file = new File([audioBlob], "audio.webm", { type: "audio/webm" });

    const transcription = await client.audio.transcriptions.create({
      file: file,
      model: "whisper-large-v3",
    });

    const transcript = transcription.text;
    console.log("2. Анализируем...");

    const response = await client.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `Ты эксперт по речи. Проанализируй текст и верни СТРОГО JSON:
          {
            "title": "название темы",
            "score": 85,
            "errors": [
              {"type": "структура/паразит/мат", "text": "оригинал", "suggestion": "как лучше"}
            ]
          }`
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
