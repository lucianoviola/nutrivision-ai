import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MealLog, UserSettings } from '../types.ts';
import PhotoGallery from './PhotoGallery.tsx';
import MealDetailModal from '../components/MealDetailModal.tsx';
import { MealCardSkeleton } from '../components/Skeleton.tsx';

interface LogHistoryProps {
  logs: MealLog[];
  onDelete: (id: string) => void;
  onUpdateLog?: (meal: MealLog) => void;
  onDuplicateLog?: (meal: MealLog) => void;
  settings?: UserSettings;
}

// Animated timeline empty state with personality
const HistoryEmptyState: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);
  
  if (searchQuery) {
    return (
      <div className="text-center mt-16">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(168, 85, 247, 0.1))',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.15), inset 0 1px 0 rgba(255,255,255,0.05)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="rgba(255,255,255,0.5)" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="rgba(255,255,255,0.5)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <p className="text-white font-semibold text-lg">No meals found</p>
        <p className="text-white/40 text-sm mt-1">Try a different search term</p>
      </div>
    );
  }
  
  return (
    <div 
      className={`text-center mt-12 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Abstract orbiting illustration */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        {/* Outer glow */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
        
        {/* Main orb - borderless */}
        <div 
          className="absolute inset-4 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.2))',
            boxShadow: '0 0 50px rgba(139, 92, 246, 0.3), inset 0 0 30px rgba(236, 72, 153, 0.15), inset 0 0 0 1px rgba(255,255,255,0.08)',
            animation: 'breathe 3s ease-in-out infinite',
          }}
        />
        
        {/* Inner highlight */}
        <div 
          className="absolute inset-10 rounded-full"
          style={{
            background: 'radial-gradient(circle at 30% 30%, rgba(255, 255, 255, 0.15) 0%, transparent 60%)',
          }}
        />
        
        {/* Orbiting particles */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              background: i === 0 ? '#A855F7' : i === 1 ? '#EC4899' : '#8B5CF6',
              boxShadow: `0 0 10px ${i === 0 ? '#A855F7' : i === 1 ? '#EC4899' : '#8B5CF6'}`,
              left: '50%',
              top: '50%',
              animation: `historyOrbit${i} ${5 + i}s linear infinite`,
            }}
          />
        ))}
        
        {/* Center clock icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="opacity-50">
            <circle cx="12" cy="12" r="9" stroke="white" strokeWidth="1.5"/>
            <path d="M12 7v5l3 3" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-2">Your story starts here</h3>
      <p className="text-sm text-white/50 mb-6 max-w-[240px] mx-auto">
        Every meal tells a tale
      </p>
      
      <button
        onClick={() => {/* Navigate to camera */}}
        className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 active:scale-95"
        style={{
          background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
          boxShadow: '0 6px 24px rgba(139, 92, 246, 0.35)',
        }}
      >
        <span className="flex items-center space-x-2">
          <span>Log your first meal</span>
          <span>→</span>
        </span>
      </button>
      
      <style>{`
        @keyframes historyOrbit0 {
          from { transform: translate(-50%, -50%) rotate(0deg) translateX(40px) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg) translateX(40px) rotate(-360deg); }
        }
        @keyframes historyOrbit1 {
          from { transform: translate(-50%, -50%) rotate(120deg) translateX(48px) rotate(-120deg); }
          to { transform: translate(-50%, -50%) rotate(480deg) translateX(48px) rotate(-480deg); }
        }
        @keyframes historyOrbit2 {
          from { transform: translate(-50%, -50%) rotate(240deg) translateX(36px) rotate(-240deg); }
          to { transform: translate(-50%, -50%) rotate(600deg) translateX(36px) rotate(-600deg); }
        }
      `}</style>
    </div>
  );
};

const LogHistory: React.FC<LogHistoryProps> = ({ logs, onDelete, onUpdateLog, onDuplicateLog, settings }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealLog | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

  useEffect(() => {
    const timer = setTimeout(() => setHeaderVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);

  // Filter logs by search query
  const filteredLogs = useMemo(() => {
    if (!searchQuery.trim()) return sortedLogs;
    const query = searchQuery.toLowerCase();
    return sortedLogs.filter(log => 
      log.items.some(item => item.name.toLowerCase().includes(query)) ||
      log.type.toLowerCase().includes(query)
    );
  }, [sortedLogs, searchQuery]);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: { [key: string]: MealLog[] } = {};
    filteredLogs.forEach(log => {
      const date = new Date(log.timestamp).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(log);
    });
    return groups;
  }, [filteredLogs]);

  // Generate heatmap data (last 30 days) with calorie-based colors
  const heatmapData = useMemo(() => {
    const data: { date: Date; count: number; calories: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyGoal = settings?.dailyCalorieGoal || 2000;
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const dayLogs = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        return logDate.toDateString() === dateStr;
      });
      const count = dayLogs.length;
      const calories = dayLogs.reduce((sum, log) => sum + log.totalMacros.calories, 0);
      data.push({ date, count, calories });
    }
    
    return data;
  }, [logs, settings]);

  const formatDateHeader = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  const handleCopy = (log: MealLog) => {
    const text = `${log.type.toUpperCase()} - ${log.items.map(i => i.name).join(', ')} | ${Math.round(log.totalMacros.calories)} kcal (P:${Math.round(log.totalMacros.protein)} C:${Math.round(log.totalMacros.carbs)} F:${Math.round(log.totalMacros.fat)})`;
    navigator.clipboard.writeText(text).then(() => {
        setCopiedId(log.id);
        setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const getMealEmoji = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '☀️';
      case 'dinner': return '🌙';
      default: return '🍪';
    }
  };

  const getMealGradient = (type: string) => {
    switch (type) {
      case 'breakfast': return 'linear-gradient(135deg, #FBBF24, #F59E0B)';
      case 'lunch': return 'linear-gradient(135deg, #10B981, #14B8A6)';
      case 'dinner': return 'linear-gradient(135deg, #8B5CF6, #EC4899)';
      default: return 'linear-gradient(135deg, #A855F7, #EC4899)';
    }
  };

  // Calculate total stats
  const totalStats = useMemo(() => {
    return filteredLogs.reduce((acc, log) => ({
      calories: acc.calories + log.totalMacros.calories,
      meals: acc.meals + 1
    }), { calories: 0, meals: 0 });
  }, [filteredLogs]);

  return (
    <div className="h-full flex flex-col relative">
      {/* Opal-style background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: '#0D0B1C' }} />
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 30% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(236, 72, 153, 0.08) 0%, transparent 50%)
            `,
          }}
        />
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto pb-28 relative z-10">
        {/* Header */}
        <div className={`pt-14 px-6 pb-6 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-title-1-lg font-bold text-white">History</h1>
            <div className="flex items-center space-x-2">
              {logs.some(log => log.imageUrl) && (
                <button
                  onClick={() => setShowPhotoGallery(true)}
                  className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
                  style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                  title="View Photo Gallery"
                >
                  <span className="text-white">🖼️</span>
                </button>
              )}
              {logs.length > 0 && (
                <div 
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(139, 92, 246, 0.15)',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                  }}
                >
                  <span className="text-xs font-bold text-white/70">{filteredLogs.length} {filteredLogs.length === 1 ? 'meal' : 'meals'}</span>
                </div>
              )}
            </div>
             </div>
          
          {/* Search bar */}
          {logs.length > 0 && (
            <div className="relative mb-4">
              <input
                type="text"
                placeholder="Search meals..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-base text-white placeholder-white/30 transition-all duration-300 focus:outline-none"
                style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.05)',
                }}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30">🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                >
                  ✕
                                </button>
              )}
            </div>
          )}
          
          {/* Heatmap Calendar */}
          {logs.length > 0 && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-caption text-gray-500 font-medium">Last 30 days</span>
                <div className="flex items-center space-x-2">
                  <span className="text-[10px] text-gray-600">Less</span>
                  <div className="flex space-x-1">
                    {[0, 1, 2, 3, 4].map((level) => {
                      const dailyGoal = settings?.dailyCalorieGoal || 2000;
                      let bgColor = 'rgba(255,255,255,0.05)'; // Gray for no data
                      if (level === 0) {
                        bgColor = 'rgba(255,255,255,0.05)';
                      } else if (level <= 2) {
                        // Green shades (under/on target)
                        const intensity = (level / 2) * 0.4;
                        bgColor = `rgba(34, 197, 94, ${0.2 + intensity})`;
                      } else {
                        // Orange/Red (over target)
                        const intensity = ((level - 2) / 2) * 0.4;
                        bgColor = `rgba(239, 68, 68, ${0.3 + intensity})`;
                      }
                      return (
                        <div
                          key={level}
                          className="w-2.5 h-2.5 rounded"
                          style={{ background: bgColor }}
                        />
                      );
                    })}
                  </div>
                  <span className="text-[10px] text-gray-600">More</span>
                </div>
                            </div>
              <div className="flex space-x-1">
                {heatmapData.map((day, index) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isToday = day.date.toDateString() === today.toDateString();
                  const dailyGoal = settings?.dailyCalorieGoal || 2000;
                  
                  // Color based on calories vs goal
                  let backgroundColor = 'rgba(255,255,255,0.05)'; // Gray for no data
                  let borderColor = 'transparent';
                  
                  if (day.calories > 0) {
                    const percentage = (day.calories / dailyGoal) * 100;
                    if (percentage <= 100) {
                      // Green shades for on/under target
                      const intensity = Math.min(percentage / 100, 1);
                      backgroundColor = `rgba(34, 197, 94, ${0.2 + intensity * 0.4})`;
                    } else {
                      // Orange/Red for over target
                      const overage = Math.min((percentage - 100) / 50, 1); // Cap at 150% for color intensity
                      backgroundColor = `rgba(239, 68, 68, ${0.3 + overage * 0.4})`;
                    }
                  }
                  
                  if (isToday) {
                    borderColor = 'rgba(139, 92, 246, 0.8)';
                  }
                  
                  return (
                    <div
                      key={index}
                      className="flex-1 h-8 rounded transition-all duration-300 hover:scale-110 cursor-pointer relative group"
                      style={{
                        background: backgroundColor,
                        border: borderColor !== 'transparent' ? `1px solid ${borderColor}` : 'none',
                        animationDelay: `${index * 20}ms`,
                        opacity: 0,
                        animation: 'fadeIn 0.3s ease-out forwards',
                      }}
                      title={`${day.date.toLocaleDateString()}: ${day.count} ${day.count === 1 ? 'meal' : 'meals'}, ${Math.round(day.calories)} kcal`}
                    >
                      {day.count > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-[8px] font-bold text-white">{day.count}</span>
                        </div>
                                )}
                            </div>
                  );
                })}
              </div>
            </div>
          )}
          
          {/* Stats summary */}
          {logs.length > 0 && (
            <div className="flex space-x-3">
              <div 
                className="flex-1 rounded-2xl p-4"
                style={{
                  background: 'rgba(26, 22, 51, 0.6)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="text-xs text-white/40 font-medium">Total Calories</p>
                    <p className="text-lg font-bold text-white">{Math.round(totalStats.calories).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div 
                className="flex-1 rounded-2xl p-4"
                style={{
                  background: 'rgba(26, 22, 51, 0.6)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🍽️</span>
                  <div>
                    <p className="text-xs text-white/40 font-medium">Total Meals</p>
                    <p className="text-lg font-bold text-white">{totalStats.meals}</p>
                  </div>
                                </div>
                                </div>
                            </div>
          )}
        </div>

        {/* Content with Timeline */}
        <div className="px-6">
          {filteredLogs.length === 0 ? (
            <HistoryEmptyState searchQuery={searchQuery} />
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div 
                className="absolute left-8 top-0 bottom-0 w-0.5"
                style={{ background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.3), transparent)' }}
              />
              
              <div className="space-y-8">
                {Object.entries(groupedLogs).map(([date, dateLogs], groupIndex) => (
                  <div key={date} className="relative">
                    {/* Date header with timeline dot */}
                    <div className="flex items-center mb-4 relative">
                      <div 
                        className="absolute left-0 w-4 h-4 rounded-full z-10"
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                          boxShadow: '0 0 12px rgba(139, 92, 246, 0.6)',
                          transform: 'translateX(-6px)',
                        }}
                      />
                      <span className="text-body font-bold text-gray-400 ml-6">{formatDateHeader(date)}</span>
                      <div className="flex-1 h-[1px] ml-3" style={{ background: 'rgba(255,255,255,0.05)' }}></div>
                    </div>
                    
                    {/* Logs for this date */}
                    <div className="space-y-3 ml-6">
                      {dateLogs.map((log, index) => (
                        <SwipeableMealCard 
                          key={log.id} 
                          log={log} 
                          index={groupIndex * 10 + index}
                          copiedId={copiedId}
                          onCopy={handleCopy}
                          onDelete={onDelete}
                          onDuplicate={onDuplicateLog}
                          onSelect={setSelectedMeal}
                          formatTime={formatTime}
                          getMealEmoji={getMealEmoji}
                          getMealGradient={getMealGradient}
                        />
                      ))}
                        </div>
                    </div>
                ))}
              </div>
            </div>
         )}
        </div>
      </div>

      {/* Photo Gallery Modal */}
      {showPhotoGallery && (
        <PhotoGallery 
          logs={logs} 
          onClose={() => setShowPhotoGallery(false)} 
        />
      )}

      {/* Meal Detail Modal */}
      <MealDetailModal
        meal={selectedMeal}
        onClose={() => setSelectedMeal(null)}
        onDelete={onDelete}
        onUpdate={onUpdateLog}
        aiProvider="openai"
      />
    </div>
  );
};

// Swipeable meal card with actions
const SwipeableMealCard: React.FC<{
  log: MealLog;
  index: number;
  copiedId: string | null;
  onCopy: (log: MealLog) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (log: MealLog) => void;
  onSelect: (log: MealLog) => void;
  formatTime: (ts: number) => string;
  getMealEmoji: (type: string) => string;
  getMealGradient: (type: string) => string;
}> = ({ log, index, copiedId, onCopy, onDelete, onDuplicate, onSelect, formatTime, getMealEmoji, getMealGradient }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const startXRef = useRef(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 50 + 200);
    return () => clearTimeout(timer);
  }, [index]);

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;
    const diff = e.touches[0].clientX - startXRef.current;
    const maxSwipe = 120;
    setSwipeOffset(Math.max(-maxSwipe, Math.min(0, diff)));
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (swipeOffset < -60) {
      // Swiped enough to reveal actions
      setSwipeOffset(-120);
    } else {
      // Snap back
      setSwipeOffset(0);
    }
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(log);
    }
    setSwipeOffset(0);
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action buttons (revealed on swipe) */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center space-x-2 pr-4">
        <button
          onClick={handleDuplicate}
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.1))',
            border: '1px solid rgba(99, 102, 241, 0.3)',
          }}
        >
          <i className="fa-solid fa-copy text-blue-400"></i>
        </button>
        <button
          onClick={() => onDelete(log.id)}
          className="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.2), rgba(220, 38, 38, 0.1))',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <i className="fa-solid fa-trash text-red-400"></i>
        </button>
      </div>
      
      {/* Card */}
      <div 
        ref={cardRef}
        className={`rounded-2xl p-4 transition-all duration-300 relative active:scale-[0.98] cursor-pointer ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        } ${isSwiping ? '' : 'hover:scale-[1.01]'}`}
        style={{
          background: 'rgba(26, 22, 51, 0.6)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
          backdropFilter: 'blur(10px)',
          transform: `translateX(${swipeOffset}px)`,
          touchAction: 'pan-y',
        }}
        onClick={() => {
          if (swipeOffset === 0) {
            onSelect(log);
          } else {
            setSwipeOffset(0);
          }
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className="flex items-center space-x-4">
          {/* Image/Icon - Larger */}
          <div className="relative">
            <div 
              className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 transition-transform duration-300 hover:scale-110"
              style={{ background: 'rgba(255,255,255,0.05)' }}
            >
              {log.imageUrl ? (
                <img src={log.imageUrl} alt="Meal" className="w-full h-full object-cover" />
              ) : (
                <div 
                  className="w-full h-full flex items-center justify-center text-2xl"
                  style={{ background: getMealGradient(log.type) }}
                >
                  {getMealEmoji(log.type)}
                </div>
              )}
            </div>
            {/* Gradient badge */}
            <div 
              className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center text-xs shadow-lg"
              style={{ background: getMealGradient(log.type) }}
            >
              {getMealEmoji(log.type)}
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="min-w-0 pr-2">
                <div className="flex items-center space-x-2">
                  <p className="text-body font-bold text-white capitalize">{log.type}</p>
                  <span className="text-caption text-gray-500">{formatTime(log.timestamp)}</span>
                </div>
                <p className="text-body text-gray-400 truncate mt-0.5">
                  {log.items.map(i => i.name).join(', ')}
                </p>
              </div>
              
              {/* Quick action */}
              <button 
                onClick={() => onCopy(log)} 
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all flex-shrink-0 ${
                  copiedId === log.id 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-white/5 text-gray-500 hover:text-white hover:bg-white/10 active:scale-95'
                }`}
              >
                <i className={`fa-solid ${copiedId === log.id ? 'fa-check' : 'fa-copy'} text-sm`}></i>
              </button>
            </div>
            
            {/* Macros */}
            <div className="flex items-center space-x-3 mt-3">
              <span className="text-title-2 font-bold text-white">
                {Math.round(log.totalMacros.calories)} kcal
              </span>
              <div className="flex space-x-2">
                <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }}>
                  P {Math.round(log.totalMacros.protein)}g
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#A855F7' }}>
                  C {Math.round(log.totalMacros.carbs)}g
                </span>
                <span className="text-xs px-2 py-0.5 rounded font-bold" style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#FB923C' }}>
                  F {Math.round(log.totalMacros.fat)}g
                </span>
              </div>
            </div>
            
            {/* Notes */}
            {log.note && (
              <div className="mt-2 pt-2 border-t border-white/5">
                <p className="text-xs text-white/40 italic flex items-start">
                  <span className="mr-1.5">📝</span>
                  <span>{log.note}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LogHistory;
