import React, { useMemo, useState, useEffect } from 'react';
import { MealLog, UserSettings } from '../types.ts';
import MealDetailModal from '../components/MealDetailModal.tsx';

interface DashboardProps {
  logs: MealLog[];
  settings: UserSettings;
  onAddMeal?: () => void; // Callback to navigate to camera
  onDeleteLog?: (id: string) => void;
}

// Energized calorie ring with pulsing glow, particles, and rotation
const CalorieRing: React.FC<{ eaten: number; goal: number }> = ({ eaten, goal }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const progress = Math.min(eaten / goal, 1);
  const remaining = Math.max(0, goal - eaten);
  const isEmpty = progress === 0;
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);
  
  const circumference = 2 * Math.PI * 70; // Smaller radius for 160px ring
  const strokeDashoffset = circumference - (animatedProgress * circumference);
  
  const getGradientId = () => {
    if (progress >= 1) return 'ringGradientOver';
    if (progress >= 0.75) return 'ringGradientHigh';
    return 'ringGradientNormal';
  };
  
  // Generate particles for empty state
  const particles = Array.from({ length: 4 }, (_, i) => ({
    id: i,
    angle: (i * 90) * (Math.PI / 180),
    delay: i * 0.3,
  }));
  
  return (
    <div className="relative flex items-center justify-center">
      <svg width="160" height="160" className="transform -rotate-90">
        <defs>
          {/* Rotating gradient for empty state */}
          <linearGradient id="ringGradientRotating" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6">
              {isEmpty && <animate attributeName="stop-color" values="#14b8a6;#22d3ee;#8b5cf6;#14b8a6" dur="4s" repeatCount="indefinite" />}
            </stop>
            <stop offset="50%" stopColor="#22d3ee">
              {isEmpty && <animate attributeName="stop-color" values="#22d3ee;#8b5cf6;#14b8a6;#22d3ee" dur="4s" repeatCount="indefinite" />}
            </stop>
            <stop offset="100%" stopColor="#8b5cf6">
              {isEmpty && <animate attributeName="stop-color" values="#8b5cf6;#14b8a6;#22d3ee;#8b5cf6" dur="4s" repeatCount="indefinite" />}
            </stop>
          </linearGradient>
          
          <linearGradient id="ringGradientNormal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="50%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="ringGradientHigh" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="ringGradientOver" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f43f5e" />
            <stop offset="100%" stopColor="#dc2626" />
          </linearGradient>
          
          {/* Enhanced glow filter */}
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation={isEmpty ? "5" : "3"} result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          {/* Pulsing glow filter for empty state */}
          <filter id="pulseGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="8" result="coloredBlur">
              {isEmpty && <animate attributeName="stdDeviation" values="6;10;6" dur="2s" repeatCount="indefinite" />}
            </feGaussianBlur>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background ring with rotation when empty */}
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke={isEmpty ? "url(#ringGradientRotating)" : "rgba(255,255,255,0.08)"}
          strokeWidth="10"
          className={isEmpty ? "animate-pulse" : ""}
          filter={isEmpty ? "url(#pulseGlow)" : "none"}
        />
        
        {/* Main progress ring */}
        {progress > 0 && (
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke={`url(#${getGradientId()})`}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            filter="url(#glow)"
          />
        )}
        
        {/* Floating particles when empty */}
        {isEmpty && particles.map((particle) => {
          const radius = 75;
          const x = 80 + radius * Math.cos(particle.angle);
          const y = 80 + radius * Math.sin(particle.angle);
          return (
            <circle
              key={particle.id}
              cx={x}
              cy={y}
              r="3"
              fill="#22d3ee"
              opacity="0.8"
              filter="url(#glow)"
            >
              <animateTransform
                attributeName="transform"
                type="rotate"
                values={`0 80 80;360 80 80`}
                dur="8s"
                repeatCount="indefinite"
                begin={`${particle.delay}s`}
              />
              <animate
                attributeName="opacity"
                values="0.3;0.9;0.3"
                dur="2s"
                repeatCount="indefinite"
                begin={`${particle.delay}s`}
              />
            </circle>
          );
        })}
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-display font-black bg-gradient-to-br from-white via-white to-gray-300 bg-clip-text text-transparent tracking-tight">
          {Math.round(eaten)}
        </span>
        <span className="text-caption text-gray-400 font-medium mt-0.5">
          of {goal} kcal
        </span>
        <div className={`mt-2 px-3 py-1 rounded-full bg-white/8 backdrop-blur-sm border border-white/10 transition-all duration-300 ${
          isEmpty ? 'animate-breathe' : ''
        }`}>
          {isEmpty ? (
            <span className="text-caption font-bold bg-gradient-to-r from-accent-teal via-accent-violet to-accent-teal bg-clip-text text-transparent bg-[length:200%_100%] animate-shimmer">
              Tap + to begin
            </span>
          ) : (
            <span className="text-caption font-bold bg-gradient-to-r from-accent-teal to-accent-violet bg-clip-text text-transparent">
              {remaining > 0 ? `${Math.round(remaining)} left` : '🎉 Goal!'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

// Horizontal macro pill with circular progress arc
const MacroPill: React.FC<{ 
  label: string; 
  current: number; 
  goal: number; 
  color: string;
  icon: string;
  delay: number;
}> = ({ label, current, goal, color, icon, delay }) => {
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
  
  const circumference = 2 * Math.PI * 8; // Small arc radius
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;
  const glowIntensity = Math.min(progress / 100, 1);
  
  return (
    <button
      className={`flex items-center space-x-2 px-3 py-2 rounded-full transition-all duration-500 relative active:scale-95 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: progress > 0 ? `0 0 ${8 * glowIntensity}px ${color}40` : 'none',
      }}
    >
      {/* Circular progress arc */}
      <div className="relative w-6 h-6 flex-shrink-0">
        <svg width="24" height="24" className="transform -rotate-90">
          <circle
            cx="12"
            cy="12"
            r="8"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="2"
          />
          {progress > 0 && (
            <circle
              cx="12"
              cy="12"
              r="8"
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className="transition-all duration-1000 ease-out"
              style={{
                filter: `drop-shadow(0 0 4px ${color})`,
              }}
            />
          )}
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs">{icon}</span>
        </div>
      </div>
      
      <div className="flex items-baseline space-x-1">
        <span className="text-body-lg font-black text-white transition-all duration-300">{Math.round(current)}</span>
        <span className="text-caption text-gray-500">/{goal}g</span>
      </div>
    </button>
  );
};

// Enhanced meal card with press animation
const MealCard: React.FC<{ log: MealLog; index: number; onClick?: () => void }> = ({ log, index, onClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 50 + 600);
    return () => clearTimeout(timer);
  }, [index]);
  
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
      case 'dinner': return 'linear-gradient(135deg, #8b5cf6, #6366f1)';
      default: return 'linear-gradient(135deg, #f472b6, #ec4899)';
    }
  };
  
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 cursor-pointer ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${isPressed ? 'scale-[0.98]' : 'hover:scale-[1.01]'}`}
      style={{
        background: 'rgba(255,255,255,0.06)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
    >
      <div className="flex items-center space-x-4">
        <div className="relative">
          <div 
            className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.05)' }}
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
              <p className="text-body font-bold text-white capitalize">{log.type}</p>
              <p className="text-caption text-gray-400 truncate mt-0.5">
                {log.items.map(i => i.name).join(', ')}
              </p>
            </div>
            <div className="text-right flex-shrink-0">
              <span className="text-title-2 font-black text-white">{Math.round(log.totalMacros.calories)}</span>
              <span className="text-caption text-gray-500 ml-1">kcal</span>
            </div>
          </div>
          
          <div className="flex space-x-2 mt-2">
            <span className="text-caption px-2 py-0.5 rounded-md font-bold text-emerald-400" style={{ background: 'rgba(52, 211, 153, 0.15)' }}>
              P {Math.round(log.totalMacros.protein)}g
            </span>
            <span className="text-caption px-2 py-0.5 rounded-md font-bold text-cyan-400" style={{ background: 'rgba(34, 211, 238, 0.15)' }}>
              C {Math.round(log.totalMacros.carbs)}g
            </span>
            <span className="text-caption px-2 py-0.5 rounded-md font-bold text-orange-400" style={{ background: 'rgba(251, 146, 60, 0.15)' }}>
              F {Math.round(log.totalMacros.fat)}g
            </span>
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
  );
};

// Memorable empty state with animated food illustration
const EmptyState: React.FC<{ onAddMeal: () => void }> = ({ onAddMeal }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div 
      className={`text-center py-12 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
    >
      {/* Animated plate with floating food */}
      <div className="relative w-32 h-32 mx-auto mb-8">
        {/* Plate */}
        <div 
          className="absolute inset-0 rounded-full animate-breathe"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 70%)',
            border: '2px solid rgba(255,255,255,0.1)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
          }}
        />
        
        {/* Floating food items */}
        {[
          { emoji: '🍎', x: -20, y: -10, delay: 0 },
          { emoji: '🥑', x: 20, y: -15, delay: 0.2 },
          { emoji: '🥗', x: -15, y: 15, delay: 0.4 },
          { emoji: '🍌', x: 15, y: 10, delay: 0.6 },
        ].map((food, idx) => (
          <div
            key={idx}
            className="absolute text-2xl"
            style={{
              left: `calc(50% + ${food.x}px)`,
              top: `calc(50% + ${food.y}px)`,
              transform: 'translate(-50%, -50%)',
              animation: `float 3s ease-in-out infinite`,
              animationDelay: `${food.delay}s`,
            }}
          >
            {food.emoji}
          </div>
        ))}
        
        {/* Center sparkle */}
        <div 
          className="absolute inset-0 flex items-center justify-center text-4xl animate-spring-bounce"
          style={{ animationDelay: '0.5s' }}
        >
          ✨
        </div>
      </div>
      
      <h3 className="text-title-1-lg font-bold text-white mb-2 animate-spring-up">Your plate is waiting!</h3>
      <p className="text-body text-gray-400 mb-8 max-w-xs mx-auto">
        Capture your first meal and let AI analyze the nutrition for you
      </p>
      
      <button
        onClick={onAddMeal}
        className="px-8 py-4 rounded-xl font-bold text-white transition-all duration-300 active:scale-95 relative overflow-hidden group"
        style={{
          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
          boxShadow: '0 8px 32px rgba(139, 92, 246, 0.5)',
        }}
      >
        <span className="relative z-10 flex items-center space-x-2">
          <span>Try it now</span>
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
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px) rotate(0deg); }
          50% { transform: translate(-50%, -50%) translateY(-10px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ logs, settings, onAddMeal, onDeleteLog }) => {
  const [headerVisible, setHeaderVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealLog | null>(null);
  
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

  return (
    <div className="h-full overflow-y-auto pb-28 relative">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0a0a0f]" />
        <div 
          className="absolute inset-0 opacity-50"
          style={{
            background: `
              radial-gradient(ellipse at 20% 20%, rgba(139, 92, 246, 0.2) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(34, 211, 238, 0.15) 0%, transparent 50%)
            `,
          }}
        />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                              linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Compact Header */}
        <div className={`pt-14 pb-6 px-6 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-body text-gray-400 font-medium flex items-center space-x-2">
                <span>{greeting.emoji}</span>
                <span>{greeting.text}</span>
              </p>
              <h1 className="text-title-1-lg font-bold text-white mt-0.5">{getFormattedDate()}</h1>
            </div>
            
            {/* Streak badge with fire animation */}
            <div 
              className="relative overflow-hidden rounded-2xl px-3 py-2 transition-all duration-300 mr-2"
              style={{
                background: 'rgba(255,255,255,0.08)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.1)',
                boxShadow: '0 0 20px rgba(249, 115, 22, 0.3)',
              }}
            >
              {/* Glow effect that intensifies with streak */}
              <div 
                className="absolute inset-0 rounded-2xl opacity-50 animate-breathe"
                style={{
                  background: 'radial-gradient(circle, rgba(249, 115, 22, 0.4), transparent 70%)',
                }}
              />
              
              {/* Particle sparks for milestone days */}
              {[7, 14, 30, 100].includes(7) && (
                <>
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="absolute w-1 h-1 rounded-full"
                      style={{
                        left: `${20 + (i * 10)}%`,
                        top: `${10 + (i % 2) * 80}%`,
                        background: '#fbbf24',
                        boxShadow: '0 0 6px #fbbf24',
                        animation: `sparkle 2s ease-in-out infinite`,
                        animationDelay: `${i * 0.2}s`,
                      }}
                    />
                  ))}
                </>
              )}
              
              <div className="flex items-center space-x-2 relative z-10">
                {/* Animated fire emoji */}
                <div className="relative">
                  <span 
                    className="text-xl inline-block"
                    style={{
                      filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.8))',
                      animation: 'flicker 1.5s ease-in-out infinite',
                    }}
                  >
                    🔥
                  </span>
                  {/* Additional flame layers for depth */}
                  <span 
                    className="absolute inset-0 text-xl opacity-60"
                    style={{
                      filter: 'blur(2px) drop-shadow(0 0 4px rgba(249, 115, 22, 0.6))',
                      animation: 'flicker 1.2s ease-in-out infinite reverse',
                    }}
                  >
                    🔥
                  </span>
                </div>
                <div>
                  <p className="text-title-2 font-bold text-white leading-none">7</p>
                  <p className="text-caption text-gray-400">day streak</p>
                </div>
              </div>
              
              <style>{`
                @keyframes flicker {
                  0%, 100% { transform: scale(1) rotate(0deg); opacity: 1; }
                  25% { transform: scale(1.1) rotate(-2deg); opacity: 0.9; }
                  50% { transform: scale(0.95) rotate(2deg); opacity: 0.95; }
                  75% { transform: scale(1.05) rotate(-1deg); opacity: 0.9; }
                }
                @keyframes sparkle {
                  0%, 100% { opacity: 0; transform: scale(0) translateY(0); }
                  50% { opacity: 1; transform: scale(1) translateY(-10px); }
                }
              `}</style>
            </div>
          </div>
        </div>
        
        {/* Calorie Ring (smaller, denser) */}
        <div className="flex justify-center py-2">
          <CalorieRing eaten={totals.calories} goal={settings.dailyCalorieGoal} />
        </div>
        
        {/* Horizontal Macro Pills */}
        <div className="px-6 mt-4">
          <div className="flex flex-wrap gap-2 justify-center">
            <MacroPill 
              label="P" 
              current={totals.protein} 
              goal={settings.dailyProteinGoal}
              color="#34d399"
              icon="🥩"
              delay={200}
            />
            <MacroPill 
              label="C" 
              current={totals.carbs} 
              goal={settings.dailyCarbGoal}
              color="#22d3ee"
              icon="🍞"
              delay={250}
            />
            <MacroPill 
              label="F" 
              current={totals.fat} 
              goal={settings.dailyFatGoal}
              color="#fb923c"
              icon="🥑"
              delay={300}
            />
          </div>
        </div>
        
        {/* Today's Meals */}
        <div className="px-6 mt-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-title-2 font-bold text-white">Today's Meals</h3>
            <span 
              className="text-caption font-medium px-3 py-1 rounded-full"
              style={{
                background: 'rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)',
              }}
            >
              {today.length} {today.length === 1 ? 'meal' : 'meals'}
            </span>
          </div>
          
          {today.length === 0 ? (
            <EmptyState onAddMeal={() => {/* TODO: Navigate to camera */}} />
          ) : (
            <div className="space-y-3">
              {today.map((log, index) => (
                <MealCard 
                  key={log.id} 
                  log={log} 
                  index={index} 
                  onClick={() => setSelectedMeal(log)}
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Progress Banner */}
        {today.length > 0 && progressPercent > 0 && (
          <div className="px-6 mt-6 mb-6">
            <div 
              className="relative overflow-hidden rounded-2xl p-4"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(34, 211, 238, 0.1))',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-caption text-gray-400 font-semibold uppercase tracking-wider">Daily Progress</p>
                  <div className="flex items-baseline mt-1">
                    <span className="text-title-1-lg font-black bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                      {progressPercent}
                    </span>
                    <span className="text-body text-gray-400 ml-1">%</span>
                  </div>
                </div>
                
                <div className="flex space-x-4">
                  <div className="text-center">
                    <p className="text-emerald-400 text-title-2 font-bold">{Math.round(totals.protein)}g</p>
                    <p className="text-caption text-gray-500 uppercase">P</p>
                  </div>
                  <div className="text-center">
                    <p className="text-cyan-400 text-title-2 font-bold">{Math.round(totals.carbs)}g</p>
                    <p className="text-caption text-gray-500 uppercase">C</p>
                  </div>
                  <div className="text-center">
                    <p className="text-orange-400 text-title-2 font-bold">{Math.round(totals.fat)}g</p>
                    <p className="text-caption text-gray-500 uppercase">F</p>
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
      />
    </div>
  );
};

export default Dashboard;
