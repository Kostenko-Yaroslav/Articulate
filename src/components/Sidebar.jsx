import React from 'react';
import { Mic, History, Calendar, Clock } from 'lucide-react';

export default function Sidebar({ recordings, activeId, onSelect, onNew }) {
  return (
    <div className="w-80 h-screen bg-[#161616] border-r border-white/5 flex flex-col">
      <div className="p-6">
        <button 
          onClick={onNew}
          className="w-full py-3 px-4 bg-white text-black rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-200 transition-colors"
        >
          <Mic size={20} />
          Новая запись
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        <div className="flex items-center gap-2 px-2 mb-4 text-gray-500 text-sm font-medium">
          <History size={16} />
          <span>История тренировок</span>
        </div>
        
        <div className="space-y-2">
          {recordings.length === 0 ? (
            <div className="text-center py-10 text-gray-600 text-sm">
              Записей пока нет
            </div>
          ) : (
            recordings.map((rec) => (
              <button
                key={rec.id}
                onClick={() => onSelect(rec.id)}
                className={`w-full p-4 rounded-xl text-left transition-all group ${
                  activeId === rec.id 
                    ? 'bg-white/10 ring-1 ring-white/20' 
                    : 'hover:bg-white/5'
                }`}
              >
                <h3 className="font-medium truncate mb-2">{rec.title || 'Без названия'}</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(rec.date).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {rec.duration}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
