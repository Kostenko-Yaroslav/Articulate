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

  // Регистрация нового пользователя
  register: async (username, password) => {
    const response = await fetch(`${API_URL}/register/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.username ? errorData.username[0] : 'Ошибка регистрации');
    }
    return response.json();
  },

  // Получение всех записей
  getRecordings: async () => {
    const token = localStorage.getItem('access_token');
    if (!token) throw new Error('Пользователь не авторизован');
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
      analysis: rec.analysis_json, // Теперь analysis_json будет содержать {score, errors}
      score: rec.score
    }));
  },

  // Сохранение новой записи
  saveRecording: async (audioBlob, aiResult, duration) => {
    const token = localStorage.getItem('access_token');
    if (!token) throw new Error('Пользователь не авторизован');
    const formData = new FormData();
    formData.append('audio_file', audioBlob, 'recording.m4a');
    formData.append('title', aiResult.title);
    formData.append('duration', duration);
    formData.append('transcript', aiResult.transcript);
    formData.append('score', aiResult.score);
    // ОТПРАВЛЯЕМ ТОЛЬКО score И errors В analysis_json
    formData.append('analysis_json', JSON.stringify({
      score: aiResult.score,
      errors: aiResult.errors
    }));

    const response = await fetch(`${API_URL}/recordings/`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }, // FormData сам ставит Content-Type
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
