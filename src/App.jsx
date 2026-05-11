import React, { useState, useEffect, useRef } from 'react';
import { db } from './db';
import Sidebar from './components/Sidebar';
import Stats from './components/Stats';
import { useRecorder } from './hooks/useRecorder';
import { analyzeSpeech } from './services/ai';
import { Mic, StopCircle, Play, Pause, FileText, BarChart3, Settings, Loader2 } from 'lucide-react';

export default function App() {
  const [recordings, setRecordings] = useState([]);
  const [activeRecording, setActiveRecording] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const audioRef = useRef(null);
  const { isRecording, recordingTime, startRecording, stopRecording } = useRecorder();

  useEffect(() => {
    db.recordings.toArray().then(data => {
      setRecordings(data.sort((a, b) => new Date(b.date) - new Date(a.date)));
    });
  }, []);

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
        
        const newRec = {
          title: aiResult.title,
          date: new Date().toISOString(),
          duration: result.duration,
          audioBlob: result.audioBlob,
          transcript: aiResult.transcript,
          analysis: {
            structureScore: aiResult.score,
            errors: aiResult.errors
          }
        };
        
        const id = await db.recordings.add(newRec);
        const savedRec = { ...newRec, id };
        setRecordings([savedRec, ...recordings]);
        setActiveRecording(savedRec);
      } catch (err) {
        alert("Ошибка анализа ИИ. Проверьте ключ или VPN.");
        console.error(err);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const togglePlay = () => {
    if (!audioRef.current && activeRecording?.audioBlob) {
      const url = URL.createObjectURL(activeRecording.audioBlob);
      audioRef.current = new Audio(url);
      audioRef.current.onended = () => setIsPlaying(false);
    }
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setIsPlaying(false);
    }
  }, [activeRecording]);

  const statsData = recordings
    .slice(0, 10)
    .reverse()
    .map(r => ({
      date: new Date(r.date).toLocaleDateString(),
      score: r.analysis.structureScore
    }));

  return (
    <div className="flex h-screen bg-[#0f0f0f] text-gray-100 overflow-hidden font-sans">
      <Sidebar 
        recordings={recordings} 
        activeId={activeRecording?.id}
        onSelect={(id) => db.recordings.get(id).then(setActiveRecording)}
        onNew={() => setActiveRecording(null)}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Хедер */}
        <div className="p-8 flex justify-between items-center bg-[#0f0f0f]/80 backdrop-blur-md z-10 border-b border-white/5">
          <div>
            {activeRecording && (
              <h2 className="text-xl font-bold tracking-tight">{activeRecording.title}</h2>
            )}
            {isAnalyzing && (
              <div className="flex items-center gap-2 text-gray-400 text-sm animate-pulse">
                <Loader2 size={16} className="animate-spin" />
                ИИ анализирует вашу речь...
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 pb-12">
          {!activeRecording && !isRecording && !isAnalyzing ? (
            <div className="h-full flex flex-col items-center justify-center max-w-2xl mx-auto text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-white/10 to-white/5 rounded-[40px] flex items-center justify-center mb-10 border border-white/10 shadow-2xl">
                <Mic size={40} className="text-white" />
              </div>
              <h1 className="text-4xl font-bold mb-6 tracking-tight">Тренажер дикции и мысли</h1>
              <p className="text-gray-400 text-lg mb-10 leading-relaxed">
                Запишите свою речь, и ИИ проанализирует её прямо сейчас.
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
                  className="w-16 h-16 bg-white text-black rounded-2xl flex items-center justify-center hover:scale-105 transition-transform"
                >
                  {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                </button>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-500 mb-1">Длительность: {activeRecording.duration}</div>
                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white w-full rounded-full opacity-30" />
                  </div>
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
                      {activeRecording.analysis.errors.map((error, idx) => (
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
                        <span className="text-3xl font-mono font-bold tracking-tighter text-white">{activeRecording.analysis.structureScore}%</span>
                      </div>
                      <div className="h-3 bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <div 
                          className="h-full bg-gradient-to-r from-gray-500 to-white rounded-full transition-all duration-1000 ease-out" 
                          style={{ width: `${activeRecording.analysis.structureScore}%` }}
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
