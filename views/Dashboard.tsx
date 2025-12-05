import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { MealLog, UserSettings } from '../types.ts';
import MealDetailModal from '../components/MealDetailModal.tsx';
import { DashboardSkeleton, MealCardSkeleton } from '../components/Skeleton.tsx';
import { generateUUID } from '../utils/uuid.ts';
import NutritionScore from '../components/NutritionScore.tsx';

// Confetti celebration component
const Confetti: React.FC<{ trigger: boolean; onComplete?: () => void }> = ({ trigger, onComplete }) => {
  const [particles, setParticles] = useState<Array<{
    id: number;
    x: number;
    color: string;
    delay: number;
    rotation: number;
    size: number;
  }>>([]);
  
  useEffect(() => {
    if (trigger) {
      const colors = ['#8B5CF6', '#EC4899', '#FBBF24', '#10B981', '#F87171', '#60A5FA'];
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 0.5,
        rotation: Math.random() * 360,
        size: Math.random() * 8 + 4,
      }));
      setParticles(newParticles);
      
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);
  
  if (particles.length === 0) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute animate-confetti"
          style={{
            left: `${p.x}%`,
            top: '-20px',
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
        .animate-confetti {
          animation: confetti-fall 3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

// Weekly mini chart component
const WeeklyMiniChart: React.FC<{ 
  dailyData: Array<{ day: string; calories: number; isToday: boolean }>;
  goal: number;
}> = ({ dailyData, goal }) => {
  const [animatedHeights, setAnimatedHeights] = useState<number[]>(dailyData.map(() => 0));
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedHeights(dailyData.map(d => Math.min((d.calories / goal) * 100, 100)));
    }, 300);
    return () => clearTimeout(timer);
  }, [dailyData, goal]);
  
  const maxCalories = Math.max(...dailyData.map(d => d.calories), goal);
  
  return (
    <div className="flex items-end justify-between h-16 gap-1.5">
      {dailyData.map((day, index) => {
        const heightPercent = animatedHeights[index] || 0;
        const isOverGoal = day.calories > goal;
        const isEmpty = day.calories === 0;
        
        return (
          <div key={day.day} className="flex flex-col items-center flex-1">
            {/* Bar */}
            <div 
              className="w-full rounded-t-sm relative overflow-hidden transition-all duration-700 ease-out"
              style={{ 
                height: `${Math.max(heightPercent * 0.6, isEmpty ? 4 : 8)}px`,
                background: isEmpty 
                  ? 'rgba(139, 92, 246, 0.1)' 
                  : isOverGoal 
                    ? 'linear-gradient(180deg, #F43F5E, #EF4444)'
                    : day.isToday 
                      ? 'linear-gradient(180deg, #8B5CF6, #EC4899)'
                      : 'linear-gradient(180deg, rgba(139, 92, 246, 0.6), rgba(168, 85, 247, 0.4))',
                boxShadow: !isEmpty && day.isToday ? '0 0 12px rgba(139, 92, 246, 0.5)' : 'none',
              }}
            >
              {/* Goal line indicator */}
              {!isEmpty && heightPercent >= 95 && heightPercent <= 105 && (
                <div 
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-green-400"
                  style={{ boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)' }}
                />
              )}
            </div>
            {/* Day label */}
            <span className={`text-[9px] mt-1.5 font-medium ${
              day.isToday ? 'text-white' : 'text-white/40'
            }`}>
              {day.day}
            </span>
          </div>
        );
      })}
    </div>
  );
};

interface PendingAnalysis {
  id: string;
  imageData: string;
  timestamp: number;
}

interface DashboardProps {
  logs: MealLog[];
  settings: UserSettings;
  onAddMeal?: () => void;
  onDeleteLog?: (id: string) => void;
  onUpdateLog?: (meal: MealLog) => void;
  pendingAnalysis?: PendingAnalysis | null;
  onExpandAnalysis?: () => void;
}

// Animated number counter hook
const useAnimatedNumber = (value: number, duration: number = 800) => {
  const [displayValue, setDisplayValue] = useState(0);
  const previousValue = useRef(0);
  
  useEffect(() => {
    const startValue = previousValue.current;
    const endValue = value;
    const startTime = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (endValue - startValue) * eased);
      
      setDisplayValue(current);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        previousValue.current = endValue;
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, duration]);
  
  return displayValue;
};

// Opal-style calorie ring with purple/pink gradients
const CalorieRing: React.FC<{ eaten: number; goal: number }> = ({ eaten, goal }) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [pillAnimating, setPillAnimating] = useState(false);
  const [prevRemaining, setPrevRemaining] = useState<number | null>(null);
  const progress = Math.min(eaten / goal, 1);
  const remaining = Math.max(0, goal - eaten);
  const isEmpty = progress === 0;
  
  // Animated number counter
  const displayCalories = useAnimatedNumber(Math.round(eaten));
  const displayRemaining = useAnimatedNumber(Math.round(remaining));
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedProgress(progress), 100);
    return () => clearTimeout(timer);
  }, [progress]);
  
  // Animate pill when remaining value changes
  useEffect(() => {
    if (prevRemaining !== null && prevRemaining !== remaining) {
      setPillAnimating(true);
      const timer = setTimeout(() => setPillAnimating(false), 600);
      return () => clearTimeout(timer);
    }
    setPrevRemaining(remaining);
  }, [remaining, prevRemaining]);
  
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference - (animatedProgress * circumference);
  
  const getGradientId = () => {
    if (progress >= 1) return 'ringGradientOver';
    if (progress >= 0.75) return 'ringGradientHigh';
    return 'ringGradientNormal';
  };
  
  // Get end cap color based on progress
  const getEndCapColor = () => {
    if (progress >= 1) return '#EF4444';
    if (progress >= 0.75) return '#FBBF24';
    return '#EC4899';
  };
  
  // Calculate end cap position
  const endCapAngle = (animatedProgress * 360 - 90) * (Math.PI / 180);
  const endCapX = 90 + 70 * Math.cos(endCapAngle);
  const endCapY = 90 + 70 * Math.sin(endCapAngle);
  
  // Dynamic font size based on calorie count digits
  const getCalorieFontSize = () => {
    const digits = Math.round(eaten).toString().length;
    if (digits <= 2) return 'text-5xl';
    if (digits <= 3) return 'text-[44px]';
    return 'text-4xl';
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
          
          {/* End cap glow filter */}
          <filter id="endCapGlow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
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
        
        {/* Glowing end cap dot */}
        {animatedProgress > 0.02 && (
          <g className="transition-all duration-1000 ease-out">
            {/* Outer glow */}
            <circle
              cx={endCapX}
              cy={endCapY}
              r="10"
              fill={getEndCapColor()}
              opacity="0.3"
              filter="url(#endCapGlow)"
            >
              <animate attributeName="opacity" values="0.2;0.4;0.2" dur="2s" repeatCount="indefinite" />
            </circle>
            {/* Main dot */}
            <circle
              cx={endCapX}
              cy={endCapY}
              r="6"
              fill="white"
              filter="url(#endCapGlow)"
            />
            {/* Inner bright dot */}
            <circle
              cx={endCapX}
              cy={endCapY}
              r="3"
              fill="white"
            />
          </g>
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
      
      {/* Center content - constrained to ring inner area */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ padding: '30px' }}>
        <span 
          className={`${getCalorieFontSize()} font-black text-white tracking-tight leading-none`} 
          style={{
            textShadow: '0 4px 30px rgba(139, 92, 246, 0.4)',
          }}
        >
          {displayCalories.toLocaleString()}
        </span>
        <span className="text-xs text-white/50 font-medium mt-1">
          of {goal.toLocaleString()} kcal
        </span>
        {/* Remaining badge - compact design */}
        {!isEmpty && (
          <div 
            className={`mt-2 px-3 py-1 rounded-full transition-all duration-300 ${
              pillAnimating ? 'scale-110' : 'scale-100'
            }`}
            style={{
              background: remaining > 0 ? 'rgba(139, 92, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: remaining > 0 ? '1px solid rgba(139, 92, 246, 0.3)' : '1px solid rgba(16, 185, 129, 0.3)',
              boxShadow: pillAnimating ? '0 0 20px rgba(139, 92, 246, 0.4)' : 'none',
            }}
          >
            <span className={`text-xs font-semibold transition-all duration-300 whitespace-nowrap ${
              remaining > 0 ? 'text-white/80' : 'text-green-400'
            }`}>
              {remaining > 0 ? `${displayRemaining.toLocaleString()} left` : 'Goal reached!'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

// Horizontal macro card with ring on left
const MacroCard: React.FC<{ 
  label: string; 
  current: number; 
  goal: number; 
  color: string;
  icon: 'protein' | 'carbs' | 'fat';
  delay: number;
}> = ({ label, current, goal, color, icon, delay }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const remaining = goal - current;
  const isOver = remaining < 0;
  const displayAmount = Math.abs(Math.round(remaining));
  const progress = Math.min((current / goal) * 100, 100);
  
  // Animated values
  const animatedAmount = useAnimatedNumber(displayAmount);
  
  useEffect(() => {
    const timer1 = setTimeout(() => setIsVisible(true), delay);
    const timer2 = setTimeout(() => setAnimatedProgress(progress), delay + 200);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [delay, progress]);
  
  // Ring calculations
  const ringSize = 40;
  const strokeWidth = 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedProgress / 100) * circumference;
  
  // Icon components with matching colors
  const MacroIcon = () => {
    if (icon === 'protein') {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} />
        </svg>
      );
    }
    if (icon === 'carbs') {
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
          <path d="M12 2c-1.5 0-3 .5-4 2-1.5 2-1 4 0 6 .5 1 1 2 1 3v9h6v-9c0-1 .5-2 1-3 1-2 1.5-4 0-6-1-1.5-2.5-2-4-2z" fill={color} />
        </svg>
      );
    }
    // Fat - water drop
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0L12 2.69z" fill={color} />
      </svg>
    );
  };
  
  return (
    <button
      className={`flex items-center space-x-3 p-3 rounded-2xl transition-all duration-500 active:scale-95 w-full ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        background: 'rgba(26, 22, 51, 0.6)',
        border: `1px solid ${color}15`,
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Mini ring with icon */}
      <div className="relative flex-shrink-0" style={{ width: ringSize, height: ringSize }}>
        <svg width={ringSize} height={ringSize} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeWidth}
          />
          {/* Progress ring */}
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke={isOver ? '#EF4444' : color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 4px ${isOver ? '#EF4444' : color}80)`,
            }}
          />
        </svg>
        {/* Icon in center */}
        <div 
          className="absolute inset-0 flex items-center justify-center"
          style={{ filter: `drop-shadow(0 0 6px ${color}60)` }}
        >
          <MacroIcon />
        </div>
      </div>
      
      {/* Text content */}
      <div className="flex-1 text-left min-w-0">
        <div className="flex items-baseline space-x-1">
          <span className="text-lg font-black text-white">{animatedAmount}g</span>
          <span className="text-xs font-medium" style={{ color: isOver ? '#EF4444' : color }}>
            {isOver ? 'over' : 'left'}
          </span>
        </div>
        <p className="text-[11px] text-white/40 font-medium">{label}</p>
      </div>
    </button>
  );
};

// Opal-style meal card with swipe-to-delete
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
  const [swipeX, setSwipeX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [justAdded, setJustAdded] = useState(index === 0);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);
  
  const SWIPE_THRESHOLD = 80; // px to trigger delete
  const DELETE_THRESHOLD = 120; // px to auto-delete
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), index * 80 + 400);
    return () => clearTimeout(timer);
  }, [index]);
  
  // Bounce animation for newly added meals
  useEffect(() => {
    if (justAdded) {
      const timer = setTimeout(() => setJustAdded(false), 600);
      return () => clearTimeout(timer);
    }
  }, [justAdded]);

  // Clear long press timer on unmount
  useEffect(() => {
    return () => {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    };
  }, []);
  
  const getMealGradient = (type: string) => {
    switch (type) {
      case 'breakfast': return 'linear-gradient(135deg, #FBBF24, #F59E0B)';
      case 'lunch': return 'linear-gradient(135deg, #34D399, #10B981)';
      case 'dinner': return 'linear-gradient(135deg, #8B5CF6, #A855F7)';
      default: return 'linear-gradient(135deg, #F472B6, #EC4899)';
    }
  };
  
  const getMealInitial = (type: string) => {
    switch (type) {
      case 'breakfast': return 'B';
      case 'lunch': return 'L';
      case 'dinner': return 'D';
      default: return 'S';
    }
  };
  
  // Format timestamp to readable time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    setIsPressed(true);
    longPressTimer.current = setTimeout(() => {
      if (!isSwiping) {
        setShowActions(true);
        if (navigator.vibrate) navigator.vibrate(50);
      }
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const deltaX = e.touches[0].clientX - touchStartX.current;
    const deltaY = Math.abs(e.touches[0].clientY - touchStartY.current);
    
    // If vertical scroll, don't handle swipe
    if (deltaY > 30 && !isSwiping) {
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      return;
    }
    
    // Only swipe left (negative deltaX)
    if (deltaX < -10) {
      setIsSwiping(true);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
      setSwipeX(Math.max(deltaX, -DELETE_THRESHOLD));
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    if (isSwiping) {
      if (Math.abs(swipeX) >= DELETE_THRESHOLD) {
        // Auto delete
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
        onDelete?.(log.id);
      } else if (Math.abs(swipeX) >= SWIPE_THRESHOLD) {
        // Show delete button
        setSwipeX(-SWIPE_THRESHOLD);
      } else {
        // Reset
        setSwipeX(0);
      }
      setIsSwiping(false);
    }
  };

  const handleClick = () => {
    if (swipeX !== 0) {
      setSwipeX(0);
      return;
    }
    if (!showActions && onClick) {
      onClick();
    }
  };

  const handleDelete = () => {
    if (navigator.vibrate) navigator.vibrate(50);
    onDelete?.(log.id);
  };

  const handleCopy = () => {
    const text = `${log.type.toUpperCase()} - ${log.items.map(i => i.name).join(', ')} | ${Math.round(log.totalMacros.calories)} kcal`;
    navigator.clipboard.writeText(text);
    setShowActions(false);
  };
  
  return (
    <>
      <div className="relative overflow-hidden rounded-2xl">
        {/* Delete button background */}
        <div 
          className="absolute inset-y-0 right-0 flex items-center justify-end pr-4 rounded-2xl"
          style={{
            width: '100px',
            background: 'linear-gradient(90deg, transparent, #EF4444)',
          }}
        >
          <button
            onClick={handleDelete}
            className="w-12 h-12 flex items-center justify-center rounded-xl bg-white/20 active:scale-90 transition-transform"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" 
                stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        {/* Main card */}
        <div 
          ref={cardRef}
          className={`relative p-4 cursor-pointer transition-all ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
          } ${isPressed && !isSwiping ? 'scale-[0.98]' : ''} ${showActions ? 'ring-2 ring-purple-500/50' : ''} ${justAdded ? 'animate-bounce-in' : ''}`}
          style={{
            background: 'rgba(26, 22, 51, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            borderRadius: '1rem',
            transform: `translateX(${swipeX}px)`,
            transition: isSwiping ? 'none' : 'transform 0.3s ease-out',
          }}
          onClick={handleClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onMouseDown={() => setIsPressed(true)}
          onMouseUp={() => setIsPressed(false)}
          onMouseLeave={() => setIsPressed(false)}
        >
      <div className="flex items-center space-x-4">
        {/* Meal image/thumbnail with time badge */}
        <div className="relative">
          <div 
            className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0"
            style={{ 
              background: log.imageUrl ? 'transparent' : getMealGradient(log.type),
              boxShadow: log.imageUrl ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
            }}
          >
            {log.imageUrl ? (
              <img src={log.imageUrl} alt="Meal" className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-lg font-bold text-white/90">{getMealInitial(log.type)}</span>
              </div>
            )}
          </div>
          {/* Time badge */}
          <div 
            className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold"
            style={{ 
              background: 'rgba(13, 11, 28, 0.9)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              color: 'rgba(255,255,255,0.7)',
            }}
          >
            {formatTime(log.timestamp)}
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
              background: 'rgba(248, 113, 113, 0.15)', 
              color: '#F87171' 
            }}>
              P {Math.round(log.totalMacros.protein)}g
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-bold" style={{ 
              background: 'rgba(251, 191, 36, 0.15)', 
              color: '#FBBF24' 
            }}>
              C {Math.round(log.totalMacros.carbs)}g
            </span>
            <span className="text-xs px-2 py-0.5 rounded-md font-bold" style={{ 
              background: 'rgba(96, 165, 250, 0.15)', 
              color: '#60A5FA' 
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
        @keyframes bounce-in {
          0% { transform: scale(0.9) translateY(10px); opacity: 0; }
          50% { transform: scale(1.02) translateY(-2px); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .animate-bounce-in {
          animation: bounce-in 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
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
      <div className="relative w-32 h-32 mx-auto mb-6">
        {/* Outer pulse ring */}
        <div 
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 60%)',
            animationDuration: '2.5s',
          }}
        />
        
        {/* Middle glow ring */}
        <div 
          className="absolute inset-2 rounded-full"
          style={{
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.25) 0%, transparent 70%)',
            animation: 'pulse 2s ease-in-out infinite',
          }}
        />
        
        {/* Main orb */}
        <div 
          className="absolute inset-6 rounded-full"
          style={{
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.5), rgba(236, 72, 153, 0.4))',
            border: '1px solid rgba(139, 92, 246, 0.5)',
            boxShadow: '0 0 50px rgba(139, 92, 246, 0.4), inset 0 0 30px rgba(236, 72, 153, 0.3)',
            animation: 'breathe 2.5s ease-in-out infinite',
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


// Inline processing card - shows where the meal will appear
const ProcessingCard: React.FC<{ 
  analysis: PendingAnalysis; 
  onClick?: () => void;
}> = ({ analysis, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-2xl p-4 text-left transition-all duration-300 active:scale-[0.98] animate-pulse"
      style={{
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.15))',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.2)',
      }}
    >
      <div className="flex items-center space-x-4">
        {/* Image thumbnail */}
        <div className="relative">
          <div className="w-16 h-16 rounded-xl overflow-hidden ring-2 ring-purple-500/50">
            <img 
              src={analysis.imageData} 
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>
          {/* Spinning indicator overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-xl">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
        
        {/* Status text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-sm font-bold text-white">Analyzing your meal...</span>
          </div>
          <p className="text-xs text-white/60">AI is identifying foods • Tap to view details</p>
        </div>
        
        {/* Chevron */}
        <div className="text-white/40">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </button>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ logs, settings, onAddMeal, onDeleteLog, onUpdateLog, pendingAnalysis, onExpandAnalysis }) => {
  const [headerVisible, setHeaderVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<MealLog | null>(null);
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [selectedDay, setSelectedDay] = useState<'today' | 'yesterday'>('today');
  const [showConfetti, setShowConfetti] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const previousGoalStates = useRef<{
    calories: boolean;
    protein: boolean;
    carbs: boolean;
    fat: boolean;
  }>({ calories: false, protein: false, carbs: false, fat: false });
  
  // Simulate initial load
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 600);
    return () => clearTimeout(timer);
  }, []);
  
  const today = useMemo(() => {
    const now = new Date();
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.getDate() === now.getDate() && 
             logDate.getMonth() === now.getMonth() && 
             logDate.getFullYear() === now.getFullYear();
    });
  }, [logs]);

  const yesterday = useMemo(() => {
    const now = new Date();
    const yesterdayDate = new Date(now);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    return logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.getDate() === yesterdayDate.getDate() && 
             logDate.getMonth() === yesterdayDate.getMonth() && 
             logDate.getFullYear() === yesterdayDate.getFullYear();
    });
  }, [logs]);

  const displayedLogs = selectedDay === 'today' ? today : yesterday;

  const totals = useMemo(() => {
    return displayedLogs.reduce((acc, log) => ({
      calories: acc.calories + log.totalMacros.calories,
      protein: acc.protein + log.totalMacros.protein,
      carbs: acc.carbs + log.totalMacros.carbs,
      fat: acc.fat + log.totalMacros.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  }, [displayedLogs]);

  // Detect goal achievements and trigger confetti
  useEffect(() => {
    if (selectedDay !== 'today' || isInitialLoad) return;
    
    const currentGoalStates = {
      calories: totals.calories >= settings.dailyCalorieGoal,
      protein: totals.protein >= settings.dailyProteinGoal,
      carbs: totals.carbs >= settings.dailyCarbGoal,
      fat: totals.fat >= settings.dailyFatGoal,
    };
    
    // Check if any goal was just achieved (wasn't achieved before, but is now)
    const justAchieved = (
      (!previousGoalStates.current.calories && currentGoalStates.calories) ||
      (!previousGoalStates.current.protein && currentGoalStates.protein) ||
      (!previousGoalStates.current.carbs && currentGoalStates.carbs) ||
      (!previousGoalStates.current.fat && currentGoalStates.fat)
    );
    
    if (justAchieved) {
      setShowConfetti(true);
      // Vibrate if supported
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    }
    
    previousGoalStates.current = currentGoalStates;
  }, [totals, settings, selectedDay, isInitialLoad]);

  // Weekly stats with daily data for chart
  const weeklyStats = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const weekLogs = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate >= weekAgo && logDate <= now;
    });
    
    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const dailyData: Array<{ day: string; calories: number; isToday: boolean }> = [];
    const dailyCaloriesOnly: number[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayLogs = weekLogs.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate.toDateString() === date.toDateString();
      });
      const dayTotal = dayLogs.reduce((sum, log) => sum + log.totalMacros.calories, 0);
      
      dailyData.push({
        day: dayNames[date.getDay()],
        calories: dayTotal,
        isToday: i === 0,
      });
      
      if (dayTotal > 0) dailyCaloriesOnly.push(dayTotal);
    }
    
    const avgCalories = dailyCaloriesOnly.length > 0 
      ? Math.round(dailyCaloriesOnly.reduce((a, b) => a + b, 0) / dailyCaloriesOnly.length)
      : 0;
    const totalMeals = weekLogs.length;
    const daysLogged = dailyCaloriesOnly.length;
    
    return { avgCalories, totalMeals, daysLogged, dailyData };
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
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
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

  // Show skeleton on initial load
  if (isInitialLoad) {
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
           </div>
        <DashboardSkeleton />
           </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className="h-full overflow-y-auto pb-28 relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Confetti celebration */}
      <Confetti 
        trigger={showConfetti} 
        onComplete={() => setShowConfetti(false)} 
      />
      
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
        <div className={`pt-12 sm:pt-14 md:pt-16 pb-2 px-6 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          {/* App Logo */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <span className="text-xl">🍽️</span>
              <span className="text-lg font-bold text-white tracking-tight">NutriVision AI</span>
              </div>
            
            {/* Streak badge */}
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
          
          {/* Today/Yesterday Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSelectedDay('today')}
              className={`text-sm font-semibold transition-all duration-200 ${
                selectedDay === 'today' 
                  ? 'text-white' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Today
              {selectedDay === 'today' && (
                <div className="h-0.5 bg-white rounded-full mt-1" />
              )}
            </button>
            <button
              onClick={() => setSelectedDay('yesterday')}
              className={`text-sm font-semibold transition-all duration-200 ${
                selectedDay === 'yesterday' 
                  ? 'text-white' 
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Yesterday
              {selectedDay === 'yesterday' && (
                <div className="h-0.5 bg-white rounded-full mt-1" />
              )}
            </button>
           </div>
        </div>

        {/* Calorie Ring */}
        <div className="flex justify-center py-4">
          <CalorieRing eaten={totals.calories} goal={settings.dailyCalorieGoal} />
        </div>

        {/* Macro Cards - horizontal layout */}
        <div className="px-4 mt-4">
          <div className="grid grid-cols-3 gap-2">
            <MacroCard 
              label="Protein" 
              current={totals.protein} 
              goal={settings.dailyProteinGoal}
              color="#F87171"
              icon="protein"
              delay={200}
            />
            <MacroCard 
              label="Carbs" 
              current={totals.carbs} 
              goal={settings.dailyCarbGoal}
              color="#FBBF24"
              icon="carbs"
              delay={250}
            />
            <MacroCard 
              label="Fat" 
              current={totals.fat} 
              goal={settings.dailyFatGoal}
              color="#60A5FA"
              icon="fat"
              delay={300}
            />
        </div>
      </div>

        {/* Nutrition Score */}
        <div className="px-6 mt-6">
          <NutritionScore logs={logs} settings={settings} />
        </div>

        {/* Weekly Summary Card with Mini Chart */}
        {weeklyStats.daysLogged > 0 && (
          <div className="px-6 mt-6">
            <div 
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(236, 72, 153, 0.1))',
                border: '1px solid rgba(139, 92, 246, 0.2)',
              }}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-4">
        <div>
                  <p className="text-xs text-white/40 font-semibold uppercase tracking-wider">This Week</p>
                  <p className="text-2xl font-black text-white mt-1">
                    {weeklyStats.avgCalories.toLocaleString()} <span className="text-sm font-medium text-white/50">avg/day</span>
                  </p>
              </div>
                <div className="flex items-center space-x-3">
                  <div className="text-center">
                    <p className="text-lg font-bold text-purple-400">{weeklyStats.totalMeals}</p>
                    <p className="text-[9px] text-white/40 uppercase">meals</p>
            </div>
                  <div className="text-center">
                    <p className="text-lg font-bold text-pink-400">{weeklyStats.daysLogged}</p>
                    <p className="text-[9px] text-white/40 uppercase">days</p>
                          </div>
                  </div>
                          </div>
              
              {/* Mini Chart */}
              <div className="mt-2">
                <WeeklyMiniChart 
                  dailyData={weeklyStats.dailyData} 
                  goal={settings.dailyCalorieGoal} 
                />
                      </div>
              
              {/* Goal line legend */}
              <div className="flex items-center justify-center mt-2 space-x-4">
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: 'linear-gradient(180deg, #8B5CF6, #EC4899)' }} />
                  <span className="text-[9px] text-white/40">Today</span>
                      </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-0.5 bg-green-400 rounded" />
                  <span className="text-[9px] text-white/40">Goal hit</span>
                  </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-[9px] text-white/40">Over</span>
                </div>
            </div>
        </div>
          </div>
        )}

        {/* Meal Templates - Yesterday's meals (only show on Today view) */}
        {selectedDay === 'today' && yesterdayMeals.length > 0 && displayedLogs.length === 0 && (
          <div className="px-6 mt-6">
            <p className="text-xs text-white/40 font-semibold uppercase tracking-wider mb-3">Quick Log from Yesterday</p>
            <div className="flex space-x-2 overflow-x-auto pb-2 -mx-6 px-6">
              {yesterdayMeals.slice(0, 3).map((meal) => {
                const getMealQuickGradient = (type: string) => {
                  switch (type) {
                    case 'breakfast': return '#FBBF24';
                    case 'lunch': return '#10B981';
                    case 'dinner': return '#A855F7';
                    default: return '#EC4899';
                  }
                };
                return (
                  <button
                    key={meal.id}
                    onClick={() => setSelectedMeal(meal)}
                    className="flex-shrink-0 flex items-center space-x-2.5 px-4 py-2.5 rounded-xl transition-all active:scale-95"
                    style={{
                      background: 'rgba(26, 22, 51, 0.8)',
                      border: '1px solid rgba(139, 92, 246, 0.2)',
                    }}
                  >
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ background: getMealQuickGradient(meal.type) }}
                    />
                    <span className="text-sm font-medium text-white capitalize">{meal.type}</span>
                    <span className="text-xs text-white/40">{Math.round(meal.totalMacros.calories)} cal</span>
                  </button>
                );
              })}
                       </div>
                   </div>
        )}

        {/* Meals Section */}
        <div className="px-6 mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">
              {selectedDay === 'today' ? "Today's Meals" : "Yesterday's Meals"}
            </h3>
            {/* Only show badge when there are meals */}
            {displayedLogs.length > 0 && (
              <span 
                className="text-xs font-medium px-3 py-1 rounded-full"
                style={{
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                {displayedLogs.length} {displayedLogs.length === 1 ? 'meal' : 'meals'}
              </span>
            )}
                       </div>

          {/* Processing card - shows inline when analyzing */}
          {selectedDay === 'today' && pendingAnalysis && (
            <div className="mb-3">
              <ProcessingCard 
                analysis={pendingAnalysis} 
                onClick={onExpandAnalysis}
              />
                   </div>
          )}

          {displayedLogs.length === 0 && !pendingAnalysis ? (
            selectedDay === 'today' ? (
              <EmptyState onAddMeal={onAddMeal || (() => {})} />
            ) : (
              <div className="text-center py-12">
                <p className="text-white/40 text-sm">No meals logged yesterday</p>
              </div>
            )
          ) : displayedLogs.length > 0 ? (
            <div className="space-y-3">
              {displayedLogs.map((log, index) => (
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
                        id: generateUUID(),
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
          ) : null}
        </div>

        {/* Progress Banner */}
        {displayedLogs.length > 0 && progressPercent > 0 && (
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
                    <p className="text-lg font-bold" style={{ color: '#F87171' }}>{Math.round(totals.protein)}g</p>
                    <p className="text-xs text-white/40 uppercase">P</p>
               </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: '#FBBF24' }}>{Math.round(totals.carbs)}g</p>
                    <p className="text-xs text-white/40 uppercase">C</p>
           </div>
                  <div className="text-center">
                    <p className="text-lg font-bold" style={{ color: '#60A5FA' }}>{Math.round(totals.fat)}g</p>
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
