import React, { useMemo } from 'react';
import { MealLog } from '../types.ts';

interface DeficiencyAlertsProps {
  logs: MealLog[];
}

interface Deficiency {
  nutrient: string;
  current: number;
  recommended: number;
  unit: string;
  severity: 'low' | 'moderate' | 'high';
  icon: string;
}

// Recommended daily values (simplified - based on average adult needs)
const RECOMMENDED_DAILY = {
  fiber: { value: 25, unit: 'g', icon: '🌾' },
  calcium: { value: 1000, unit: 'mg', icon: '🥛' },
  iron: { value: 18, unit: 'mg', icon: '🩸' },
  vitaminC: { value: 90, unit: 'mg', icon: '🍊' },
  vitaminD: { value: 20, unit: 'mcg', icon: '☀️' },
  potassium: { value: 3500, unit: 'mg', icon: '🥑' },
};

const DeficiencyAlerts: React.FC<DeficiencyAlertsProps> = ({ logs }) => {
  // Calculate average daily intake over past 7 days (excluding today)
  const deficiencies = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Filter logs from past 7 days, excluding today
    const past7Days = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
      
      // Exclude today - only include completed days
      return logDay < today && logDay >= sevenDaysAgo;
    });

    if (past7Days.length === 0) return [];

    // Group by date
    const dailyTotals: { [key: string]: { calories: number; protein: number; carbs: number; fat: number } } = {};
    past7Days.forEach(log => {
      const date = new Date(log.timestamp).toDateString();
      if (!dailyTotals[date]) {
        dailyTotals[date] = { calories: 0, protein: 0, carbs: 0, fat: 0 };
      }
      dailyTotals[date].calories += log.totalMacros.calories;
      dailyTotals[date].protein += log.totalMacros.protein;
      dailyTotals[date].carbs += log.totalMacros.carbs;
      dailyTotals[date].fat += log.totalMacros.fat;
    });

    const daysCount = Object.keys(dailyTotals).length;
    if (daysCount === 0) return [];

    // Calculate average daily values from completed days only
    const totalCalories = Object.values(dailyTotals).reduce((sum, day) => sum + day.calories, 0);
    const totalProtein = Object.values(dailyTotals).reduce((sum, day) => sum + day.protein, 0);
    const totalCarbs = Object.values(dailyTotals).reduce((sum, day) => sum + day.carbs, 0);
    const totalFat = Object.values(dailyTotals).reduce((sum, day) => sum + day.fat, 0);
    
    const avgCalories = totalCalories / daysCount;
    const avgProtein = totalProtein / daysCount;
    const avgCarbs = totalCarbs / daysCount;
    const avgFat = totalFat / daysCount;

    const alerts: Deficiency[] = [];

    // Fiber estimate (rough: 1g per 100 calories from whole foods)
    const estimatedFiber = (avgCarbs * 0.1); // Rough estimate
    if (estimatedFiber < RECOMMENDED_DAILY.fiber.value * 0.7) {
      alerts.push({
        nutrient: 'Fiber',
        current: estimatedFiber,
        recommended: RECOMMENDED_DAILY.fiber.value,
        unit: RECOMMENDED_DAILY.fiber.unit,
        severity: estimatedFiber < RECOMMENDED_DAILY.fiber.value * 0.5 ? 'high' : 'moderate',
        icon: RECOMMENDED_DAILY.fiber.icon,
      });
    }

    // Protein check (if very low, might indicate iron deficiency risk)
    if (avgProtein < 50) {
      alerts.push({
        nutrient: 'Protein',
        current: avgProtein,
        recommended: 50,
        unit: 'g',
        severity: avgProtein < 40 ? 'high' : 'moderate',
        icon: '🥩',
      });
    }

    // If calories are very low, warn about general nutrition
    if (avgCalories < 1200) {
      alerts.push({
        nutrient: 'Calories',
        current: avgCalories,
        recommended: 1500,
        unit: 'kcal',
        severity: 'moderate',
        icon: '⚡',
      });
    }

    return alerts;
  }, [logs]);

  if (deficiencies.length === 0) return null;

  return (
    <div className="px-6 mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">⚠️ Nutrition Alerts</span>
        <span className="text-xs text-gray-600">Past 7 days</span>
      </div>
      
      <div className="space-y-2">
        {deficiencies.map((deficiency, index) => {
          const percentage = (deficiency.current / deficiency.recommended) * 100;
          const isSevere = deficiency.severity === 'high';
          
          return (
            <div
              key={index}
              className={`rounded-xl p-3 transition-all ${
                isSevere 
                  ? 'bg-red-500/10 border-red-500/30' 
                  : 'bg-yellow-500/10 border-yellow-500/30'
              }`}
              style={{
                border: `1px solid ${isSevere ? 'rgba(239, 68, 68, 0.3)' : 'rgba(234, 179, 8, 0.3)'}`,
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className="text-xl">{deficiency.icon}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <p className="text-sm font-bold text-white">{deficiency.nutrient}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isSevere ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {deficiency.severity === 'high' ? 'High Risk' : 'Low'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">
                      {Math.round(deficiency.current)} {deficiency.unit} / {deficiency.recommended} {deficiency.unit} recommended
                    </p>
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                      <div
                        className={`h-full transition-all duration-500 ${
                          isSevere ? 'bg-red-500' : 'bg-yellow-500'
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DeficiencyAlerts;

