import React, { useMemo, useState, useEffect, useRef } from 'react';
import { MealLog, UserSettings } from '../types.ts';
import MealDetailModal from '../components/MealDetailModal.tsx';
import InsightsCard from '../components/InsightsCard.tsx';
import SmartSuggestions from '../components/SmartSuggestions.tsx';

interface DashboardProps {
  logs: MealLog[];
  settings: UserSettings;
  onAddMeal?: () => void;
  onDeleteLog?: (id: string) => void;
  onUpdateLog?: (meal: MealLog) => void;
}

// Opal-style calorie ring with purple/pink gradients
const CalorieRing: React.FC<{ eaten: number; goal: number }> = ({ eaten, goal }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const progress = Math.min(eaten / goal, 1);
  const remaining = Math.max(0, goal - eaten);
  const isEmpty = progress === 0;
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);
  
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (animatedProgress * circumference);
  
  const getGradientId = () => {
    if (progress >= 1) return 'ringGradientOver';
    if (progress >= 0.75) return 'ringGradientHigh';
    return 'ringGradientNormal';
  };
  
  // Floating particles for empty state
  const particles = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    angle: (i * 60) * (Math.PI / 180),
    delay: i * 0.2,
  }));
  
  return (
    <div className="relative flex items-center justify-center">
      {/* Outer breathing glow for empty state */}
      {isEmpty && (
        <div 
          className="absolute w-[200px] h-[200px] rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%)',
            animation: 'breathe 3s ease-in-out infinite',
          }}
        />
      )}
      
      <svg width="180" height="180" className="transform -rotate-90 relative z-10">
        <defs>
          {/* Opal purple-pink gradient */}
          <linearGradient id="ringGradientNormal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6" />
            <stop offset="50%" stopColor="#A855F7" />
            <stop offset="100%" stopColor="#EC4899" />
          </linearGradient>
          <linearGradient id="ringGradientHigh" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F472B6" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient id="ringGradientOver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F43F5E" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>
          
          {/* Animated gradient for empty state */}
          <linearGradient id="ringGradientEmpty" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8B5CF6">
              {isEmpty && <animate attributeName="stop-color" values="#8B5CF6;#A855F7;#EC4899;#8B5CF6" dur="3s" repeatCount="indefinite" />}
            </stop>
            <stop offset="100%" stopColor="#EC4899">
              {isEmpty && <animate attributeName="stop-color" values="#EC4899;#8B5CF6;#A855F7;#EC4899" dur="3s" repeatCount="indefinite" />}
            </stop>
          </linearGradient>
          
          {/* Glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Enhanced breathing glow for empty state */}
          <filter id="breatheGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur">
              {isEmpty && <animate attributeName="stdDeviation" values="3;6;3" dur="3s" repeatCount="indefinite" />}
            </feGaussianBlur>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background ring with breathing effect */}
        <circle
          cx="90"
          cy="90"
          r="70"
          fill="none"
          stroke={isEmpty ? "url(#ringGradientEmpty)" : "rgba(139, 92, 246, 0.15)"}
          strokeWidth="12"
          filter={isEmpty ? "url(#breatheGlow)" : "none"}
        >
          {isEmpty && (
            <animate attributeName="opacity" values="0.5;0.8;0.5" dur="3s" repeatCount="indefinite" />
          )}
        </circle>
        
        {/* Progress ring */}
        {progress > 0 && (
          <circle
            cx="90"
            cy="90"
            r="70"
            fill="none"
            stroke={`url(#${getGradientId()})`}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            filter="url(#glow)"
          />
        )}
        
        {/* Floating particles for empty state */}
        {isEmpty && particles.map((particle) => {
          const radius = 78;
          const x = 90 + radius * Math.cos(particle.angle);
          const y = 90 + radius * Math.sin(particle.angle);
          return (
            <circle
              key={particle.id}
              cx={x}
              cy={y}
              r="2"
              fill="#A855F7"
              opacity="0.6"
              filter="url(#glow)"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                values={`0 90 90;360 90 90`}
                dur="10s"
                repeatCount="indefinite"
                begin={`${particle.delay}s`}
              />
              <animate
                attributeName="opacity"
                values="0.2;0.8;0.2"
                dur="2s"
                repeatCount="indefinite"
                begin={`${particle.delay}s`}
              />
            </circle>
          );
        })}
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-6xl font-black text-white tracking-tight" style={{
          textShadow: '0 4px 30px rgba(139, 92, 246, 0.4)',
        }}>
          {Math.round(eaten)}
        </span>
        <span className="text-sm text-white/50 font-medium mt-1.5">
          of {goal} kcal
        </span>
        {/* Only show remaining badge when there's progress */}
        {!isEmpty && (
          <div 
            className="mt-3 px-4 py-1.5 rounded-full"
            style={{
              background: 'rgba(139, 92, 246, 0.2)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
            }}
          >
            <span className="text-sm font-semibold text-white/80">
              {remaining > 0 ? `${Math.round(remaining)} left` : '🎉 Goal reached!'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Opal-style macro pill with colored dot
const MacroPill: React.FC<{ 
  label: string; 
  current: number; 
  goal: number; 
  color: string;
  delay: number;
}> = ({ label, current, goal, color, delay }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const progress = Math.min((current / goal) * 100, 100);
  
  useEffect(() => {
    const timer1 = setTimeout(() => setIsVisible(true), delay);
    const timer2 = setTimeout(() => setAnimatedProgress(progress), delay + 200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [delay, progress]);
  
  return (
    <button
      className={`flex flex-col items-center px-5 py-3 rounded-2xl transition-all duration-500 relative active:scale-95 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
      style={{
        background: 'rgba(26, 22, 51, 0.7)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        backdropFilter: 'blur(12px)',
        minWidth: '100px',
      }}
    >
      {/* Label at top */}
      <span className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-1">
        {label}
      </span>
      
      <div className="flex items-center space-x-2">
        {/* Colored dot with glow */}
        <div 
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{
            background: color,
            boxShadow: `0 0 10px ${color}80`,
          }}
        />
        
        <div className="flex items-baseline space-x-1">
          <span className="text-xl font-black text-white">{Math.round(current)}</span>
          <span className="text-xs text-white/40 font-medium">/{goal}g</span>
        </div>
      </div>
      
      {/* Progress bar underneath */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(139, 92, 246, 0.1)' }}
      >
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ 
            width: `${animatedProgress}%`,
            background: color,
            boxShadow: `0 0 8px ${color}`,
          }}
        />
      </div>
    </button>
  );
};

// Opal-style meal card with long-press quick actions
const MealCard: React.FC<{ 
  log: MealLog; 
  index: number; 
  onClick?: () => void;
  onDelete?: (id: string) => void;
  onDuplicate?: (log: MealLog) => void;
}> = ({ log, index, onClick, onDelete, onDuplicate }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 80 + 400);
    return () => clearTimeout(timer);
  }, [index]);

  // Clear long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);
  
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
      case 'lunch': return 'linear-gradient(135deg, #34D399, #10B981)';
      case 'dinner': return 'linear-gradient(135deg, #8B5CF6, #A855F7)';
      default: return 'linear-gradient(135deg, #F472B6, #EC4899)';
    }
  };

  const handleTouchStart = () => {
    setIsPressed(true);
    longPressTimer.current = setTimeout(() => {
      setShowActions(true);
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500);
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  const handleClick = () => {
    if (!showActions && onClick) {
      onClick();
    }
  };

  const handleCopy = () => {
    const text = `${log.type.toUpperCase()} - ${log.items.map(i => i.name).join(', ')} | ${Math.round(log.totalMacros.calories)} kcal`;
    navigator.clipboard.writeText(text);
    setShowActions(false);
  };
  
  return (
    <>
      <div 
        className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 cursor-pointer ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        } ${isPressed ? 'scale-[0.98]' : 'hover:scale-[1.01]'} ${showActions ? 'ring-2 ring-purple-500/50' : ''}`}
        style={{
          background: 'rgba(26, 22, 51, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
        }}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onMouseLeave={() => setIsPressed(false)}
      >
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div 
            className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
            style={{ background: 'rgba(139, 92, 246, 0.1)' }}
          >
            {log.imageUrl ? (
              <img src={log.imageUrl} alt="Meal" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xl">
                {getMealEmoji(log.type)}
              </div>
            )}
          </div>
          <div 
            className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg flex items-center justify-center text-xs shadow-lg"
            style={{ background: getMealGradient(log.type) }}
          >
            {getMealEmoji(log.type)}
          </div>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
            <div className="min-w-0 pr-2">
              <p className="text-base font-bold text-white capitalize">{log.type}</p>
              <p className="text-sm text-white/40 truncate mt-0.5">
                {log.items.map(i => i.name).join(', ')}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-xl font-black text-white">{Math.round(log.totalMacros.calories)}</span>
              <span className="text-xs text-white/40 ml-1">kcal</span>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-2.5">
            <span className="text-xs px-2 py-0.5 rounded-md font-bold" style={{ 
              background: 'rgba(16, 185, 129, 0.15)', 
              color: '#34D399' 
            }}>
              P {Math.round(log.totalMacros.protein)}g
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-bold" style={{ 
              background: 'rgba(139, 92, 246, 0.15)', 
              color: '#A855F7' 
            }}>
              C {Math.round(log.totalMacros.carbs)}g
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-bold" style={{ 
              background: 'rgba(251, 146, 60, 0.15)', 
              color: '#FB923C' 
            }}>
              F {Math.round(log.totalMacros.fat)}g
            </span>
          </div>
          
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

      {/* Quick Actions Menu */}
      {showActions && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center px-6"
          onClick={() => setShowActions(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          {/* Menu */}
          <div 
            className="relative z-10 w-full max-w-sm rounded-2xl overflow-hidden animate-scale-up"
            style={{
              background: 'rgba(26, 22, 51, 0.95)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Meal Preview */}
            <div className="p-4 border-b border-white/10">
              <p className="text-sm font-bold text-white capitalize">{log.type}</p>
              <p className="text-xs text-white/40 truncate mt-0.5">
                {log.items.map(i => i.name).join(', ')}
              </p>
              <p className="text-lg font-black text-white mt-1">
                {Math.round(log.totalMacros.calories)} kcal
              </p>
            </div>
            
            {/* Actions */}
            <div className="p-2">
              <button
                onClick={() => { onClick?.(); setShowActions(false); }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(139, 92, 246, 0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#A855F7" strokeWidth="2" strokeLinecap="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#A855F7" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-white font-medium">Edit meal</span>
              </button>
              
              <button
                onClick={handleCopy}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <rect x="9" y="9" width="13" height="13" rx="2" stroke="#3B82F6" strokeWidth="2"/>
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="#3B82F6" strokeWidth="2"/>
                  </svg>
                </div>
                <span className="text-white font-medium">Copy to clipboard</span>
              </button>
              
              <button
                onClick={() => { onDuplicate?.(log); setShowActions(false); }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="#10B981" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-white font-medium">Log again</span>
              </button>
              
              <button
                onClick={() => { onDelete?.(log.id); setShowActions(false); }}
                className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl hover:bg-red-500/10 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(239, 68, 68, 0.2)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" stroke="#EF4444" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="text-red-400 font-medium">Delete</span>
              </button>
            </div>
            
            {/* Cancel */}
            <div className="p-2 pt-0">
              <button
                onClick={() => setShowActions(false)}
                className="w-full py-3 rounded-xl font-bold text-white/50 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        @keyframes scale-up {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-scale-up {
          animation: scale-up 0.2s ease-out;
        }
      `}</style>
    </>
  );
};

// Opal-style empty state
const EmptyState: React.FC<{ onAddMeal: () => void }> = ({ onAddMeal }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div 
      className={`text-center py-8 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Abstract glowing orb illustration */}
      <div className="relative w-28 h-28 mx-auto mb-6">
        {/* Outer glow ring */}
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.2) 0%, transparent 70%)',
            animation: 'pulse 3s ease-in-out infinite',
          }}
        />
        
        {/* Main orb */}
        <div 
          className="absolute inset-4 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.4), rgba(236, 72, 153, 0.3))',
            border: '1px solid rgba(139, 92, 246, 0.4)',
            boxShadow: '0 0 40px rgba(139, 92, 246, 0.3), inset 0 0 30px rgba(236, 72, 153, 0.2)',
            animation: 'breathe 3s ease-in-out infinite',
          }}
        />
        
        {/* Inner glow */}
        <div 
          className="absolute inset-8 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
          }}
        />
        
        {/* Floating particles */}
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              background: i % 2 === 0 ? '#A855F7' : '#EC4899',
              boxShadow: `0 0 8px ${i % 2 === 0 ? '#A855F7' : '#EC4899'}`,
              left: '50%',
              top: '50%',
              animation: `orbit${i} ${4 + i * 0.5}s linear infinite`,
            }}
          />
        ))}
        
        {/* Center plus icon */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-60">
            <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-1.5">Your plate is waiting!</h3>
      <p className="text-sm text-white/50 mb-6 max-w-[240px] mx-auto leading-relaxed">
        Capture your first meal and let AI analyze the nutrition
      </p>
      
      <button
        onClick={onAddMeal}
        className="px-6 py-3 rounded-xl font-bold text-white transition-all duration-300 active:scale-95 relative overflow-hidden group"
        style={{
          background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
          boxShadow: '0 6px 24px rgba(139, 92, 246, 0.35)',
        }}
      >
        <span className="relative z-10 flex items-center space-x-2">
          <span>Try it now</span>
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </span>
      </button>
      
      <style>{`
        @keyframes orbit0 {
          from { transform: translate(-50%, -50%) rotate(0deg) translateX(28px) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg) translateX(28px) rotate(-360deg); }
        }
        @keyframes orbit1 {
          from { transform: translate(-50%, -50%) rotate(90deg) translateX(32px) rotate(-90deg); }
          to { transform: translate(-50%, -50%) rotate(450deg) translateX(32px) rotate(-450deg); }
        }
        @keyframes orbit2 {
          from { transform: translate(-50%, -50%) rotate(180deg) translateX(26px) rotate(-180deg); }
          to { transform: translate(-50%, -50%) rotate(540deg) translateX(26px) rotate(-540deg); }
        }
        @keyframes orbit3 {
          from { transform: translate(-50%, -50%) rotate(270deg) translateX(34px) rotate(-270deg); }
          to { transform: translate(-50%, -50%) rotate(630deg) translateX(34px) rotate(-630deg); }
        }
      `}</style>
    </div>
  );
};

// Smart meal prompt based on time and logged meals
const MealPrompt: React.FC<{ 
  todayMeals: MealLog[]; 
  onAddMeal: () => void;
}> = ({ todayMeals, onAddMeal }) => {
  const [dismissed, setDismissed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 800);
    return () => clearTimeout(timer);
  }, []);
  
  const getMealSuggestion = () => {
    const hour = new Date().getHours();
    const mealTypes = todayMeals.map(m => m.type);
    
    // Breakfast time (6-10am)
    if (hour >= 6 && hour < 10 && !mealTypes.includes('breakfast')) {
      return { meal: 'breakfast', message: "Good morning! Ready to log breakfast?", icon: "☀️" };
    }
    // Lunch time (11am-2pm)
    if (hour >= 11 && hour < 14 && !mealTypes.includes('lunch')) {
      return { meal: 'lunch', message: "It's lunchtime! Log your meal?", icon: "🍽️" };
    }
    // Dinner time (5-9pm)
    if (hour >= 17 && hour < 21 && !mealTypes.includes('dinner')) {
      return { meal: 'dinner', message: "Dinner time! What are you having?", icon: "🌙" };
    }
    // Snack prompts (between meals)
    if (hour >= 14 && hour < 17 && todayMeals.length > 0) {
      return { meal: 'snack', message: "Afternoon snack?", icon: "🍎" };
    }
    
    return null;
  };
  
  const suggestion = getMealSuggestion();
  
  if (!suggestion || dismissed) return null;
  
  return (
    <div 
      className={`mx-6 mb-4 overflow-hidden rounded-2xl transition-all duration-500 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1))',
        border: '1px solid rgba(139, 92, 246, 0.25)',
      }}
    >
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{suggestion.icon}</span>
          <p className="text-sm font-medium text-white/80">{suggestion.message}</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={onAddMeal}
            className="px-4 py-1.5 rounded-lg text-sm font-bold text-white transition-all active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
            }}
          >
            Log now
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1.5 rounded-lg text-white/40 hover:text-white/60 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ logs, settings, onAddMeal, onDeleteLog, onUpdateLog }) => {
  const [headerVisible, setHeaderVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealLog | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  
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

  // Weekly stats
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= weekAgo && logDate <= now;
    });
    
    const dailyCalories: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayLogs = weekLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate.toDateString() === date.toDateString();
      });
      const dayTotal = dayLogs.reduce((sum, log) => sum + log.totalMacros.calories, 0);
      if (dayTotal > 0) dailyCalories.push(dayTotal);
    }
    
    const avgCalories = dailyCalories.length > 0 
      ? Math.round(dailyCalories.reduce((a, b) => a + b, 0) / dailyCalories.length)
      : 0;
    const totalMeals = weekLogs.length;
    const daysLogged = dailyCalories.length;
    
    return { avgCalories, totalMeals, daysLogged };
  }, [logs]);

  // Yesterday's meals for templates
  const yesterdayMeals = useMemo(() => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === yesterday.toDateString();
    });
  }, [logs]);

  // Calculate current streak
  const currentStreak = useMemo(() => {
    if (logs.length === 0) return 0;
    
    // Get unique dates with logs
    const datesWithLogs = new Set(
      logs.map(log => new Date(log.timestamp).toDateString())
    );
    
    let streak = 0;
    const today = new Date();
    
    // Check each day going backwards
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toDateString();
      
      if (datesWithLogs.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        // Allow today to be missing (day not over yet)
        break;
      }
    }
    
    return streak;
  }, [logs]);

  useEffect(() => {
    const timer = setTimeout(() => setHeaderVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return { text: "Good Morning", emoji: "🌅" };
    if (hour < 18) return { text: "Good Afternoon", emoji: "☀️" };
    return { text: "Good Evening", emoji: "🌙" };
  };
  
  const getFormattedDate = () => {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const greeting = getGreeting();
  const progressPercent = Math.round((totals.calories / settings.dailyCalorieGoal) * 100);

  // Pull-to-refresh handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    if (containerRef.current?.scrollTop === 0) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPulling || isRefreshing) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    if (diff > 0 && containerRef.current?.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, 100));
    }
  };

  const handleTouchEnd = () => {
    if (pullDistance > 60 && !isRefreshing) {
      setIsRefreshing(true);
      // Simulate refresh
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
      }, 1000);
    } else {
      setPullDistance(0);
    }
    setIsPulling(false);
  };

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto pb-28 relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Opal-style animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: '#0D0B1C' }} />
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(236, 72, 153, 0.1) 0%, transparent 50%),
              radial-gradient(ellipse at 50% 50%, rgba(168, 85, 247, 0.05) 0%, transparent 70%)
            `,
          }}
        />
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
      </div>
      
      {/* Pull-to-refresh indicator */}
      {(pullDistance > 0 || isRefreshing) && (
        <div 
          className="absolute top-0 left-0 right-0 flex items-center justify-center z-20 transition-all duration-300"
          style={{ 
            height: `${Math.max(pullDistance, isRefreshing ? 60 : 0)}px`,
            opacity: pullDistance > 20 || isRefreshing ? 1 : 0,
          }}
        >
          <div 
            className={`w-8 h-8 rounded-full flex items-center justify-center ${isRefreshing ? 'animate-spin' : ''}`}
            style={{
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(236, 72, 153, 0.3))',
              border: '2px solid rgba(139, 92, 246, 0.5)',
              transform: `rotate(${pullDistance * 3}deg)`,
            }}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none"
              style={{ opacity: pullDistance > 40 || isRefreshing ? 1 : 0.5 }}
            >
              <path 
                d="M4 12a8 8 0 018-8V1l5 4-5 4V6a6 6 0 100 12v2a8 8 0 01-8-8z" 
                fill="rgba(168, 85, 247, 0.8)"
              />
            </svg>
          </div>
        </div>
      )}

      {/* Content */}
      <div 
        className="relative z-10 transition-transform duration-300"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
      {/* Header */}
        <div className={`pt-14 pb-4 px-6 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center space-x-2">
                <span>{greeting.emoji}</span>
                <span>{greeting.text}</span>
              </h1>
              <p className="text-sm text-white/50 font-medium mt-0.5">{getFormattedDate()}</p>
            </div>
            
            {/* Compact streak badge */}
            {currentStreak > 0 && (
              <div 
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full"
                style={{
                  background: currentStreak >= 7 
                    ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(239, 68, 68, 0.15))'
                    : 'rgba(249, 115, 22, 0.15)',
                  border: `1px solid ${currentStreak >= 7 ? 'rgba(249, 115, 22, 0.4)' : 'rgba(249, 115, 22, 0.3)'}`,
                  boxShadow: currentStreak >= 7 ? '0 0 12px rgba(249, 115, 22, 0.2)' : 'none',
                }}
              >
                <span className={`text-base ${currentStreak >= 7 ? 'animate-pulse' : ''}`}>🔥</span>
                <span className="text-sm font-bold text-orange-400">{currentStreak}</span>
              </div>
            )}
           </div>
        </div>

        {/* Smart meal prompt */}
        <MealPrompt todayMeals={today} onAddMeal={onAddMeal || (() => {})} />

        {/* Calorie Ring */}
        <div className="flex justify-center py-4">
          <CalorieRing eaten={totals.calories} goal={settings.dailyCalorieGoal} />
        </div>
        
        {/* Macro Pills */}
        <div className="px-6 mt-4">
          <div className="flex flex-wrap gap-3 justify-center">
            <MacroPill 
              label="Protein" 
              current={totals.protein} 
              goal={settings.dailyProteinGoal}
              color="#10B981"
              delay={200}
            />
            <MacroPill 
              label="Carbs" 
              current={totals.carbs} 
              goal={settings.dailyCarbGoal}
              color="#A855F7"
              delay={250}
            />
            <MacroPill 
              label="Fat" 
              current={totals.fat} 
              goal={settings.dailyFatGoal}
              color="#F472B6"
              delay={300}
            />
        </div>
      </div>

        {/* Weekly Summary Card */}
        {weeklyStats.daysLogged > 0 && (
          <div className="px-6 mt-6">
            <div 
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1))',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              <div className="flex items-center justify-between">
        <div>
                  <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">This Week</p>
                  <p className="text-2xl font-black text-white mt-1">
                    {weeklyStats.avgCalories.toLocaleString()} <span className="text-sm font-medium text-white/50">avg cal/day</span>
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-400">{weeklyStats.totalMeals}</p>
                    <p className="text-[10px] text-white/40 uppercase">meals</p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-pink-400">{weeklyStats.daysLogged}</p>
                    <p className="text-[10px] text-white/40 uppercase">days</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* AI Insights */}
        <InsightsCard logs={logs} settings={settings} />

        {/* Smart Suggestions */}
        <SmartSuggestions logs={logs} settings={settings} onAddMeal={onAddMeal} />

        {/* Meal Templates - Yesterday's meals */}
        {yesterdayMeals.length > 0 && today.length === 0 && (
          <div className="px-6 mt-6">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">Quick Log from Yesterday</p>
            <div className="flex space-x-2 overflow-x-auto pb-2 -mx-6 px-6">
              {yesterdayMeals.slice(0, 3).map((meal) => (
                <button
                  key={meal.id}
                  onClick={() => setSelectedMeal(meal)}
                  className="flex-shrink-0 flex items-center space-x-2 px-4 py-2.5 rounded-xl transition-all active:scale-95"
                  style={{
                    background: 'rgba(26, 22, 51, 0.8)',
                    border: '1px solid rgba(139, 92, 246, 0.2)',
                  }}
                >
                  <span className="text-base">
                    {meal.type === 'breakfast' ? '🌅' : meal.type === 'lunch' ? '☀️' : meal.type === 'dinner' ? '🌙' : '🍪'}
                  </span>
                  <span className="text-sm font-medium text-white capitalize">{meal.type}</span>
                  <span className="text-xs text-white/40">{Math.round(meal.totalMacros.calories)} cal</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Today's Meals */}
        <div className="px-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">Today's Meals</h3>
            <span 
              className="text-xs font-medium px-3 py-1 rounded-full"
              style={{
                background: 'rgba(139, 92, 246, 0.15)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {today.length} {today.length === 1 ? 'meal' : 'meals'}
            </span>
          </div>

          {today.length === 0 ? (
            <EmptyState onAddMeal={onAddMeal || (() => {})} />
          ) : (
            <div className="space-y-3">
              {today.map((log, index) => (
                <MealCard 
                  key={log.id} 
                  log={log} 
                  index={index} 
                  onClick={() => setSelectedMeal(log)}
                  onDelete={onDeleteLog}
                  onDuplicate={(meal) => {
                    // Create a duplicate with new ID and current timestamp
                    if (onUpdateLog) {
                      const duplicate: MealLog = {
                        ...meal,
                        id: Date.now().toString(),
                        timestamp: Date.now(),
                      };
                      // This will add a new log (we need to call the parent's add function)
                      // For now, just open the meal for editing
                      setSelectedMeal(meal);
                    }
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Progress Banner */}
        {today.length > 0 && progressPercent > 0 && (
          <div className="px-6 mt-6 mb-6">
            <div 
              className="relative overflow-hidden rounded-2xl p-5"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1))',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">Daily Progress</p>
                  <div className="flex items-baseline mt-1">
                    <span className="text-3xl font-black text-white">
                      {progressPercent}
                    </span>
                    <span className="text-base text-white/50 ml-1">%</span>
                       </div>
                   </div>

                <div className="flex space-x-4">
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: '#10B981' }}>{Math.round(totals.protein)}g</p>
                    <p className="text-xs text-white/40 uppercase">P</p>
                       </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: '#A855F7' }}>{Math.round(totals.carbs)}g</p>
                    <p className="text-xs text-white/40 uppercase">C</p>
                   </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: '#FB923C' }}>{Math.round(totals.fat)}g</p>
                    <p className="text-xs text-white/40 uppercase">F</p>
                   </div>
               </div>
           </div>
         </div>
          </div>
        )}

       </div>

      {/* Meal Detail Modal */}
      <MealDetailModal
        meal={selectedMeal}
        onClose={() => setSelectedMeal(null)}
        onDelete={onDeleteLog}
        onUpdate={onUpdateLog}
        aiProvider={settings.aiProvider}
      />
    </div>
  );
};

export default Dashboard;
