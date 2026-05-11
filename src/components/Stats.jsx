import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function Stats({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="w-full h-[220px] mt-8 bg-white/5 rounded-[32px] p-6 border border-white/5 min-h-[220px]">
      <div className="text-[10px] font-black text-gray-500 uppercase mb-6 tracking-[0.2em]">История прогресса</div>
      <div className="w-full h-[120px]"> {/* Фиксированная высота для предотвращения ошибок Recharts */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <Line 
              type="monotone" 
              dataKey="score" 
              stroke="#fff" 
              strokeWidth={3} 
              dot={{ fill: '#000', stroke: '#fff', strokeWidth: 2, r: 4 }} 
              activeDot={{ r: 6, fill: '#fff' }}
            />
            <XAxis dataKey="date" hide />
            <YAxis hide domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#161616', 
                border: '1px solid rgba(255,255,255,0.1)', 
                borderRadius: '16px', 
                fontSize: '12px',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
              }}
              itemStyle={{ color: '#fff' }}
              cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
