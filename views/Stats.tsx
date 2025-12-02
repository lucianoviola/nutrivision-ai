import React, { useState, useMemo, useEffect } from 'react';
import { MealLog, UserSettings } from '../types.ts';
import AnimatedNumber from '../components/AnimatedNumber.tsx';
import DeficiencyAlerts from '../components/DeficiencyAlerts.tsx';

interface StatsProps {
  logs: MealLog[];
  settings: UserSettings;
}

type TimePeriod = 'week' | 'month';

// Helper to get date string
const getDateString = (date: Date) => {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

// Helper to get day label
const getDayLabel = (date: Date, short = false) => {
  const days = short 
    ? ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
    : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
};

// Interactive calorie bar component with touch feedback
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
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const percentage = Math.min((value / maxValue) * 100, 100);
  const isOverGoal = value > goal;
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedHeight(percentage), delay);
    return () => clearTimeout(timer);
  }, [percentage, delay]);
  
  const formatDate = (d: Date) => {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  return (
    <div 
      className="flex flex-col items-center flex-1 relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
    >
      {/* Tooltip on hover/touch */}
      {isHovered && value > 0 && (
        <div 
          className="absolute -top-16 z-20 px-3 py-2 rounded-lg text-white text-xs font-bold whitespace-nowrap transition-all duration-200 animate-spring-up"
          style={{
            background: 'rgba(0,0,0,0.9)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
          }}
        >
          <div className="text-center">
            <div className="text-[10px] text-gray-400 mb-0.5">{formatDate(date)}</div>
            <div className="text-sm">{Math.round(value)} kcal</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {Math.round((value / goal) * 100)}% of goal
            </div>
          </div>
          {/* Arrow */}
          <div 
            className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
            style={{ borderTopColor: 'rgba(0,0,0,0.9)' }}
          />
        </div>
      )}
      
      <div className="relative h-28 w-full flex flex-col justify-end items-center">
        {/* Bar container */}
        <div 
          className={`w-6 rounded-lg transition-all duration-300 relative overflow-hidden ${
            isPressed ? 'scale-95' : isHovered ? 'scale-105' : 'scale-100'
          }`}
          style={{ 
            height: `${animatedHeight}%`, 
            minHeight: value > 0 ? '4px' : '0',
          }}
        >
          {/* Gradient fill */}
          <div 
            className="absolute inset-0 transition-all duration-300"
            style={{ 
              background: isOverGoal 
                ? 'linear-gradient(180deg, #f87171, #dc2626)' 
                : isToday 
                  ? 'linear-gradient(180deg, #22d3ee, #6366f1)'
                  : 'linear-gradient(180deg, rgba(255,255,255,0.3), rgba(255,255,255,0.1))',
              boxShadow: isHovered ? `0 0 12px ${isOverGoal ? '#f87171' : isToday ? '#22d3ee' : 'rgba(255,255,255,0.3)'}` : 'none',
            }}
          />
          
          {/* Shimmer effect for today */}
          {isToday && (
            <div 
              className="absolute inset-0 opacity-50 animate-shimmer"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%, rgba(255,255,255,0.2) 100%)',
                backgroundSize: '100% 200%',
              }}
            />
          )}
        </div>
        
        {/* Value label */}
        {value > 0 && animatedHeight > 0 && (
          <span 
            className="absolute text-[10px] font-bold transition-all duration-300"
            style={{ 
              bottom: `calc(${animatedHeight}% + 4px)`,
              color: isOverGoal ? '#f87171' : isToday ? '#22d3ee' : 'rgba(255,255,255,0.6)',
              transform: isHovered ? 'scale(1.2)' : 'scale(1)',
            }}
          >
            {Math.round(value)}
          </span>
        )}
      </div>
      
      <span className={`text-[10px] mt-2 font-semibold transition-all duration-300 ${
        isToday ? 'text-cyan-400 scale-110' : 'text-gray-500'
      } ${isHovered ? 'scale-110' : ''}`}>
        {label}
      </span>
    </div>
  );
};

// Macro trend line with animation and trend indicator
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
  
  // Calculate trend (comparing first half vs second half)
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
  
  // Create SVG path
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
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-bold text-white">{label}</span>
        </div>
        <div className="flex items-center space-x-2">
          {/* Trend indicator */}
          {Math.abs(trendPercent) > 5 && (
            <div className="flex items-center space-x-1 px-2 py-0.5 rounded-full" style={{
              background: isTrendingUp ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
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
              <AnimatedNumber 
                value={Math.round(average)} 
                duration={800}
              />
            </span>
            <span className="text-xs text-gray-500 ml-1">g avg</span>
          </div>
        </div>
      </div>
      
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
        {/* Goal line */}
        <line 
          x1="0" 
          y1={height - (goal / maxValue) * height} 
          x2={width} 
          y2={height - (goal / maxValue) * height}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth="2"
          strokeDasharray="4 4"
        />
        
        {/* Area fill */}
        <path
          d={areaD}
          fill={`${color}20`}
          className={`transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
        />
        
        {/* Line */}
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
        
        {/* Data points */}
        {isVisible && points.map((point, i) => (
          data[i] > 0 && (
            <circle
              key={i}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#0a0a0f"
              stroke={color}
              strokeWidth="2"
              className="transition-all duration-500"
              style={{ transitionDelay: `${i * 50}ms` }}
            />
          )
        ))}
      </svg>
      
      <div className="flex justify-between mt-2">
        <span className="text-[10px] text-gray-500">Goal: {goal}g</span>
        <span 
          className="text-[10px] font-bold"
          style={{ color }}
        >
          <AnimatedNumber value={Math.round((average / goal) * 100)} duration={800} />
          % of goal
        </span>
      </div>
    </div>
  );
};

// Stat card component with animated counter
const StatCard: React.FC<{
  icon: string;
  gradient: string;
  label: string;
  value: string | number;
  subtitle?: string;
  delay: number;
  animate?: boolean;
}> = ({ icon, gradient, label, value, subtitle, delay, animate = true }) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  
  const isNumeric = typeof value === 'number' && !isNaN(value);
  
  return (
    <div 
      className={`rounded-2xl p-4 flex-1 transition-all duration-700 cursor-pointer active:scale-[0.98] active:opacity-90 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      }`}
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-3 transition-transform duration-300 hover:scale-110"
        style={{ background: gradient }}
      >
        {icon}
      </div>
      <p 
        className={`text-2xl font-black text-white ${
          isNumeric && value === 0 ? 'animate-pulse' : ''
        }`}
      >
        {isNumeric && animate ? (
          <AnimatedNumber value={value} duration={1000} />
        ) : (
          value
        )}
      </p>
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      {subtitle && <p className="text-[10px] text-gray-600 mt-0.5">{subtitle}</p>}
    </div>
  );
};

type ViewMode = 'chart' | 'calendar';

const Stats: React.FC<StatsProps> = ({ logs, settings }) => {
  const [period, setPeriod] = useState<TimePeriod>('week');
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [headerVisible, setHeaderVisible] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setHeaderVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);
  
  // Calculate date range
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
  
  // Group logs by date
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
  
  // Calculate summary stats
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
    
    // Calculate streak
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
  
  // Max calorie value for scaling
  const maxCalories = Math.max(
    ...dailyData.map(d => d.calories),
    settings.dailyCalorieGoal * 1.2
  );
  
  // Today's date for highlighting
  const todayStr = getDateString(new Date());
  
  return (
    <div className="h-full overflow-y-auto pb-28 relative">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0a0a0f]" />
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: `
              radial-gradient(ellipse at 50% 0%, rgba(34, 211, 238, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 80% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)
            `,
          }}
        />
      </div>
      
      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className={`pt-14 px-6 pb-4 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <h1 className="text-3xl font-bold text-white">Statistics</h1>
          <p className="text-gray-400 text-sm mt-1">Track your nutrition trends</p>
        </div>
        
        {/* Period selector */}
        <div className="px-6 mb-6">
          <div 
            className="rounded-xl p-1 flex"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <button
              onClick={() => setPeriod('week')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                period === 'week'
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              style={period === 'week' ? {
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              } : {}}
            >
              This Week
            </button>
            <button
              onClick={() => setPeriod('month')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${
                period === 'month'
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
              style={period === 'month' ? {
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              } : {}}
            >
              This Month
            </button>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="px-6 mb-6">
          <div 
            className="rounded-xl p-1 flex relative"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {/* Animated background indicator */}
            <div
              className="absolute top-1 bottom-1 rounded-lg transition-all duration-300 ease-spring"
              style={{
                left: viewMode === 'chart' ? '4px' : '50%',
                width: 'calc(50% - 4px)',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)',
              }}
            />
            <button
              onClick={() => setViewMode('chart')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-300 relative z-10 active:scale-95 ${
                viewMode === 'chart'
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <i className="fa-solid fa-chart-line mr-1.5"></i>
              Charts
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-300 relative z-10 active:scale-95 ${
                viewMode === 'calendar'
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              <i className="fa-solid fa-calendar-days mr-1.5"></i>
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
              icon="🔥"
              gradient="linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(245, 158, 11, 0.1))"
              label="Avg Calories"
              value={summaryStats.avgCalories || 0}
              subtitle={`Goal: ${settings.dailyCalorieGoal}`}
              delay={0}
            />
            <StatCard
              icon="🎯"
              gradient="linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.1))"
              label="On Target"
              value={`${summaryStats.goalAchievement}%`}
              subtitle={`${summaryStats.daysLogged} ${summaryStats.daysLogged === 1 ? 'day' : 'days'} logged`}
              delay={100}
            />
          </div>
          
          <div className="flex space-x-3">
            <StatCard
              icon="⚡"
              gradient="linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(220, 38, 38, 0.1))"
              label="Day Streak"
              value={summaryStats.streak}
              subtitle="Keep it up!"
              delay={200}
            />
            <StatCard
              icon="🍽️"
              gradient="linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.1))"
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
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-2">
                  <span>📅</span>
                  <span>{period === 'week' ? 'This Week' : 'This Month'}</span>
                </h3>
              </div>
              
              <div 
                className="rounded-2xl p-4"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.06)',
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
                              ? 'rgba(139, 92, 246, 0.15)' 
                              : 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <div className="text-[10px] font-bold text-gray-400 mb-1 text-center">
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
                                      background: log.type === 'breakfast' ? '#fbbf24' :
                                                  log.type === 'lunch' ? '#3b82f6' :
                                                  log.type === 'dinner' ? '#8b5cf6' : '#a78bfa',
                                    }}
                                  />
                                ))}
                                {dayLogs.length > 3 && (
                                  <span className="text-[8px] text-gray-400">+{dayLogs.length - 3}</span>
                                )}
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
                      const dayLogs = logs.filter(log => {
                        const logDate = new Date(log.timestamp);
                        logDate.setHours(0, 0, 0, 0);
                        return logDate.toDateString() === day.date.toDateString();
                      });
                      
                      return (
                        <div
                          key={index}
                          className={`aspect-square rounded-lg p-1 flex flex-col items-center justify-center transition-all ${
                            isToday ? 'ring-1 ring-purple-500/50' : ''
                          }`}
                          style={{
                            background: day.meals > 0 
                              ? `rgba(139, 92, 246, ${0.1 + Math.min(day.meals / 5, 1) * 0.15})` 
                              : 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                          }}
                          title={`${day.date.toLocaleDateString()}: ${day.meals} meal${day.meals !== 1 ? 's' : ''}, ${Math.round(day.calories)} kcal`}
                        >
                          <div className="text-[9px] font-bold text-gray-400">
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
                <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-2">
                  <span>📊</span>
                  <span>Daily Calories</span>
                </h3>
                <span className="text-xs text-gray-500">
                  Goal: {settings.dailyCalorieGoal} kcal
                </span>
              </div>
            
            <div 
              className="rounded-2xl p-4"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Goal line indicator */}
              <div className="flex items-center justify-end mb-2">
                <div className="flex items-center space-x-1">
                  <div className="w-4 h-[2px] border-t border-dashed border-white/30"></div>
                  <span className="text-[10px] text-gray-400">goal</span>
                </div>
              </div>
              
              {summaryStats.totalMeals === 0 ? (
                /* Ghost chart visualization */
                <div className="flex space-x-1">
                  {(period === 'week' ? dailyData : dailyData.filter((_, i) => i % 3 === 0 || i === dailyData.length - 1)).map((day, index) => {
                    // Generate ghost values (random but consistent)
                    const ghostValue = (settings.dailyCalorieGoal * 0.6) + (Math.sin(index) * settings.dailyCalorieGoal * 0.2);
                    return (
                      <div key={index} className="flex flex-col items-center flex-1 opacity-50">
                        <div className="relative h-28 w-full flex flex-col justify-end items-center">
                          <div 
                            className="w-6 rounded-lg transition-all duration-700 ease-out relative overflow-hidden"
                            style={{ 
                              height: `${(ghostValue / maxCalories) * 100}%`, 
                              minHeight: '4px',
                              background: 'linear-gradient(180deg, rgba(255,255,255,0.25), rgba(255,255,255,0.12))',
                            }}
                          />
                        </div>
                        <span className="text-[10px] mt-2 font-semibold text-gray-600">
                          {period === 'week' 
                            ? getDayLabel(day.date, true) 
                            : `${day.date.getMonth() + 1}/${day.date.getDate()}`
                          }
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
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
              )}
            </div>
          </div>
          )}

          {/* Macro trends */}
          {viewMode === 'chart' && (
            <div>
            <div className="flex items-center mb-3 px-1">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider flex items-center space-x-2">
                <span>📈</span>
                <span>Macro Trends</span>
              </h3>
            </div>
            
            <div className="space-y-3">
              <MacroTrendLine
                data={dailyData.map(d => d.protein)}
                color="#34d399"
                label="Protein"
                goal={settings.dailyProteinGoal}
                icon="🥩"
              />
              <MacroTrendLine
                data={dailyData.map(d => d.carbs)}
                color="#22d3ee"
                label="Carbohydrates"
                goal={settings.dailyCarbGoal}
                icon="🍞"
              />
              <MacroTrendLine
                data={dailyData.map(d => d.fat)}
                color="#fb923c"
                label="Fat"
                goal={settings.dailyFatGoal}
                icon="🥑"
              />
            </div>
          </div>
          )}

          {/* Empty state with personality */}
          {summaryStats.totalMeals === 0 && (
            <div className="text-center py-8">
              <div className="relative w-24 h-24 mx-auto mb-6">
                {/* Animated chart icon */}
                <div 
                  className="absolute inset-0 rounded-2xl animate-breathe"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(99, 102, 241, 0.2))',
                  }}
                />
                <div 
                  className="absolute inset-1 rounded-xl flex items-center justify-center text-4xl"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    backdropFilter: 'blur(10px)',
                  }}
                >
                  📊
                </div>
              </div>
              <h3 className="text-title-1 font-bold text-white mb-2">Log meals to see your trends emerge</h3>
              <p className="text-body text-gray-400 mb-6 max-w-xs mx-auto">
                Your insights are waiting to be discovered
              </p>
              <div className="flex items-center justify-center space-x-2 text-caption text-gray-500">
                <span>📈</span>
                <span>Trends</span>
                <span>•</span>
                <span>📉</span>
                <span>Patterns</span>
                <span>•</span>
                <span>🎯</span>
                <span>Goals</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stats;
