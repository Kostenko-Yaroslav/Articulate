import Dexie from 'dexie';

export const db = new Dexie('SpeechTrainerDB');

db.version(1).stores({
  recordings: '++id, title, date, duration' 
  // Мы индексируем основные поля для быстрого поиска
});
