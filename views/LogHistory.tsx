import React, { useState, useMemo, useEffect, useRef } from 'react';
import { MealLog } from '../types.ts';
import PhotoGallery from './PhotoGallery.tsx';

interface LogHistoryProps {
  logs: MealLog[];
  onDelete: (id: string) => void;
}

// Animated timeline empty state with personality
const HistoryEmptyState: React.FC<{ searchQuery: string }> = ({ searchQuery }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [nodesVisible, setNodesVisible] = useState([false, false, false, false]);
  
  useEffect(() => {
    const timer1 = setTimeout(() => setIsVisible(true), 300);
    const timer2 = setTimeout(() => setNodesVisible([true, false, false, false]), 500);
    const timer3 = setTimeout(() => setNodesVisible([true, true, false, false]), 700);
    const timer4 = setTimeout(() => setNodesVisible([true, true, true, false]), 900);
    const timer5 = setTimeout(() => setNodesVisible([true, true, true, true]), 1100);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, []);
  
  if (searchQuery) {
    return (
      <div className="text-center mt-16">
        <div 
          className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 text-4xl animate-spring-up"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          🔍
        </div>
        <p className="text-white font-semibold text-lg">No meals found</p>
        <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
      </div>
    );
  }
  
  return (
    <div 
      className={`text-center mt-12 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Animated timeline illustration */}
      <div className="relative w-full max-w-sm mx-auto mb-8 h-32">
        {/* Timeline line */}
        <div 
          className="absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2"
          style={{
            background: 'linear-gradient(180deg, rgba(139, 92, 246, 0.3), rgba(34, 211, 238, 0.2), transparent)',
          }}
        />
        
        {/* Timeline nodes */}
        {[
          { emoji: '🍎', y: 0, delay: 0 },
          { emoji: '🥗', y: 30, delay: 0.2 },
          { emoji: '🍌', y: 60, delay: 0.4 },
          { emoji: '🥑', y: 90, delay: 0.6 },
        ].map((node, idx) => (
          <div
            key={idx}
            className="absolute left-1/2 -translate-x-1/2"
            style={{
              top: `${node.y}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            {/* Pulsing node */}
            <div
              className={`relative transition-all duration-500 ${
                nodesVisible[idx] ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
              }`}
              style={{
                animationDelay: `${node.delay}s`,
              }}
            >
              {/* Outer glow */}
              <div 
                className="absolute inset-0 rounded-full animate-breathe"
                style={{
                  background: 'radial-gradient(circle, rgba(139, 92, 246, 0.4), transparent)',
                  transform: 'scale(2)',
                }}
              />
              {/* Node circle */}
              <div 
                className="relative w-12 h-12 rounded-full flex items-center justify-center text-xl"
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  border: '2px solid rgba(139, 92, 246, 0.5)',
                  boxShadow: '0 0 20px rgba(139, 92, 246, 0.4)',
                }}
              >
                {node.emoji}
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Personality copy */}
      <h3 className="text-title-1-lg font-bold text-white mb-2 animate-spring-up">Your story starts here</h3>
      <p className="text-body text-gray-400 mb-8 max-w-xs mx-auto">
        Every meal tells a tale
      </p>
      
      {/* CTA Button */}
      <button
        onClick={() => {/* Navigate to camera */}}
        className="px-8 py-4 rounded-xl font-bold text-white transition-all duration-300 active:scale-95 relative overflow-hidden group"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.5)',
        }}
      >
        <span className="relative z-10 flex items-center space-x-2">
          <span>Log your first meal</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </span>
        <div 
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          }}
        />
      </button>
      
      <style>{`
        @keyframes floatTimeline {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
          50% { transform: translate(-50%, -50%) translateY(-8px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

const LogHistory: React.FC<LogHistoryProps> = ({ logs, onDelete }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showPhotoGallery, setShowPhotoGallery] = useState(false);
  const sortedLogs = [...logs].sort((a, b) => b.timestamp - a.timestamp);

  useEffect(() => {
    const timer = setTimeout(() => setHeaderVisible(true), 100);
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

  // Generate heatmap data (last 30 days)
  const heatmapData = useMemo(() => {
    const data: { date: Date; count: number }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toDateString();
      const count = logs.filter(log => {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        return logDate.toDateString() === dateStr;
      }).length;
      data.push({ date, count });
    }
    
    return data;
  }, [logs]);

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
      case 'breakfast': return 'linear-gradient(135deg, #fbbf24, #f59e0b)';
      case 'lunch': return 'linear-gradient(135deg, #34d399, #10b981)';
      case 'dinner': return 'linear-gradient(135deg, #818cf8, #6366f1)';
      default: return 'linear-gradient(135deg, #f472b6, #ec4899)';
    }
  };

  // Calculate total stats
  const totalStats = useMemo(() => {
    return filteredLogs.reduce((acc, log) => ({
      calories: acc.calories + log.totalMacros.calories,
      meals: acc.meals + 1
    }), { calories: 0, meals: 0 });
  }, [filteredLogs]);

  const maxHeatmapCount = Math.max(...heatmapData.map(d => d.count), 1);

  return (
    <div className="h-full overflow-y-auto pb-28 relative">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0a0a0f]" />
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            background: `
              radial-gradient(ellipse at 30% 20%, rgba(251, 191, 36, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 70% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)
            `,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
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
                    background: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                  title="View Photo Gallery"
                >
                  <i className="fa-solid fa-images text-white"></i>
                </button>
              )}
              {logs.length > 0 && (
                <div 
                  className="px-3 py-1.5 rounded-full"
                  style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  <span className="text-caption font-bold text-gray-300">{filteredLogs.length} meals</span>
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
                className="w-full px-4 py-3 rounded-xl text-body text-white placeholder-gray-500 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
              <i className="fa-solid fa-search absolute right-4 top-1/2 -translate-y-1/2 text-gray-500"></i>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-12 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  <i className="fa-solid fa-times"></i>
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
                    {[0, 1, 2, 3, 4].map((level) => (
                      <div
                        key={level}
                        className="w-2.5 h-2.5 rounded"
                        style={{
                          background: level === 0 
                            ? 'rgba(255,255,255,0.05)'
                            : `rgba(139, 92, 246, ${0.2 + level * 0.2})`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="text-[10px] text-gray-600">More</span>
                </div>
              </div>
              <div className="flex space-x-1">
                {heatmapData.map((day, index) => {
                  const intensity = day.count > 0 ? Math.min(day.count / maxHeatmapCount, 1) : 0;
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const isToday = day.date.toDateString() === today.toDateString();
                  
                  return (
                    <div
                      key={index}
                      className="flex-1 h-8 rounded transition-all duration-300 hover:scale-110 cursor-pointer relative group"
                      style={{
                        background: day.count > 0
                          ? `rgba(139, 92, 246, ${0.2 + intensity * 0.6})`
                          : 'rgba(255,255,255,0.05)',
                        border: isToday ? '1px solid rgba(139, 92, 246, 0.8)' : 'none',
                      }}
                      title={`${day.date.toLocaleDateString()}: ${day.count} meal${day.count !== 1 ? 's' : ''}`}
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
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.2), rgba(245, 158, 11, 0.1))' }}
                  >
                    🔥
                  </div>
                  <div>
                    <p className="text-caption text-gray-400 font-medium">Total Calories</p>
                    <p className="text-title-2 font-bold text-white">{Math.round(totalStats.calories).toLocaleString()}</p>
                  </div>
                </div>
              </div>
              <div 
                className="flex-1 rounded-2xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                    style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(139, 92, 246, 0.1))' }}
                  >
                    🍽️
                  </div>
                  <div>
                    <p className="text-caption text-gray-400 font-medium">Total Meals</p>
                    <p className="text-title-2 font-bold text-white">{totalStats.meals}</p>
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
  formatTime: (ts: number) => string;
  getMealEmoji: (type: string) => string;
  getMealGradient: (type: string) => string;
}> = ({ log, index, copiedId, onCopy, onDelete, formatTime, getMealEmoji, getMealGradient }) => {
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
    // TODO: Implement duplicate functionality
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
        className={`rounded-2xl p-4 transition-all duration-300 relative active:scale-[0.98] ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        } ${isSwiping ? '' : 'hover:scale-[1.01]'}`}
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
          backdropFilter: 'blur(10px)',
          transform: `translateX(${swipeOffset}px)`,
          touchAction: 'pan-y',
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
                <span className="text-caption px-2 py-0.5 rounded font-bold text-emerald-400" style={{ background: 'rgba(52, 211, 153, 0.15)' }}>
                  P {Math.round(log.totalMacros.protein)}g
                </span>
                <span className="text-caption px-2 py-0.5 rounded font-bold text-cyan-400" style={{ background: 'rgba(34, 211, 238, 0.15)' }}>
                  C {Math.round(log.totalMacros.carbs)}g
                </span>
                <span className="text-caption px-2 py-0.5 rounded font-bold text-orange-400" style={{ background: 'rgba(251, 146, 60, 0.15)' }}>
                  F {Math.round(log.totalMacros.fat)}g
                </span>
              </div>
            </div>
            
            {/* Notes */}
            {log.note && (
              <div className="mt-2 pt-2 border-t border-white/10">
                <p className="text-caption text-gray-400 italic flex items-start">
                  <i className="fa-solid fa-note-sticky mr-1.5 mt-0.5 text-xs text-purple-400"></i>
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
