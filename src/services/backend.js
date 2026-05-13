const API_URL = 'http://localhost:8000/api';

export const backendApi = {
  // Логин и получение токена
  login: async (username, password) => {
    const response = await fetch(`${API_URL}/token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) throw new Error('Ошибка входа');
    const data = await response.json();
    localStorage.setItem('access_token', data.access);
    localStorage.setItem('refresh_token', data.refresh);
    return data;
  },

  // Получение всех записей
  getRecordings: async () => {
    const token = localStorage.getItem('access_token');
    const response = await fetch(`${API_URL}/recordings/`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Не удалось загрузить записи');
    const data = await response.json();
    // Мапим данные из формата Django в наш формат
    return data.map(rec => ({
      id: rec.id,
      title: rec.title,
      date: rec.date,
      duration: rec.duration,
      transcript: rec.transcript,
      audioUrl: rec.audio_file,
      analysis: rec.analysis_json,
      score: rec.score
    }));
  },

  // Сохранение новой записи
  saveRecording: async (audioBlob, aiResult, duration) => {
    const token = localStorage.getItem('access_token');
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'recording.m4a');
    formData.append('title', aiResult.title);
    formData.append('duration', duration);
    formData.append('transcript', aiResult.transcript);
    formData.append('score', aiResult.score);
    formData.append('analysis_json', JSON.stringify(aiResult));

    const response = await fetch(`${API_URL}/recordings/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: formData
    });
    if (!response.ok) throw new Error('Ошибка сохранения в облако');
    return await response.json();
  },

  logout: () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }
};
