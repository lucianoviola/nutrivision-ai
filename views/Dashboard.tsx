import React, { useMemo, useState, useEffect } from 'react';
import { MealLog, UserSettings } from '../types.ts';
import MealDetailModal from '../components/MealDetailModal.tsx';

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
      <svg width="180" height="180" className="transform -rotate-90">
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
              {isEmpty && <animate attributeName="stop-color" values="#8B5CF6;#EC4899;#F472B6;#8B5CF6" dur="4s" repeatCount="indefinite" />}
            </stop>
            <stop offset="100%" stopColor="#EC4899">
              {isEmpty && <animate attributeName="stop-color" values="#EC4899;#F472B6;#8B5CF6;#EC4899" dur="4s" repeatCount="indefinite" />}
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
          
          {/* Pulse glow for empty state */}
          <filter id="pulseGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="6" result="coloredBlur">
              {isEmpty && <animate attributeName="stdDeviation" values="4;8;4" dur="2s" repeatCount="indefinite" />}
            </feGaussianBlur>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        
        {/* Background ring */}
        <circle
          cx="90"
          cy="90"
          r="70"
          fill="none"
          stroke={isEmpty ? "url(#ringGradientEmpty)" : "rgba(139, 92, 246, 0.15)"}
          strokeWidth="12"
          className={isEmpty ? "" : ""}
          filter={isEmpty ? "url(#pulseGlow)" : "none"}
          opacity={isEmpty ? 0.4 : 1}
        />
        
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
      className={`flex items-center space-x-3 px-5 py-3.5 rounded-2xl transition-all duration-500 relative active:scale-95 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
      }`}
      style={{
        background: 'rgba(26, 22, 51, 0.7)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Colored dot with glow */}
      <div 
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={{
          background: color,
          boxShadow: `0 0 12px ${color}80`,
        }}
      />
      
      <div className="flex items-baseline space-x-1.5">
        <span className="text-xl font-black text-white">{Math.round(current)}</span>
        <span className="text-sm text-white/40 font-medium">/{goal}g</span>
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

// Opal-style meal card
const MealCard: React.FC<{ log: MealLog; index: number; onClick?: () => void }> = ({ log, index, onClick }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 80 + 400);
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
      case 'breakfast': return 'linear-gradient(135deg, #FBBF24, #F59E0B)';
      case 'lunch': return 'linear-gradient(135deg, #34D399, #10B981)';
      case 'dinner': return 'linear-gradient(135deg, #8B5CF6, #A855F7)';
      default: return 'linear-gradient(135deg, #F472B6, #EC4899)';
    }
  };
  
  return (
    <div 
      className={`relative overflow-hidden rounded-2xl p-4 transition-all duration-300 cursor-pointer ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
      } ${isPressed ? 'scale-[0.98]' : 'hover:scale-[1.01]'}`}
      style={{
        background: 'rgba(26, 22, 51, 0.6)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
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
      {/* Smaller, more compact illustration */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        <div 
          className="absolute inset-0 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.25), rgba(236, 72, 153, 0.25))',
            border: '2px solid rgba(139, 92, 246, 0.4)',
            boxShadow: '0 0 30px rgba(139, 92, 246, 0.25)',
          }}
        />
        
        {/* Fewer, smaller floating food items */}
        {[
          { emoji: '🍎', x: -14, y: -8, delay: 0 },
          { emoji: '🥑', x: 14, y: -10, delay: 0.3 },
          { emoji: '🍌', x: 0, y: 12, delay: 0.6 },
        ].map((food, idx) => (
          <div
            key={idx}
            className="absolute text-lg"
            style={{
              left: `calc(50% + ${food.x}px)`,
              top: `calc(50% + ${food.y}px)`,
              transform: 'translate(-50%, -50%)',
              animation: `float 4s ease-in-out infinite`,
              animationDelay: `${food.delay}s`,
            }}
          >
            {food.emoji}
          </div>
        ))}
        
        <div className="absolute inset-0 flex items-center justify-center text-2xl">
          ✨
        </div>
      </div>
      
      <h3 className="text-xl font-bold text-white mb-1.5">Your plate is waiting!</h3>
      <p className="text-sm text-white/60 mb-6 max-w-[260px] mx-auto leading-relaxed">
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
        @keyframes float {
          0%, 100% { transform: translate(-50%, -50%) translateY(0px); }
          50% { transform: translate(-50%, -50%) translateY(-6px); }
        }
      `}</style>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ logs, settings, onAddMeal, onDeleteLog, onUpdateLog }) => {
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
      
      {/* Content */}
      <div className="relative z-10">
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
            <div 
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: 'rgba(249, 115, 22, 0.15)',
                border: '1px solid rgba(249, 115, 22, 0.3)',
              }}
            >
              <span className="text-base">🔥</span>
              <span className="text-sm font-bold text-orange-400">7</span>
           </div>
           </div>
        </div>

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
