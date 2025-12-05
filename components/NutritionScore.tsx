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
      case 'A': return { bg: 'rgba(34, 197, 94, 0.2)', text: '#22C55E', glow: '0 0 20px rgba(34, 197, 94, 0.4)' };
      case 'B': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#3B82F6', glow: '0 0 20px rgba(59, 130, 246, 0.4)' };
      case 'C': return { bg: 'rgba(251, 191, 36, 0.2)', text: '#FBBF24', glow: '0 0 20px rgba(251, 191, 36, 0.4)' };
      case 'D': return { bg: 'rgba(249, 115, 22, 0.2)', text: '#F97316', glow: '0 0 20px rgba(249, 115, 22, 0.4)' };
      case 'F': return { bg: 'rgba(239, 68, 68, 0.2)', text: '#EF4444', glow: '0 0 20px rgba(239, 68, 68, 0.4)' };
      default: return { bg: 'rgba(148, 163, 184, 0.2)', text: '#94A3B8', glow: 'none' };
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
        className="w-full rounded-2xl p-4 transition-all active:scale-[0.99]"
        style={{
          background: 'rgba(26, 22, 51, 0.6)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(139, 92, 246, 0.15)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Grade Circle */}
            <div 
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ 
                background: colors.bg,
                boxShadow: colors.glow,
              }}
            >
              <span 
                className="text-3xl font-black"
                style={{ color: colors.text }}
              >
                {grade}
              </span>
            </div>
            
            <div className="text-left">
              <p className="text-xs text-white/40 font-medium uppercase tracking-wider">Today's Score</p>
              <p className="text-white font-medium mt-0.5">{encouragement}</p>
              {numericScore > 0 && (
                <p className="text-xs text-white/30 mt-0.5">{Math.round(numericScore)}/100 points</p>
              )}
            </div>
          </div>
          
          <svg 
            width="20" height="20" viewBox="0 0 24 24" fill="none"
            className={`transition-transform flex-shrink-0 ${showDetails ? 'rotate-180' : ''}`}
          >
            <path d="M6 9l6 6 6-6" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </button>
      
      {/* Score Breakdown */}
      {showDetails && breakdown && (
        <div 
          className="mt-2 p-4 rounded-2xl animate-fade-in"
          style={{
            background: 'rgba(26, 22, 51, 0.4)',
            border: '1px solid rgba(139, 92, 246, 0.1)',
          }}
        >
          <p className="text-xs text-white/40 font-medium uppercase tracking-wider mb-3">Score Breakdown</p>
          <div className="grid grid-cols-2 gap-3">
            {scoreItems.map(item => (
              <div 
                key={item.label}
                className="flex items-center space-x-2 p-2 rounded-lg"
                style={{ background: 'rgba(255,255,255,0.03)' }}
              >
                <span className="text-base">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-white/60">{item.label}</span>
                    <span className="text-xs font-bold text-white">{Math.round(item.score)}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-full bg-white/10 overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(item.score, 100)}%`,
                        background: item.score >= 80 ? '#22C55E' : item.score >= 60 ? '#FBBF24' : '#EF4444',
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-white/30 text-center mt-3">
            💡 Tip: Aim for balanced macros and plenty of vitamins to boost your score!
          </p>
        </div>
      )}
    </div>
  );
};

export default NutritionScore;

