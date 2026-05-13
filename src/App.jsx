import React, { useState, useEffect, useRef } from 'react';
import { db as localDb } from './db';
import Sidebar from './components/Sidebar';
import Stats from './components/Stats';
import { useRecorder } from './hooks/useRecorder';
import { analyzeSpeech } from './services/ai';
import { backendApi } from './services/backend';
import { Mic, StopCircle, Play, Pause, FileText, BarChart3, Loader2, LogIn, LogOut, User } from 'lucide-react';

export default function App() {
  const [recordings, setRecordings] = useState([]);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('access_token'));
  const [showLogin, setShowLogin] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [activeRecording, setActiveRecording] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const audioRef = useRef(null);
  const { isRecording, recordingTime, startRecording, stopRecording } = useRecorder();

  useEffect(() => {
    if (isLoggedIn) {
      fetchCloudRecordings();
    } else {
      fetchLocalRecordings();
    }
  }, [isLoggedIn]);

  const fetchLocalRecordings = () => {
    localDb.recordings.toArray().then(data => {
      setRecordings(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });
  };

  const fetchCloudRecordings = async () => {
    try {
      const data = await backendApi.getRecordings();
      setRecordings(data);
    } catch (err) {
      console.error("Cloud fetch error:", err);
      backendApi.logout();
      setIsLoggedIn(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await backendApi.login(username, password);
      setIsLoggedIn(true);
      setShowLogin(false);
    } catch (err) {
      alert('Неверный логин или пароль');
    }
  };

  const handleLogout = () => {
    backendApi.logout();
    setIsLoggedIn(false);
    setRecordings([]);
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
          setRecordings([savedRec, ...recordings]);
          setActiveRecording(savedRec);
        } else {
          const newRec = {
            title: aiResult.title, date: new Date().toISOString(), duration: result.duration, transcript: aiResult.transcript,
            analysis: { errors: aiResult.errors }, score: aiResult.score, audioBlob: result.audioBlob
          };
          const id = await localDb.recordings.add(newRec);
          const savedRec = { ...newRec, id };
          setRecordings([savedRec, ...recordings]);
          setActiveRecording(savedRec);
        }
      } catch (err) {
        alert("Ошибка. Проверьте ключ или VPN.");
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
          {/* ... */}
          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <div className="flex items-center gap-3">
                <div className="text-sm font-bold">Синхронизация ВКЛ</div>
                <button onClick={handleLogout} className="p-3 bg-white/5 hover:bg-red-500/10 rounded-2xl transition-all" title="Выйти"><LogOut size={18} /></button>
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)} className="flex items-center gap-2 px-5 py-3 bg-white text-black rounded-2xl font-bold text-sm"><LogIn size={18} />Войти</button>
            )}
          </div>
        </div>

        {/* Модалка входа */}
        {showLogin && (
          <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-xl flex items-center justify-center">
            <div className="bg-[#161616] w-full max-w-sm rounded-[32px] p-8 border border-white/10">
              <h3 className="text-2xl font-bold mb-6">Вход в аккаунт</h3>
              <form onSubmit={handleLogin} className="space-y-4">
                <input type="text" placeholder="Логин" value={username} onChange={e => setUsername(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl border border-white/10" />
                <input type="password" placeholder="Пароль" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 p-4 rounded-2xl border border-white/10" />
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setShowLogin(false)} className="flex-1 py-4 rounded-2xl text-gray-400 hover:bg-white/5">Отмена</button>
                  <button type="submit" className="flex-1 py-4 bg-white text-black font-bold rounded-2xl">Войти</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Остальной UI */}
      </main>
    </div>
  );
}
