import React, { useState, useMemo, useEffect } from 'react';
import { MealLog, UserSettings } from '../types.ts';
import AnimatedNumber from '../components/AnimatedNumber.tsx';
import DeficiencyAlerts from '../components/DeficiencyAlerts.tsx';
import { StatCardSkeleton, ChartSkeleton } from '../components/Skeleton.tsx';

interface StatsProps {
  logs: MealLog[];
  settings: UserSettings;
}

type TimePeriod = 'week' | 'month';

const getDateString = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const getDayLabel = (date: Date, short = false) => {
  const days = short 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

// Opal-style calorie bar with tap support
const CalorieBar: React.FC<{
  value: number;
  goal: number;
  label: string;
  isToday: boolean;
  maxValue: number;
  delay: number;
  date: Date;
}> = ({ value, goal, label, isToday, maxValue, delay, date }) => {
  const [animatedHeight, setAnimatedHeight] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const percentage = Math.min((value / maxValue) * 100, 100);
  const isOverGoal = value > goal;
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedHeight(percentage), delay);
    return () => clearTimeout(timer);
  }, [percentage, delay]);
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleTap = () => {
    if (value > 0) {
      setIsActive(true);
      // Auto-dismiss after 2 seconds
      setTimeout(() => setIsActive(false), 2000);
    }
  };
  
  return (
    <div 
      className="flex flex-col items-center flex-1 relative group cursor-pointer"
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onClick={handleTap}
    >
      {/* Tooltip */}
      {isActive && value > 0 && (
        <div 
          className="absolute -top-16 z-20 px-3 py-2 rounded-xl text-white text-xs font-bold whitespace-nowrap"
          style={{
            background: 'rgba(13, 11, 28, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div className="text-center">
            <div className="text-[10px] text-white/40 mb-0.5">{formatDate(date)}</div>
            <div className="text-sm">{Math.round(value)} kcal</div>
            <div className="text-[10px] text-white/40 mt-0.5">
              {Math.round((value / goal) * 100)}% of goal
            </div>
          </div>
        </div>
      )}
      
      <div className="relative h-28 w-full flex flex-col justify-end items-center">
        <div 
          className={`w-6 rounded-lg transition-all duration-500 relative overflow-hidden ${
            isActive ? 'scale-110' : 'scale-100'
          }`}
          style={{ 
            height: `${animatedHeight}%`, 
            minHeight: value > 0 ? '4px' : '0',
          }}
        >
          <div 
            className="absolute inset-0 transition-all duration-300"
            style={{ 
              background: isOverGoal 
                ? 'linear-gradient(180deg, #F43F5E, #EF4444)' 
                : isToday 
                  ? 'linear-gradient(180deg, #8B5CF6, #EC4899)'
                  : 'linear-gradient(180deg, rgba(139, 92, 246, 0.6), rgba(139, 92, 246, 0.3))',
              boxShadow: isActive 
                ? `0 0 16px ${isOverGoal ? 'rgba(239, 68, 68, 0.5)' : isToday ? 'rgba(139, 92, 246, 0.5)' : 'rgba(139, 92, 246, 0.3)'}` 
                : 'none',
            }}
          />
        </div>
        
        {value > 0 && animatedHeight > 0 && (
          <span 
            className="absolute text-[10px] font-bold transition-all duration-300"
            style={{ 
              bottom: `calc(${animatedHeight}% + 4px)`,
              color: isOverGoal ? '#F43F5E' : isToday ? '#A855F7' : 'rgba(255,255,255,0.5)',
              transform: isActive ? 'scale(1.2)' : 'scale(1)',
            }}
          >
            {Math.round(value)}
          </span>
        )}
      </div>
      
      <span className={`text-[10px] mt-2 font-semibold transition-all duration-300 ${
        isToday ? 'text-purple-400 scale-110' : 'text-white/40'
      } ${isActive ? 'scale-110' : ''}`}>
        {label}
      </span>
    </div>
  );
};

// Opal-style macro trend line
const MacroTrendLine: React.FC<{
  data: number[];
  color: string;
  label: string;
  goal: number;
  icon: string;
}> = ({ data, color, label, goal, icon }) => {
  const [isVisible, setIsVisible] = useState(false);
  const maxValue = Math.max(...data, goal) * 1.1;
  const validData = data.filter(d => d > 0);
  const average = validData.length > 0 ? validData.reduce((a, b) => a + b, 0) / validData.length : 0;
  
  const firstHalf = data.slice(0, Math.floor(data.length / 2)).filter(d => d > 0);
  const secondHalf = data.slice(Math.floor(data.length / 2)).filter(d => d > 0);
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
  const trendPercent = firstAvg > 0 ? Math.round(((secondAvg - firstAvg) / firstAvg) * 100) : 0;
  const isTrendingUp = trendPercent > 0;
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);
  
  const width = 280;
  const height = 60;
  const points = data.map((value, index) => ({
    x: (index / (data.length - 1)) * width,
    y: height - (value / maxValue) * height,
  }));
  
  const pathD = points
    .map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  
  const areaD = `${pathD} L ${width} ${height} L 0 ${height} Z`;
  
  return (
    <div 
      className={`rounded-2xl p-4 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        background: 'rgba(26, 22, 51, 0.6)',
        border: '1px solid rgba(139, 92, 246, 0.15)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-bold text-white">{label}</span>
        </div>
        <div className="flex items-center space-x-2">
          {Math.abs(trendPercent) > 5 && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full" style={{
              background: isTrendingUp ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            }}>
              <span className={`text-xs ${isTrendingUp ? 'text-green-400' : 'text-red-400'}`}>
                {isTrendingUp ? '↑' : '↓'}
              </span>
              <span className={`text-[10px] font-bold ${isTrendingUp ? 'text-green-400' : 'text-red-400'}`}>
                {Math.abs(trendPercent)}%
              </span>
            </div>
          )}
          <div className="text-right">
            <span className="text-lg font-black" style={{ color }}>
              <AnimatedNumber value={Math.round(average)} duration={800} />
            </span>
            <span className="text-xs text-white/40 ml-1">g avg</span>
          </div>
        </div>
      </div>
      
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        <line 
          x1="0" 
          y1={height - (goal / maxValue) * height} 
          x2={width} 
          y2={height - (goal / maxValue) * height}
          stroke="rgba(139, 92, 246, 0.3)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        
        <path
          d={areaD}
          fill={`${color}15`}
          className={`transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        />
        
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
          style={{
            filter: `drop-shadow(0 0 6px ${color}50)`,
          }}
        />
        
        {isVisible && points.map((point, i) => (
          data[i] > 0 && (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#0D0B1C"
              stroke={color}
              strokeWidth="2"
              className="transition-all duration-500"
              style={{ transitionDelay: `${i * 50}ms` }}
            />
          )
        ))}
      </svg>
      
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-white/40">Goal: {goal}g</span>
        <span className="text-[10px] font-bold" style={{ color }}>
          <AnimatedNumber value={Math.round((average / goal) * 100)} duration={800} />
          % of goal
        </span>
      </div>
    </div>
  );
};

// SVG icons for stat cards (monoline style)
const StatIcons = {
  fire: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8 0-2.05.78-3.91 2.04-5.33C7.27 8.87 9.46 12 12 12c2.54 0 4.73-3.13 5.96-5.33C19.22 8.09 20 9.95 20 12c0 4.41-3.59 8-8 8z" fill="currentColor" opacity="0.3"/>
      <path d="M12 5.5c-1.5 0-2.91 1.06-3.55 2.67C7.66 10.04 8.95 12 12 12c3.05 0 4.34-1.96 3.55-3.83C14.91 6.56 13.5 5.5 12 5.5z" fill="currentColor"/>
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
      <circle cx="12" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  ),
  bolt: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  ),
  plate: (
    <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 9v6M9 12h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
    </svg>
  ),
};

// Opal-style stat card with SVG icons
const StatCard: React.FC<{
  iconType: 'fire' | 'target' | 'bolt' | 'plate';
  iconColor: string;
  label: string;
  value: string | number;
  subtitle?: string;
  delay: number;
  animate?: boolean;
  isHero?: boolean;
}> = ({ iconType, iconColor, label, value, subtitle, delay, animate = true, isHero = false }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  const isNumeric = typeof value === 'number' && !isNaN(value);
  
  return (
    <div 
      className={`rounded-2xl p-4 flex-1 transition-all duration-700 cursor-pointer active:scale-[0.98] ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        background: isHero 
          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.15))'
          : 'rgba(26, 22, 51, 0.6)',
        border: isHero 
          ? '1px solid rgba(139, 92, 246, 0.3)'
          : '1px solid rgba(139, 92, 246, 0.15)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ 
          background: `${iconColor}20`,
          color: iconColor,
        }}
      >
        {StatIcons[iconType]}
      </div>
      <p className={`${isHero ? 'text-3xl' : 'text-2xl'} font-black text-white`}>
        {isNumeric && animate ? (
          <AnimatedNumber value={value} duration={1000} />
        ) : (
          value
        )}
      </p>
      <p className="text-xs text-white/50 font-medium mt-0.5">{label}</p>
      {subtitle && <p className="text-[11px] text-white/35 mt-0.5">{subtitle}</p>}
    </div>
  );
};

type ViewMode = 'chart' | 'calendar';

const Stats: React.FC<StatsProps> = ({ logs, settings }) => {
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [headerVisible, setHeaderVisible] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => setHeaderVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsInitialLoad(false), 500);
    return () => clearTimeout(timer);
  }, []);
  
  const dateRange = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    
    const days = period === 'week' ? 7 : 30;
    const dates: Date[] = [];
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    
    return dates;
  }, [period]);
  
  const dailyData = useMemo(() => {
    const data: Map<string, { calories: number; protein: number; carbs: number; fat: number; meals: number }> = new Map();
    
    dateRange.forEach(date => {
      data.set(getDateString(date), { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 });
    });
    
    logs.forEach(log => {
      const logDate = new Date(log.timestamp);
      const dateStr = getDateString(logDate);
      
      if (data.has(dateStr)) {
        const existing = data.get(dateStr)!;
        data.set(dateStr, {
          calories: existing.calories + log.totalMacros.calories,
          protein: existing.protein + log.totalMacros.protein,
          carbs: existing.carbs + log.totalMacros.carbs,
          fat: existing.fat + log.totalMacros.fat,
          meals: existing.meals + 1,
        });
      }
    });
    
    return dateRange.map(date => ({
      date,
      ...data.get(getDateString(date))!,
    }));
  }, [logs, dateRange]);
  
  const summaryStats = useMemo(() => {
    const daysWithLogs = dailyData.filter(d => d.meals > 0);
    const totalCalories = daysWithLogs.reduce((sum, d) => sum + d.calories, 0);
    const avgCalories = daysWithLogs.length > 0 ? totalCalories / daysWithLogs.length : 0;
    
    const daysOnTarget = daysWithLogs.filter(d => 
      d.calories >= settings.dailyCalorieGoal * 0.9 && 
      d.calories <= settings.dailyCalorieGoal * 1.1
    ).length;
    
    const goalAchievement = daysWithLogs.length > 0 
      ? Math.round((daysOnTarget / daysWithLogs.length) * 100) 
      : 0;
    
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = dailyData.length - 1; i >= 0; i--) {
      if (dailyData[i].meals > 0) {
        streak++;
      } else if (dailyData[i].date < today) {
        break;
      }
    }
    
    const totalMeals = dailyData.reduce((sum, d) => sum + d.meals, 0);
    
    return {
      avgCalories: Math.round(avgCalories),
      goalAchievement,
      streak,
      totalMeals,
      daysLogged: daysWithLogs.length,
    };
  }, [dailyData, settings]);
  
  const maxCalories = Math.max(
    ...dailyData.map(d => d.calories),
    settings.dailyCalorieGoal * 1.2
  );
  
  const todayStr = getDateString(new Date());
  
  return (
    <div className="h-full overflow-y-auto pb-28 relative">
      {/* Opal-style background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: '#0D0B1C' }} />
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 50% 0%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(236, 72, 153, 0.08) 0%, transparent 50%)
            `,
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className={`pt-14 px-6 pb-4 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <h1 className="text-3xl font-bold text-white">Statistics</h1>
          <p className="text-white/40 text-sm mt-1">Track your nutrition trends</p>
        </div>
        
        {/* Period selector */}
        <div className="px-6 mb-6">
          <div 
            className="rounded-2xl p-1 flex relative"
            style={{
              background: 'rgba(26, 22, 51, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
            }}
          >
            <div
              className="absolute top-1 bottom-1 rounded-xl transition-all duration-300"
              style={{
                left: period === 'week' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
                background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                boxShadow: '0 2px 12px rgba(139, 92, 246, 0.3)',
              }}
            />
            <button
              onClick={() => setPeriod('week')}
              className={`flex-1 py-2.5 rounded-xl text-sm transition-all relative z-10 ${
                period === 'week' ? 'text-white font-bold' : 'text-white/50 font-medium'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`flex-1 py-2.5 rounded-xl text-sm transition-all relative z-10 ${
                period === 'month' ? 'text-white font-bold' : 'text-white/50 font-medium'
              }`}
            >
              This Month
            </button>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="px-6 mb-6">
          <div 
            className="rounded-2xl p-1 flex relative"
            style={{
              background: 'rgba(26, 22, 51, 0.6)',
              border: '1px solid rgba(139, 92, 246, 0.15)',
            }}
          >
            <div
              className="absolute top-1 bottom-1 rounded-xl transition-all duration-300"
              style={{
                left: viewMode === 'chart' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
                background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                boxShadow: '0 2px 12px rgba(139, 92, 246, 0.3)',
              }}
            />
            <button
              onClick={() => setViewMode('chart')}
              className={`flex-1 py-2 rounded-xl text-sm transition-all relative z-10 active:scale-95 ${
                viewMode === 'chart' ? 'text-white font-bold' : 'text-white/50 font-medium'
              }`}
            >
              Charts
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex-1 py-2 rounded-xl text-sm transition-all relative z-10 active:scale-95 ${
                viewMode === 'calendar' ? 'text-white font-bold' : 'text-white/50 font-medium'
              }`}
            >
              Calendar
            </button>
          </div>
        </div>
        
        <div className="px-6 space-y-6">
          {/* Nutritional Deficiency Alerts */}
          <DeficiencyAlerts logs={logs} />

          {/* Summary cards */}
          <div className="flex space-x-3">
            <StatCard
              iconType="fire"
              iconColor="#F97316"
              label="Avg Calories"
              value={summaryStats.avgCalories || 0}
              subtitle={`Goal: ${settings.dailyCalorieGoal}`}
              delay={0}
              isHero={true}
            />
            <StatCard
              iconType="target"
              iconColor="#10B981"
              label="On Target"
              value={`${summaryStats.goalAchievement}%`}
              subtitle={summaryStats.daysLogged === 0 ? 'No data yet' : `${summaryStats.daysLogged} ${summaryStats.daysLogged === 1 ? 'day' : 'days'} logged`}
              delay={100}
            />
          </div>
          
          <div className="flex space-x-3">
            <StatCard
              iconType="bolt"
              iconColor="#FBBF24"
              label="Day Streak"
              value={summaryStats.streak}
              subtitle={summaryStats.streak === 0 ? 'Start logging!' : 'Keep it up!'}
              delay={200}
            />
            <StatCard
              iconType="plate"
              iconColor="#A855F7"
              label="Total Meals"
              value={summaryStats.totalMeals}
              subtitle={`${period === 'week' ? 'This week' : 'This month'}`}
              delay={300}
            />
          </div>

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider flex items-center space-x-2">
                  <span>📅</span>
                  <span>{period === 'week' ? 'This Week' : 'This Month'}</span>
                </h3>
              </div>
              
              <div 
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(26, 22, 51, 0.6)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                {period === 'week' ? (
                  <div className="grid grid-cols-7 gap-2">
                    {dailyData.map((day, index) => {
                      const isToday = getDateString(day.date) === getDateString(new Date());
                      const dayLogs = logs.filter(log => {
                        const logDate = new Date(log.timestamp);
                        logDate.setHours(0, 0, 0, 0);
                        return logDate.toDateString() === day.date.toDateString();
                      });
                      
                      return (
                        <div
                          key={index}
                          className={`rounded-xl p-2 transition-all ${
                            isToday ? 'ring-2 ring-purple-500/50' : ''
                          }`}
                          style={{
                            background: day.meals > 0 
                              ? 'rgba(139, 92, 246, 0.2)' 
                              : 'rgba(139, 92, 246, 0.05)',
                            border: '1px solid rgba(139, 92, 246, 0.15)',
                          }}
                        >
                          <div className="text-[10px] font-bold text-white/40 mb-1 text-center">
                            {getDayLabel(day.date, true)}
                          </div>
                          <div className="text-xs font-bold text-white text-center mb-1">
                            {day.date.getDate()}
                          </div>
                          {day.meals > 0 && (
                            <div className="space-y-1">
                              <div className="text-[10px] font-bold text-white text-center">
                                {Math.round(day.calories)} kcal
                              </div>
                              <div className="flex items-center justify-center space-x-0.5">
                                {dayLogs.slice(0, 3).map((log, i) => (
                                  <div
                                    key={i}
                                    className="w-1.5 h-1.5 rounded-full"
                                    style={{
                                      background: log.type === 'breakfast' ? '#FBBF24' :
                                                  log.type === 'lunch' ? '#3B82F6' :
                                                  log.type === 'dinner' ? '#8B5CF6' : '#A78BFA',
                                    }}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="grid grid-cols-7 gap-1.5">
                    {dailyData.map((day, index) => {
                      const isToday = getDateString(day.date) === getDateString(new Date());
                      
                      return (
                        <div
                          key={index}
                          className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-center transition-all ${
                            isToday ? 'ring-1 ring-purple-500/50' : ''
                          }`}
                          style={{
                            background: day.meals > 0 
                              ? `rgba(139, 92, 246, ${0.15 + Math.min(day.meals / 5, 1) * 0.2})` 
                              : 'rgba(139, 92, 246, 0.05)',
                            border: '1px solid rgba(139, 92, 246, 0.1)',
                          }}
                          title={`${day.date.toLocaleDateString()}: ${day.meals} meal${day.meals !== 1 ? 's' : ''}, ${Math.round(day.calories)} kcal`}
                        >
                          <div className="text-[9px] font-bold text-white/40">
                            {day.date.getDate()}
                          </div>
                          {day.meals > 0 && (
                            <div className="text-[8px] font-bold text-white mt-0.5">
                              {day.meals}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Calorie chart */}
          {viewMode === 'chart' && (
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider flex items-center space-x-2">
                  <span>📊</span>
                  <span>Daily Calories</span>
                </h3>
                <span className="text-xs text-white/30">
                  Goal: {settings.dailyCalorieGoal} kcal
                </span>
              </div>
            
              <div 
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(26, 22, 51, 0.6)',
                  border: '1px solid rgba(139, 92, 246, 0.15)',
                  backdropFilter: 'blur(20px)',
                }}
              >
                <div className="flex items-center justify-end mb-2">
                  <div className="flex items-center space-x-1">
                    <div className="w-4 h-[2px] border-t border-dashed" style={{ borderColor: 'rgba(139, 92, 246, 0.4)' }}></div>
                    <span className="text-[10px] text-white/30">goal</span>
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  {(period === 'week' ? dailyData : dailyData.filter((_, i) => i % 3 === 0 || i === dailyData.length - 1)).map((day, index) => (
                    <CalorieBar
                      key={index}
                      value={day.calories}
                      goal={settings.dailyCalorieGoal}
                      label={period === 'week' 
                        ? getDayLabel(day.date, true) 
                        : `${day.date.getMonth() + 1}/${day.date.getDate()}`
                      }
                      isToday={getDateString(day.date) === todayStr}
                      maxValue={maxCalories}
                      delay={index * 50 + 400}
                      date={day.date}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Macro trends */}
          {viewMode === 'chart' && (
            <div>
              <div className="flex items-center mb-3 px-1">
                <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider flex items-center space-x-2">
                  <span>📈</span>
                  <span>Macro Trends</span>
                </h3>
              </div>
            
              <div className="space-y-3">
                <MacroTrendLine
                  data={dailyData.map(d => d.protein)}
                  color="#10B981"
                  label="Protein"
                  goal={settings.dailyProteinGoal}
                  icon="🥩"
                />
                <MacroTrendLine
                  data={dailyData.map(d => d.carbs)}
                  color="#A855F7"
                  label="Carbohydrates"
                  goal={settings.dailyCarbGoal}
                  icon="🍞"
                />
                <MacroTrendLine
                  data={dailyData.map(d => d.fat)}
                  color="#FB923C"
                  label="Fat"
                  goal={settings.dailyFatGoal}
                  icon="🥑"
                />
              </div>
            </div>
          )}

          {/* Empty state */}
          {summaryStats.totalMeals === 0 && (
            <div className="text-center py-8">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <div 
                  className="absolute inset-0 rounded-2xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(236, 72, 153, 0.2))',
                  }}
                />
                <div 
                  className="absolute inset-1 rounded-xl flex items-center justify-center text-4xl"
                  style={{
                    background: 'rgba(26, 22, 51, 0.8)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  📊
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Log meals to see your trends</h3>
              <p className="text-base text-white/40 mb-6 max-w-xs mx-auto">
                Your insights are waiting to be discovered
              </p>
              <div className="flex items-center justify-center space-x-2 text-xs text-white/30">
                <span>📈 Trends</span>
                <span>•</span>
                <span>📉 Patterns</span>
                <span>•</span>
                <span>🎯 Goals</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stats;
