import React from 'react';
import { MealLog } from '../types';

interface LogHistoryProps {
  logs: MealLog[];
  onDelete: (id: string) => void;
}

const LogHistory: React.FC<LogHistoryProps> = ({ logs, onDelete }) => {
  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

  const formatDate = (ts: number) => {
    return new Date(ts).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex-1 bg-ios-bg overflow-y-auto pb-24">
      <div className="pt-14 px-6 pb-6">
         <h1 className="text-3xl font-bold text-gray-900 mb-6">History</h1>
         
         {sortedLogs.length === 0 ? (
             <div className="text-center mt-20 text-gray-400">
                 <i className="fa-solid fa-clock-rotate-left text-5xl mb-4 opacity-30"></i>
                 <p>No meals logged yet.</p>
             </div>
         ) : (
            <div className="space-y-4">
                {sortedLogs.map(log => (
                    <div key={log.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative group">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{formatDate(log.timestamp)} • {log.type}</span>
                            <button onClick={() => onDelete(log.id)} className="text-gray-300 hover:text-red-500">
                                <i className="fa-solid fa-trash"></i>
                            </button>
                        </div>
                        <div className="flex items-center">
                            <div className="w-12 h-12 rounded-lg bg-gray-100 overflow-hidden flex-shrink-0">
                                {log.imageUrl ? (
                                    <img src={log.imageUrl} alt="Meal" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300"><i className="fa-solid fa-utensils"></i></div>
                                )}
                            </div>
                            <div className="ml-3 flex-1">
                                <div className="flex flex-wrap gap-1 mb-1">
                                    {log.items.map((item, i) => (
                                        <span key={i} className="text-sm text-gray-800 font-medium">{item.name}{i < log.items.length -1 ? ',' : ''}</span>
                                    ))}
                                </div>
                                <div className="flex items-center space-x-3 text-xs text-gray-500">
                                    <span className="font-bold text-gray-900">{Math.round(log.totalMacros.calories)} kcal</span>
                                    <span>P: {Math.round(log.totalMacros.protein)}g</span>
                                    <span>C: {Math.round(log.totalMacros.carbs)}g</span>
                                    <span>F: {Math.round(log.totalMacros.fat)}g</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
         )}
      </div>
    </div>
  );
};

export default LogHistory;