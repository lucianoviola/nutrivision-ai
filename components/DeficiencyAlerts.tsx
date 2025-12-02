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
  // Calculate average daily intake over last 7 days
  const deficiencies = useMemo(() => {
    const last7Days = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const daysAgo = (Date.now() - logDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    });

    if (last7Days.length === 0) return [];

    // Group by date
    const dailyTotals: { [key: string]: MealLog[] } = {};
    last7Days.forEach(log => {
      const date = new Date(log.timestamp).toDateString();
      if (!dailyTotals[date]) dailyTotals[date] = [];
      dailyTotals[date].push(log);
    });

    const daysCount = Object.keys(dailyTotals).length;
    if (daysCount === 0) return [];

    // Calculate average daily values (simplified - using macros as proxy)
    // In a real app, you'd get micronutrients from the food database
    const avgCalories = last7Days.reduce((sum, log) => sum + log.totalMacros.calories, 0) / daysCount;
    const avgProtein = last7Days.reduce((sum, log) => sum + log.totalMacros.protein, 0) / daysCount;
    const avgCarbs = last7Days.reduce((sum, log) => sum + log.totalMacros.carbs, 0) / daysCount;
    const avgFat = last7Days.reduce((sum, log) => sum + log.totalMacros.fat, 0) / daysCount;

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
      <div className="flex items-center space-x-2 mb-3 px-1">
        <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">⚠️ Nutrition Alerts</span>
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

