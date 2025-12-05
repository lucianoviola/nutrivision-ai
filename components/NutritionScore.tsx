import React, { useMemo, useState } from 'react';
import { MealLog, UserSettings, Micronutrients, RECOMMENDED_DAILY_VALUES } from '../types.ts';

interface NutritionScoreProps {
  logs: MealLog[];
  settings: UserSettings;
}

interface ScoreBreakdown {
  calorieScore: number;
  proteinScore: number;
  carbScore: number;
  fatScore: number;
  balanceScore: number;
  microScore: number;
}

/**
 * Calculate a letter grade (A-F) based on daily nutrition.
 */
const NutritionScore: React.FC<NutritionScoreProps> = ({ logs, settings }) => {
  const [showDetails, setShowDetails] = useState(false);

  const { grade, numericScore, breakdown, encouragement } = useMemo(() => {
    // Get today's meals
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStart = today.getTime();
    const todayLogs = logs.filter(log => log.timestamp >= todayStart);

    if (todayLogs.length === 0) {
      return { grade: '-', numericScore: 0, breakdown: null, encouragement: "Log your first meal to get your score!" };
    }

    // Calculate totals
    const totalCals = todayLogs.reduce((sum, log) => sum + log.totalMacros.calories, 0);
    const totalProtein = todayLogs.reduce((sum, log) => sum + log.totalMacros.protein, 0);
    const totalCarbs = todayLogs.reduce((sum, log) => sum + log.totalMacros.carbs, 0);
    const totalFat = todayLogs.reduce((sum, log) => sum + log.totalMacros.fat, 0);

    // Calculate micronutrients
    const totalMicros: Micronutrients = {};
    todayLogs.forEach(log => {
      log.items.forEach(item => {
        if (item.micros) {
          Object.keys(item.micros).forEach(key => {
            const k = key as keyof Micronutrients;
            const value = item.micros?.[k];
            if (value !== undefined) {
              totalMicros[k] = (totalMicros[k] || 0) + value;
            }
          });
        }
      });
    });

    // CALORIE SCORE (0-100): How close to goal
    const calDiff = Math.abs(totalCals - settings.dailyCalorieGoal);
    const calPercent = calDiff / settings.dailyCalorieGoal;
    const calorieScore = Math.max(0, 100 - (calPercent * 200)); // -10% = 80, ±20% = 60, etc.

    // PROTEIN SCORE (0-100): Meeting protein goal is important
    const proteinPercent = totalProtein / settings.dailyProteinGoal;
    const proteinScore = Math.min(100, proteinPercent * 100);

    // CARB SCORE (0-100): Within reasonable range of goal
    const carbPercent = totalCarbs / settings.dailyCarbGoal;
    const carbScore = carbPercent >= 0.5 && carbPercent <= 1.5 
      ? 100 - Math.abs(1 - carbPercent) * 100
      : Math.max(0, 50 - Math.abs(1 - carbPercent) * 50);

    // FAT SCORE (0-100): Not too high
    const fatPercent = totalFat / settings.dailyFatGoal;
    const fatScore = fatPercent <= 1 
      ? 100 
      : Math.max(0, 100 - (fatPercent - 1) * 100);

    // MACRO BALANCE SCORE (0-100): Good ratio between macros
    const totalMacroGrams = totalProtein + totalCarbs + totalFat;
    const proteinRatio = totalMacroGrams > 0 ? totalProtein / totalMacroGrams : 0;
    const carbRatio = totalMacroGrams > 0 ? totalCarbs / totalMacroGrams : 0;
    const fatRatio = totalMacroGrams > 0 ? totalFat / totalMacroGrams : 0;
    
    // Ideal: ~30% protein, ~45% carbs, ~25% fat
    const idealProtein = 0.30, idealCarbs = 0.45, idealFat = 0.25;
    const balanceDeviation = 
      Math.abs(proteinRatio - idealProtein) + 
      Math.abs(carbRatio - idealCarbs) + 
      Math.abs(fatRatio - idealFat);
    const balanceScore = Math.max(0, 100 - balanceDeviation * 150);

    // MICRO SCORE (0-100): Based on coverage of key micronutrients
    const keyMicros: (keyof Micronutrients)[] = ['fiber', 'vitaminC', 'vitaminD', 'iron', 'calcium'];
    let microCoverage = 0;
    let microCount = 0;
    keyMicros.forEach(key => {
      const value = totalMicros[key] || 0;
      const dv = RECOMMENDED_DAILY_VALUES[key];
      if (dv) {
        microCoverage += Math.min(1, value / dv);
        microCount++;
      }
    });
    const microScore = microCount > 0 ? (microCoverage / microCount) * 100 : 50; // Default 50 if no data

    // WEIGHTED FINAL SCORE
    const weights = {
      calorie: 0.25,
      protein: 0.20,
      carb: 0.10,
      fat: 0.15,
      balance: 0.15,
      micro: 0.15,
    };

    const numericScore = 
      calorieScore * weights.calorie +
      proteinScore * weights.protein +
      carbScore * weights.carb +
      fatScore * weights.fat +
      balanceScore * weights.balance +
      microScore * weights.micro;

    // Convert to letter grade
    let grade: string;
    let encouragement: string;
    
    if (numericScore >= 90) {
      grade = 'A';
      encouragement = "Outstanding! Your nutrition is on point! 🌟";
    } else if (numericScore >= 80) {
      grade = 'B';
      encouragement = "Great job! You're eating well today 💪";
    } else if (numericScore >= 70) {
      grade = 'C';
      encouragement = "Good progress! A bit more protein could help 🥗";
    } else if (numericScore >= 60) {
      grade = 'D';
      encouragement = "Room for improvement - try adding more veggies 🥦";
    } else {
      grade = 'F';
      encouragement = "Let's balance things out with your next meal 🎯";
    }

    const breakdown: ScoreBreakdown = {
      calorieScore,
      proteinScore,
      carbScore,
      fatScore,
      balanceScore,
      microScore,
    };

    return { grade, numericScore, breakdown, encouragement };
  }, [logs, settings]);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return { 
        bg: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.2))', 
        text: 'linear-gradient(135deg, #22C55E, #10B981)',
        textFallback: '#22C55E',
        glow: '0 0 30px rgba(34, 197, 94, 0.5), inset 0 0 20px rgba(34, 197, 94, 0.1)',
        border: 'rgba(34, 197, 94, 0.4)'
      };
      case 'B': return { 
        bg: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.2))', 
        text: 'linear-gradient(135deg, #3B82F6, #6366F1)',
        textFallback: '#3B82F6',
        glow: '0 0 30px rgba(59, 130, 246, 0.5), inset 0 0 20px rgba(59, 130, 246, 0.1)',
        border: 'rgba(59, 130, 246, 0.4)'
      };
      case 'C': return { 
        bg: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.2))', 
        text: 'linear-gradient(135deg, #FBBF24, #F59E0B)',
        textFallback: '#FBBF24',
        glow: '0 0 30px rgba(251, 191, 36, 0.5), inset 0 0 20px rgba(251, 191, 36, 0.1)',
        border: 'rgba(251, 191, 36, 0.4)'
      };
      case 'D': return { 
        bg: 'linear-gradient(135deg, rgba(249, 115, 22, 0.3), rgba(234, 88, 12, 0.2))', 
        text: 'linear-gradient(135deg, #F97316, #EA580C)',
        textFallback: '#F97316',
        glow: '0 0 30px rgba(249, 115, 22, 0.5), inset 0 0 20px rgba(249, 115, 22, 0.1)',
        border: 'rgba(249, 115, 22, 0.4)'
      };
      case 'F': return { 
        bg: 'linear-gradient(135deg, rgba(239, 68, 68, 0.25), rgba(220, 38, 38, 0.15))', 
        text: 'linear-gradient(135deg, #F87171, #EF4444)',
        textFallback: '#F87171',
        glow: '0 0 25px rgba(239, 68, 68, 0.4), inset 0 0 15px rgba(239, 68, 68, 0.1)',
        border: 'rgba(239, 68, 68, 0.3)'
      };
      default: return { 
        bg: 'linear-gradient(135deg, rgba(148, 163, 184, 0.2), rgba(100, 116, 139, 0.1))', 
        text: 'linear-gradient(135deg, #94A3B8, #64748B)',
        textFallback: '#94A3B8',
        glow: 'none',
        border: 'rgba(148, 163, 184, 0.2)'
      };
    }
  };

  const colors = getGradeColor(grade);

  const scoreItems = breakdown ? [
    { label: 'Calories', score: breakdown.calorieScore, icon: '🔥' },
    { label: 'Protein', score: breakdown.proteinScore, icon: '💪' },
    { label: 'Carbs', score: breakdown.carbScore, icon: '🌾' },
    { label: 'Fat', score: breakdown.fatScore, icon: '🫒' },
    { label: 'Balance', score: breakdown.balanceScore, icon: '⚖️' },
    { label: 'Nutrients', score: breakdown.microScore, icon: '🔬' },
  ] : [];

  return (
    <div className="mb-4">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="w-full rounded-2xl p-4 active:scale-[0.99] group opal-card"
        style={{
          background: 'linear-gradient(135deg, rgba(20, 17, 40, 0.7), rgba(20, 17, 40, 0.5))',
          backdropFilter: 'blur(40px)',
          border: 'none',
          boxShadow: '0 8px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
          transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Grade Circle - Premium */}
            <div 
              className="relative w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-105"
              style={{ 
                background: colors.bg,
                boxShadow: colors.glow,
                border: `1px solid ${colors.border}`,
              }}
            >
              {/* Inner shine */}
              <div 
                className="absolute inset-0"
                style={{
                  background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                }}
              />
              {/* Grade letter with gradient */}
              <span 
                className="text-3xl font-black relative z-10"
                style={{ 
                  background: colors.text,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  textShadow: 'none',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
                }}
              >
                {grade}
              </span>
            </div>
            
            <div className="text-left">
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Today's Score</p>
              <p className="text-white font-semibold mt-1 text-sm leading-snug">{encouragement}</p>
              {numericScore > 0 && (
                <p className="text-xs text-white/40 mt-1 font-medium">{Math.round(numericScore)}/100 points</p>
              )}
            </div>
          </div>
          
          <svg 
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            className={`transition-transform duration-300 flex-shrink-0 ${showDetails ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </button>
      
      {/* Score Breakdown - Premium */}
      {showDetails && breakdown && (
        <div 
          className="mt-3 p-4 rounded-2xl animate-fade-in"
          style={{
            background: 'linear-gradient(135deg, rgba(26, 22, 51, 0.6), rgba(26, 22, 51, 0.4))',
            border: '1px solid rgba(139, 92, 246, 0.15)',
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest mb-4">Score Breakdown</p>
          <div className="grid grid-cols-2 gap-3">
            {scoreItems.map((item, index) => {
              const scoreColor = item.score >= 80 
                ? 'linear-gradient(90deg, #22C55E, #10B981)' 
                : item.score >= 60 
                  ? 'linear-gradient(90deg, #FBBF24, #F59E0B)' 
                  : 'linear-gradient(90deg, #F87171, #EF4444)';
              const glowColor = item.score >= 80 
                ? 'rgba(34, 197, 94, 0.3)' 
                : item.score >= 60 
                  ? 'rgba(251, 191, 36, 0.3)' 
                  : 'rgba(239, 68, 68, 0.3)';
              
              return (
                <div 
                  key={item.label}
                  className="flex items-center space-x-3 p-2.5 rounded-xl transition-all hover:scale-[1.02]"
                  style={{ 
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.05)',
                    animationDelay: `${index * 50}ms`,
                  }}
                >
                  <span className="text-lg">{item.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-white/60 font-medium">{item.label}</span>
                      <span className="text-sm font-black text-white">{Math.round(item.score)}</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{ 
                          width: `${Math.min(item.score, 100)}%`,
                          background: scoreColor,
                          boxShadow: `0 0 8px ${glowColor}`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div 
            className="mt-4 p-3 rounded-xl text-center"
            style={{ background: 'rgba(139, 92, 246, 0.1)' }}
          >
            <p className="text-xs text-white/50">
              💡 <span className="text-white/70 font-medium">Tip:</span> Aim for balanced macros and plenty of vitamins to boost your score!
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default NutritionScore;

