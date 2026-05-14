import React, { useState, useEffect, useRef } from 'react';
import { db as localDb } from './db';
import Sidebar from './components/Sidebar';
import Stats from './components/Stats';
import { useRecorder } from './hooks/useRecorder';
import { analyzeSpeech } from './services/ai';
import { backendApi } from './services/backend';
import { Mic, StopCircle, Play, Pause, FileText, BarChart3, Loader2, LogIn, LogOut, User, Plus } from 'lucide-react';

export default function App() {
  const [recordings, setRecordings] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access_token'));
  const [showAuthModal, setShowAuthModal] = useState(false); // Единая модалка для входа/регистрации
  const [isRegistering, setIsRegistering] = useState(false); // Для переключения между формами
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Для регистрации
  
  const [activeRecording, setActiveRecording] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null); // Для отображения имени пользователя

  const audioRef = useRef(null);
  const { isRecording, recordingTime, startRecording, stopRecording } = useRecorder();

  // Инициализация при загрузке: либо облако, либо локально
  useEffect(() => {
    if (isLoggedIn) {
      fetchCloudRecordings();
    } else {
      fetchLocalRecordings();
    }
  }, [isLoggedIn]);

  // Проверяем токен при старте, чтобы определить isLoggedIn
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
      // Если токен есть, но user info нет, можно сделать запрос на бэкенд для получения user info
      // Для простоты пока оставим только факт логина
    }
  }, []);

  const fetchLocalRecordings = () => {
    localDb.recordings.toArray().then(data => {
      setRecordings(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });
  };

  const fetchCloudRecordings = async () => {
    try {
      const data = await backendApi.getRecordings();
      setRecordings(data);
      // Можно было бы получить имя пользователя от бэкенда, но для MVP пока не нужно
      setCurrentUser({ username: 'Пользователь' }); 
    } catch (err) {
      console.error("Cloud fetch error:", err);
      backendApi.logout();
      setIsLoggedIn(false);
      setCurrentUser(null);
      alert('Сессия истекла или ошибка загрузки. Войдите снова.');
      setShowAuthModal(true); // Открыть модалку для повторного входа
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await backendApi.login(username, password);
      setIsLoggedIn(true);
      setShowAuthModal(false);
      setUsername('');
      setPassword('');
      fetchCloudRecordings(); // Загружаем записи после входа
    } catch (err) {
      alert('Неверный логин или пароль');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Пароли не совпадают!');
      return;
    }
    try {
      await backendApi.register(username, password);
      alert('Аккаунт успешно создан! Теперь войдите.');
      setIsRegistering(false); // Переключаемся на форму входа
      setUsername('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      alert(`Ошибка регистрации: ${err.message}`);
    }
  };

  const handleLogout = () => {
    backendApi.logout();
    setIsLoggedIn(false);
    setRecordings([]);
    setCurrentUser(null);
    fetchLocalRecordings(); // После выхода показываем локальные записи
  };

  const handleStart = () => {
    setActiveRecording(null);
    startRecording();
  };

  const handleStop = async () => {
    const result = await stopRecording();
    if (result) {
      setIsAnalyzing(true);
      try {
        const aiResult = await analyzeSpeech(result.audioBlob);
        
        if (isLoggedIn) {
          const savedRec = await backendApi.saveRecording(result.audioBlob, aiResult, result.duration);
          setRecordings(prev => [savedRec, ...prev]);
          setActiveRecording(savedRec);
        } else {
          const newRec = {
            title: aiResult.title, date: new Date().toISOString(), duration: result.duration, transcript: aiResult.transcript,
            analysis: { errors: aiResult.errors }, score: aiResult.score, audioBlob: result.audioBlob
          };
          const id = await localDb.recordings.add(newRec);
          const savedRec = { ...newRec, id };
          setRecordings(prev => [savedRec, ...prev]);
          setActiveRecording(savedRec);
        }
      } catch (err) {
        alert("Ошибка анализа ИИ. Проверьте ключ или VPN.");
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const setupAudio = (rec) => {
    if (audioRef.current) audioRef.current.pause();
    let url;
    if (rec.audioUrl) {
      url = `http://localhost:8000${rec.audioUrl}`; // Собираем полный URL
    } else if (rec.audioBlob) {
      url = URL.createObjectURL(rec.audioBlob);
    } else return;

    const audio = new Audio(url);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.onended = () => setIsPlaying(false);
    audioRef.current = audio;
  };

  const togglePlay = () => {
    if (!audioRef.current && activeRecording) setupAudio(activeRecording);
    if (isPlaying) audioRef.current?.pause(); else audioRef.current?.play();
    setIsPlaying(!isPlaying);
  };
  
  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) audioRef.current.currentTime = time;
  };

  const formatPlayerTime = (time) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
    }
  }, [activeRecording]);

  const statsData = recordings
    .slice(0, 10).reverse()
    .map(r => ({ date: new Date(r.date).toLocaleDateString(), score: r.score }));

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-gray-100 overflow-hidden font-sans">
      <Sidebar 
        recordings={recordings} 
        activeId={activeRecording?.id}
        onSelect={(id) => setActiveRecording(recordings.find(r => r.id === id))}
        onNew={() => setActiveRecording(null)}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Хедер */}
        <div className="p-8 flex justify-between items-center bg-[#0f0f0f]/80 backdrop-blur-md z-10 border-b border-white/5">
          <div className="flex items-center gap-4">
            {activeRecording && (
              <h2 className="text-xl font-bold tracking-tight">{activeRecording.title}</h2>
            )}
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-gray-400 text-sm animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                ИИ анализирует...
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-3 pl-4 border-l border-white/10">
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-white leading-none mb-1">{currentUser?.username || 'Пользователь'}</div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-tighter">Синхронизация ВКЛ</div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-3 bg-white/5 hover:bg-red-500/10 hover:text-red-500 rounded-2xl transition-all border border-white/5"
                  title="Выйти"
                >
                  <LogOut size={18} />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setShowAuthModal(true); setIsRegistering(false); }}
                className="flex items-center gap-2 px-5 py-3 bg-white text-black rounded-2xl font-bold text-sm hover:scale-105 transition-all active:scale-95"
              >
                <LogIn size={18} />
                Войти
              </button>
            )}
          </div>
        </div>

        {/* Модалка авторизации/регистрации */}
        {showAuthModal && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center p-6">
            <div className="bg-[#161616] w-full max-w-sm rounded-[32px] p-8 border border-white/10 shadow-2xl">
              <h3 className="text-2xl font-bold mb-6 text-center">{isRegistering ? 'Регистрация' : 'Вход в аккаунт'}</h3>
              <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
                <input type="text" placeholder="Имя пользователя" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl border border-white/10" />
                <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl border border-white/10" />
                {isRegistering && (
                  <input type="password" placeholder="Повторите пароль" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl border border-white/10" />
                )}
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowAuthModal(false)} className="flex-1 py-4 rounded-2xl text-gray-400 hover:bg-white/5">Отмена</button>
                  <button type="submit" className="flex-1 py-4 bg-white text-black font-bold rounded-2xl shadow-lg">{isRegistering ? 'Зарегистрироваться' : 'Войти'}</button>
                </div>
              </form>
              <button 
                onClick={() => setIsRegistering(!isRegistering)}
                className="w-full text-center text-gray-400 text-sm mt-6 hover:text-white transition-colors"
              >
                {isRegistering ? 'Уже есть аккаунт? Войти' : 'Нет аккаунта? Зарегистрироваться'}
              </button>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-8 pb-12">
          {!activeRecording && !isRecording && !isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-white/10 to-white/5 rounded-[40px] flex items-center justify-center mb-10 border border-white/10 shadow-2xl">
                <Mic size={40} className="text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-6 tracking-tight">Тренажер дикции и мысли</h1>
              <p className="text-gray-400 text-lg mb-10 leading-relaxed">
                Начните говорить, и наш ИИ проанализирует структуру ваших предложений, найдет слова-паразиты и подскажет, как звучать увереннее.
              </p>
              <button 
                onClick={handleStart}
                className="group relative px-10 py-5 bg-white text-black rounded-3xl font-bold text-lg hover:scale-105 transition-all active:scale-95 shadow-2xl"
              >
                Начать запись
              </button>
              
              {recordings.length > 0 && (
                <div className="w-full max-w-xl mt-16 animate-in fade-in slide-in-from-top-4 duration-1000">
                  <Stats data={statsData} />
                </div>
              )}
            </div>
          ) : isRecording ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="text-8xl font-mono mb-16 tracking-tighter tabular-nums text-white">{recordingTime}</div>
              <div className="flex items-center gap-3 mb-12 px-5 py-2 bg-red-500/10 rounded-full border border-red-500/20">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500 font-bold uppercase tracking-[0.2em] text-xs text-white text-white">Запись активна</span>
              </div>
              <button 
                onClick={handleStop}
                className="w-24 h-24 bg-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-2xl"
              >
                <StopCircle size={40} className="text-black" />
              </button>
            </div>
          ) : isAnalyzing ? (
             <div className="h-full flex flex-col items-center justify-center text-center">
                <Loader2 size={64} className="text-white animate-spin mb-8 opacity-20" />
                <h2 className="text-2xl font-bold mb-2 text-white">ИИ слушает запись...</h2>
                <p className="text-gray-500">Это займет около 5-10 секунд</p>
             </div>
          ) : (
            <div className="max-w-5xl mx-auto py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="flex items-center gap-6 p-6 bg-white/5 rounded-[32px] border border-white/5">
                <button 
                  onClick={togglePlay}
                  className="w-16 h-16 bg-white text-black rounded-2xl flex items-center justify-center hover:scale-105 transition-transform shrink-0"
                >
                  {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </button>
                <div className="flex-1 space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                    <span>{formatPlayerTime(currentTime)}</span>
                    <span>{formatPlayerTime(duration)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max={duration || 0} 
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-white hover:accent-gray-300 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-white/5 rounded-[32px] p-8 border border-white/5">
                    <div className="flex items-center gap-3 mb-8 text-gray-400">
                      <FileText size={20} />
                      <span className="text-xs font-bold uppercase tracking-widest">Транскрипт</span>
                    </div>
                    <p className="text-2xl leading-[1.6] text-gray-200 font-medium whitespace-pre-wrap">
                      {activeRecording.transcript}
                    </p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white/5 rounded-[32px] p-8 border border-white/5 flex flex-col h-full">
                    <div className="flex items-center gap-3 mb-8 text-gray-400">
                      <BarChart3 size={20} />
                      <span className="text-xs font-bold uppercase tracking-widest">Анализ</span>
                    </div>

                    <div className="space-y-4 flex-1 overflow-y-auto max-h-[400px]">
                      {activeRecording.analysis?.errors?.map((error, idx) => (
                        <div key={idx} className="p-5 bg-white/5 rounded-2xl border border-white/5 transition-colors">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-tighter">{error.type}</span>
                          </div>
                          <div className="text-sm text-red-400/80 line-through decoration-1 mb-2 font-medium italic">"{error.text}"</div>
                          <div className="text-sm text-emerald-400 font-semibold leading-relaxed">→ {error.suggestion}</div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-10 pt-8 border-t border-white/5">
                      <div className="flex justify-between items-end mb-4">
                        <span className="text-xs font-bold text-gray-500 uppercase tracking-widest text-white">Оценка речи</span>
                        <span className="text-3xl font-mono font-bold tracking-tighter text-white">{activeRecording.analysis?.score || 0}%</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-gray-500 to-white rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${activeRecording.analysis?.score || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
