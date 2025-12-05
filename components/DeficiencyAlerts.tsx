import React, { useMemo } from 'react';
import { MealLog, Micronutrients, RECOMMENDED_DAILY_VALUES } from '../types.ts';

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
  isLimit?: boolean;
}

interface NutrientConfig {
  key: keyof Micronutrients;
  name: string;
  unit: string;
  icon: string;
  isLimit?: boolean;
  priority: number; // Higher = more important to flag
}

const TRACKED_NUTRIENTS: NutrientConfig[] = [
  { key: 'fiber', name: 'Fiber', unit: 'g', icon: '🌾', priority: 9 },
  { key: 'vitaminD', name: 'Vitamin D', unit: 'mcg', icon: '☀️', priority: 8 },
  { key: 'iron', name: 'Iron', unit: 'mg', icon: '🩸', priority: 8 },
  { key: 'calcium', name: 'Calcium', unit: 'mg', icon: '🥛', priority: 7 },
  { key: 'potassium', name: 'Potassium', unit: 'mg', icon: '🍌', priority: 6 },
  { key: 'vitaminC', name: 'Vitamin C', unit: 'mg', icon: '🍊', priority: 6 },
  { key: 'magnesium', name: 'Magnesium', unit: 'mg', icon: '🫘', priority: 5 },
  { key: 'zinc', name: 'Zinc', unit: 'mg', icon: '🦪', priority: 5 },
  { key: 'vitaminB12', name: 'Vitamin B12', unit: 'mcg', icon: '🥩', priority: 7 },
  { key: 'folate', name: 'Folate', unit: 'mcg', icon: '🥦', priority: 6 },
  // Limits (we warn if too HIGH)
  { key: 'sodium', name: 'Sodium', unit: 'mg', icon: '🧂', isLimit: true, priority: 8 },
  { key: 'saturatedFat', name: 'Saturated Fat', unit: 'g', icon: '🧈', isLimit: true, priority: 7 },
  { key: 'sugar', name: 'Sugar', unit: 'g', icon: '🍬', isLimit: true, priority: 6 },
];

const DeficiencyAlerts: React.FC<DeficiencyAlertsProps> = ({ logs }) => {
  const deficiencies = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Filter logs from past 7 days, excluding today
    const past7Days = logs.filter(log => {
      const logDate = new Date(log.timestamp);
      const logDay = new Date(logDate.getFullYear(), logDate.getMonth(), logDate.getDate());
      return logDay < today && logDay >= sevenDaysAgo;
    });

    if (past7Days.length === 0) return [];

    // Group by date and calculate daily totals
    const dailyData: Map<string, {
      macros: { calories: number; protein: number; carbs: number; fat: number };
      micros: Partial<Micronutrients>;
    }> = new Map();

    past7Days.forEach(log => {
      const date = new Date(log.timestamp).toDateString();
      
      if (!dailyData.has(date)) {
        dailyData.set(date, {
          macros: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          micros: {},
        });
      }
      
      const day = dailyData.get(date)!;
      day.macros.calories += log.totalMacros.calories;
      day.macros.protein += log.totalMacros.protein;
      day.macros.carbs += log.totalMacros.carbs;
      day.macros.fat += log.totalMacros.fat;
      
      // Sum micronutrients from items
      log.items.forEach(item => {
        if (!item.micros) return;
        Object.entries(item.micros).forEach(([key, value]) => {
          if (typeof value === 'number') {
            const k = key as keyof Micronutrients;
            day.micros[k] = (day.micros[k] || 0) + value;
          }
        });
      });
    });

    const daysCount = dailyData.size;
    if (daysCount === 0) return [];

    // Calculate averages
    const avgMacros = { calories: 0, protein: 0, carbs: 0, fat: 0 };
    const avgMicros: Partial<Micronutrients> = {};
    
    dailyData.forEach(day => {
      avgMacros.calories += day.macros.calories / daysCount;
      avgMacros.protein += day.macros.protein / daysCount;
      avgMacros.carbs += day.macros.carbs / daysCount;
      avgMacros.fat += day.macros.fat / daysCount;
      
      Object.entries(day.micros).forEach(([key, value]) => {
        if (typeof value === 'number') {
          const k = key as keyof Micronutrients;
          avgMicros[k] = (avgMicros[k] || 0) + value / daysCount;
        }
      });
    });

    const alerts: Deficiency[] = [];

    // Check macros first
    if (avgMacros.protein < 50) {
      alerts.push({
        nutrient: 'Protein',
        current: avgMacros.protein,
        recommended: 50,
        unit: 'g',
        severity: avgMacros.protein < 40 ? 'high' : 'moderate',
        icon: '🥩',
      });
    }

    if (avgMacros.calories < 1200) {
      alerts.push({
        nutrient: 'Calories',
        current: avgMacros.calories,
        recommended: 1500,
        unit: 'kcal',
        severity: avgMacros.calories < 1000 ? 'high' : 'moderate',
        icon: '⚡',
      });
    }

    // Check micronutrients
    TRACKED_NUTRIENTS.forEach(config => {
      const value = avgMicros[config.key];
      const recommended = RECOMMENDED_DAILY_VALUES[config.key];
      
      if (value === undefined) return;
      
      const percentage = (value / recommended) * 100;
      
      if (config.isLimit) {
        // For limits, warn if over 120%
        if (percentage > 120) {
          alerts.push({
            nutrient: config.name,
            current: value,
            recommended: recommended,
            unit: config.unit,
            severity: percentage > 150 ? 'high' : 'moderate',
            icon: config.icon,
            isLimit: true,
          });
        }
      } else {
        // For goals, warn if under 50%
        if (percentage < 50) {
          alerts.push({
            nutrient: config.name,
            current: value,
            recommended: recommended,
            unit: config.unit,
            severity: percentage < 30 ? 'high' : 'moderate',
            icon: config.icon,
          });
        }
      }
    });

    // Fallback: estimate fiber from carbs if no real data
    if (avgMicros.fiber === undefined && avgMacros.carbs > 0) {
      const estimatedFiber = avgMacros.carbs * 0.1; // Rough estimate
      const recommended = RECOMMENDED_DAILY_VALUES.fiber;
      if (estimatedFiber < recommended * 0.5) {
        alerts.push({
          nutrient: 'Fiber (est.)',
          current: estimatedFiber,
          recommended: recommended,
          unit: 'g',
          severity: estimatedFiber < recommended * 0.3 ? 'high' : 'moderate',
          icon: '🌾',
        });
      }
    }

    // Sort by severity and priority, limit to top 4
    return alerts
      .sort((a, b) => {
        const severityOrder = { high: 0, moderate: 1, low: 2 };
        return severityOrder[a.severity] - severityOrder[b.severity];
      })
      .slice(0, 4);
  }, [logs]);

  if (deficiencies.length === 0) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <span className="text-sm font-bold text-white/40 uppercase tracking-wider flex items-center space-x-2">
          <span>⚠️</span>
          <span>Nutrition Alerts</span>
        </span>
        <span className="text-xs text-white/30">Past 7 days</span>
      </div>
      
      <div className="space-y-2">
        {deficiencies.map((deficiency, index) => {
          const percentage = (deficiency.current / deficiency.recommended) * 100;
          const isSevere = deficiency.severity === 'high';
          const isOver = deficiency.isLimit && percentage > 100;
          
          return (
            <div
              key={index}
              className="rounded-xl p-3 transition-all"
              style={{
                background: isSevere 
                  ? 'rgba(239, 68, 68, 0.1)' 
                  : 'rgba(234, 179, 8, 0.1)',
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
                        {deficiency.isLimit ? 'Too High' : (deficiency.severity === 'high' ? 'Very Low' : 'Low')}
                      </span>
                    </div>
                    <p className="text-xs text-white/40">
                      {Math.round(deficiency.current)} {deficiency.unit} / {deficiency.recommended} {deficiency.unit} {deficiency.isLimit ? 'limit' : 'recommended'}
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
