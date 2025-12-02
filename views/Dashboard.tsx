import React, { useMemo } from 'react';
import { MealLog, UserSettings } from '../types.ts';
import NutritionRing from '../components/NutritionRing.tsx';

interface DashboardProps {
  logs: MealLog[];
  settings: UserSettings;
}

const Dashboard: React.FC<DashboardProps> = ({ logs, settings }) => {
  
  const today = useMemo(() => {
    const now = new Date();
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.getDate() === now.getDate() && 
             logDate.getMonth() === now.getMonth() && 
             logDate.getFullYear() === now.getFullYear();
    });
  }, [logs]);

  const totals = useMemo(() => {
    return today.reduce((acc, log) => ({
      calories: acc.calories + log.totalMacros.calories,
      protein: acc.protein + log.totalMacros.protein,
      carbs: acc.carbs + log.totalMacros.carbs,
      fat: acc.fat + log.totalMacros.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [today]);

  // CSS Chart Data Calculation
  const maxGoal = Math.max(settings.dailyProteinGoal, settings.dailyCarbGoal, settings.dailyFatGoal);
  const getBarHeight = (val: number) => {
      // Cap at 100% height for the visual
      return Math.min(100, (val / maxGoal) * 100) + '%';
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24 bg-ios-bg">
      {/* Header */}
      <div className="pt-14 pb-8 px-6 bg-white rounded-b-[2rem] shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07)] mb-6 animate-fade-in-down">
        <h1 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-2">{getGreeting()}</h1>
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Daily Summary</h2>
        
        <div className="mt-8 flex justify-between items-center px-4">
           <div className="flex flex-col items-center">
             <span className="text-5xl font-black text-gray-900 tracking-tighter">{Math.round(totals.calories)}</span>
             <span className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-1">Eaten</span>
           </div>
           <div className="h-12 w-[1px] bg-gray-100"></div>
           <div className="flex flex-col items-center">
             <span className="text-4xl font-black text-gray-300 tracking-tighter">{Math.max(0, settings.dailyCalorieGoal - Math.round(totals.calories))}</span>
             <span className="text-xs text-gray-400 font-bold uppercase tracking-wide mt-1">Remaining</span>
           </div>
        </div>

        {/* Macros Rings */}
        <div className="mt-10 flex justify-around items-end">
          <NutritionRing current={totals.protein} target={settings.dailyProteinGoal} color="#34c759" label="Protein" unit="g" radius={32} stroke={5} />
          <NutritionRing current={totals.carbs} target={settings.dailyCarbGoal} color="#007aff" label="Carbs" unit="g" radius={32} stroke={5} />
          <NutritionRing current={totals.fat} target={settings.dailyFatGoal} color="#ff3b30" label="Fat" unit="g" radius={32} stroke={5} />
        </div>
      </div>

      {/* Recent Meals */}
      <div className="px-6 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900 mb-3 ml-1">Today's Meals</h3>
          {today.length === 0 ? (
            <div className="bg-white/50 backdrop-blur-sm rounded-2xl p-8 text-center border border-white shadow-sm">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <i className="fa-solid fa-camera text-gray-400 text-xl"></i>
              </div>
              <p className="text-gray-500 text-sm font-medium">No meals logged yet.</p>
              <p className="text-gray-400 text-xs mt-1">Tap the + button to scan your food.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {today.map(log => (
                <div key={log.id} className="bg-white rounded-2xl p-3 flex items-center shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-gray-50">
                  <div className="w-16 h-16 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 relative">
                      {log.imageUrl ? (
                          <img src={log.imageUrl} alt="Meal" className="w-full h-full object-cover" />
                      ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-300">
                              <i className="fa-solid fa-utensils"></i>
                          </div>
                      )}
                  </div>
                  <div className="ml-4 flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                          <div className="truncate pr-2">
                              <p className="font-bold text-gray-900 capitalize text-sm">{log.type}</p>
                              <p className="text-xs text-gray-500 truncate mt-0.5">
                                  {log.items.map(i => i.name).join(', ')}
                              </p>
                          </div>
                          <span className="font-bold text-gray-900 text-sm whitespace-nowrap">{Math.round(log.totalMacros.calories)}</span>
                      </div>
                      <div className="mt-2 flex space-x-2">
                          <span className="text-[9px] px-1.5 py-0.5 bg-green-50 text-green-700 rounded font-semibold tracking-wide">P: {Math.round(log.totalMacros.protein)}g</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded font-semibold tracking-wide">C: {Math.round(log.totalMacros.carbs)}g</span>
                          <span className="text-[9px] px-1.5 py-0.5 bg-red-50 text-red-700 rounded font-semibold tracking-wide">F: {Math.round(log.totalMacros.fat)}g</span>
                      </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

         {/* Weekly Chart (CSS Implementation - No External Libraries) */}
         <div className="mb-6">
           <h3 className="text-lg font-bold text-gray-900 mb-3 ml-1">Macro Distribution</h3>
           <div className="bg-white rounded-2xl p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-gray-50 h-64 flex flex-col justify-end">
               <div className="flex justify-around items-end h-48 w-full space-x-4">
                   
                   {/* Protein Bar */}
                   <div className="flex flex-col items-center w-1/4 h-full justify-end group">
                       <div className="relative w-full bg-gray-100 rounded-t-lg rounded-b-lg overflow-hidden h-full">
                           <div 
                                style={{ height: getBarHeight(totals.protein) }} 
                                className="absolute bottom-0 left-0 w-full bg-ios-green transition-all duration-1000 ease-out rounded-t-lg rounded-b-lg opacity-90 group-hover:opacity-100"
                           ></div>
                       </div>
                       <span className="text-xs font-bold text-gray-500 mt-2">Prot</span>
                       <span className="text-[10px] text-gray-400 font-medium">{Math.round(totals.protein)}g</span>
                   </div>

                   {/* Carbs Bar */}
                   <div className="flex flex-col items-center w-1/4 h-full justify-end group">
                       <div className="relative w-full bg-gray-100 rounded-t-lg rounded-b-lg overflow-hidden h-full">
                           <div 
                                style={{ height: getBarHeight(totals.carbs) }} 
                                className="absolute bottom-0 left-0 w-full bg-ios-blue transition-all duration-1000 ease-out rounded-t-lg rounded-b-lg opacity-90 group-hover:opacity-100"
                           ></div>
                       </div>
                       <span className="text-xs font-bold text-gray-500 mt-2">Carb</span>
                       <span className="text-[10px] text-gray-400 font-medium">{Math.round(totals.carbs)}g</span>
                   </div>

                   {/* Fat Bar */}
                   <div className="flex flex-col items-center w-1/4 h-full justify-end group">
                       <div className="relative w-full bg-gray-100 rounded-t-lg rounded-b-lg overflow-hidden h-full">
                           <div 
                                style={{ height: getBarHeight(totals.fat) }} 
                                className="absolute bottom-0 left-0 w-full bg-ios-red transition-all duration-1000 ease-out rounded-t-lg rounded-b-lg opacity-90 group-hover:opacity-100"
                           ></div>
                       </div>
                       <span className="text-xs font-bold text-gray-500 mt-2">Fat</span>
                       <span className="text-[10px] text-gray-400 font-medium">{Math.round(totals.fat)}g</span>
                   </div>

               </div>
           </div>
         </div>
       </div>

    </div>
  );
};

export default Dashboard;