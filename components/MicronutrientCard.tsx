import React, { useState, useMemo } from 'react';
import { MealLog, Micronutrients, RECOMMENDED_DAILY_VALUES } from '../types';
import AnimatedNumber from './AnimatedNumber';

interface MicronutrientCardProps {
  logs: MealLog[];
  daysToAnalyze?: number;
}

interface NutrientInfo {
  key: keyof Micronutrients;
  name: string;
  unit: string;
  icon: string;
  isLimit?: boolean; // True if this is a limit (sodium, sugar) vs a goal
  category: 'fiber' | 'vitamins' | 'minerals' | 'fats';
}

const NUTRIENT_INFO: NutrientInfo[] = [
  // Fiber & Sugar
  { key: 'fiber', name: 'Fiber', unit: 'g', icon: '🌾', category: 'fiber' },
  { key: 'sugar', name: 'Sugar', unit: 'g', icon: '🍬', isLimit: true, category: 'fiber' },
  
  // Vitamins
  { key: 'vitaminA', name: 'Vitamin A', unit: 'mcg', icon: '🥕', category: 'vitamins' },
  { key: 'vitaminC', name: 'Vitamin C', unit: 'mg', icon: '🍊', category: 'vitamins' },
  { key: 'vitaminD', name: 'Vitamin D', unit: 'mcg', icon: '☀️', category: 'vitamins' },
  { key: 'vitaminE', name: 'Vitamin E', unit: 'mg', icon: '🥜', category: 'vitamins' },
  { key: 'vitaminK', name: 'Vitamin K', unit: 'mcg', icon: '🥬', category: 'vitamins' },
  { key: 'vitaminB6', name: 'Vitamin B6', unit: 'mg', icon: '🍌', category: 'vitamins' },
  { key: 'vitaminB12', name: 'Vitamin B12', unit: 'mcg', icon: '🥩', category: 'vitamins' },
  { key: 'folate', name: 'Folate', unit: 'mcg', icon: '🥦', category: 'vitamins' },
  
  // Minerals
  { key: 'calcium', name: 'Calcium', unit: 'mg', icon: '🥛', category: 'minerals' },
  { key: 'iron', name: 'Iron', unit: 'mg', icon: '🩸', category: 'minerals' },
  { key: 'magnesium', name: 'Magnesium', unit: 'mg', icon: '🫘', category: 'minerals' },
  { key: 'potassium', name: 'Potassium', unit: 'mg', icon: '🍌', category: 'minerals' },
  { key: 'sodium', name: 'Sodium', unit: 'mg', icon: '🧂', isLimit: true, category: 'minerals' },
  { key: 'zinc', name: 'Zinc', unit: 'mg', icon: '🦪', category: 'minerals' },
  
  // Fats
  { key: 'saturatedFat', name: 'Saturated Fat', unit: 'g', icon: '🧈', isLimit: true, category: 'fats' },
  { key: 'cholesterol', name: 'Cholesterol', unit: 'mg', icon: '🥚', isLimit: true, category: 'fats' },
  { key: 'omega3', name: 'Omega-3', unit: 'g', icon: '🐟', category: 'fats' },
];

type CategoryFilter = 'all' | 'fiber' | 'vitamins' | 'minerals' | 'fats';

/**
 * Calculate daily averages for micronutrients from meal logs.
 */
const calculateDailyAverages = (logs: MealLog[], days: number): Partial<Micronutrients> => {
  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  
  // Filter logs from the period (excluding today for more accurate averages)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const periodLogs = logs.filter(log => {
    const logDate = new Date(log.timestamp);
    return logDate >= cutoff && logDate < today;
  });
  
  if (periodLogs.length === 0) return {};
  
  // Group by day
  const dailyMicros: Map<string, Partial<Micronutrients>> = new Map();
  
  periodLogs.forEach(log => {
    const dateKey = new Date(log.timestamp).toDateString();
    
    if (!dailyMicros.has(dateKey)) {
      dailyMicros.set(dateKey, {});
    }
    
    const dayMicros = dailyMicros.get(dateKey)!;
    
    // Sum up micronutrients from all food items
    log.items.forEach(item => {
      if (!item.micros) return;
      
      Object.entries(item.micros).forEach(([key, value]) => {
        if (typeof value === 'number') {
          const k = key as keyof Micronutrients;
          dayMicros[k] = (dayMicros[k] || 0) + value;
        }
      });
    });
  });
  
  // Calculate averages
  const daysCount = dailyMicros.size;
  if (daysCount === 0) return {};
  
  const averages: Partial<Micronutrients> = {};
  
  dailyMicros.forEach(dayMicros => {
    Object.entries(dayMicros).forEach(([key, value]) => {
      if (typeof value === 'number') {
        const k = key as keyof Micronutrients;
        averages[k] = (averages[k] || 0) + value / daysCount;
      }
    });
  });
  
  return averages;
};

const NutrientBar: React.FC<{
  nutrient: NutrientInfo;
  value: number;
  recommended: number;
}> = ({ nutrient, value, recommended }) => {
  const percentage = Math.min((value / recommended) * 100, 150);
  const isGood = nutrient.isLimit 
    ? percentage <= 100 
    : percentage >= 80;
  const isWarning = nutrient.isLimit 
    ? percentage > 100 
    : percentage < 50;
  
  const barColor = isWarning 
    ? nutrient.isLimit ? '#EF4444' : '#F97316'
    : isGood 
      ? '#10B981' 
      : '#FBBF24';
  
  return (
    <div className="flex items-center space-x-3 py-2">
      <div className="w-8 text-center text-lg">{nutrient.icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-white/80">{nutrient.name}</span>
          <span className="text-xs text-white/50">
            <AnimatedNumber value={Math.round(value * 10) / 10} duration={500} />
            <span className="text-white/30">/{recommended}{nutrient.unit}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ 
              width: `${Math.min(percentage, 100)}%`,
              background: barColor,
            }}
          />
        </div>
      </div>
      <div 
        className="text-xs font-bold px-2 py-0.5 rounded-full"
        style={{ 
          background: `${barColor}20`,
          color: barColor,
        }}
      >
        {Math.round(percentage)}%
      </div>
    </div>
  );
};

const MicronutrientCard: React.FC<MicronutrientCardProps> = ({ 
  logs, 
  daysToAnalyze = 7 
}) => {
  const [category, setCategory] = useState<CategoryFilter>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  
  const averages = useMemo(() => calculateDailyAverages(logs, daysToAnalyze), [logs, daysToAnalyze]);
  
  // Filter nutrients that have data
  const nutrientsWithData = useMemo(() => {
    return NUTRIENT_INFO.filter(n => {
      const value = averages[n.key];
      return value !== undefined && value > 0;
    });
  }, [averages]);
  
  // Filter by category
  const displayedNutrients = useMemo(() => {
    const filtered = category === 'all' 
      ? nutrientsWithData 
      : nutrientsWithData.filter(n => n.category === category);
    
    return isExpanded ? filtered : filtered.slice(0, 5);
  }, [nutrientsWithData, category, isExpanded]);
  
  // Calculate overall score
  const overallScore = useMemo(() => {
    if (nutrientsWithData.length === 0) return null;
    
    let totalScore = 0;
    let count = 0;
    
    nutrientsWithData.forEach(nutrient => {
      const value = averages[nutrient.key] || 0;
      const recommended = RECOMMENDED_DAILY_VALUES[nutrient.key];
      const percentage = (value / recommended) * 100;
      
      // Score: 100 if at goal, less if below or over limit
      if (nutrient.isLimit) {
        totalScore += percentage <= 100 ? 100 : Math.max(0, 200 - percentage);
      } else {
        totalScore += Math.min(percentage, 100);
      }
      count++;
    });
    
    return Math.round(totalScore / count);
  }, [nutrientsWithData, averages]);
  
  if (nutrientsWithData.length === 0) {
    return (
      <div 
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(26, 22, 51, 0.6)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        }}
      >
        <div className="flex items-center space-x-3 mb-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(139, 92, 246, 0.2)' }}
          >
            <span className="text-xl">🧬</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Micronutrients</h3>
            <p className="text-xs text-white/40">Vitamins & Minerals</p>
          </div>
        </div>
        <p className="text-sm text-white/50 text-center py-4">
          Log more meals to see micronutrient data. AI analysis includes vitamin and mineral estimates.
        </p>
      </div>
    );
  }
  
  return (
    <div 
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(26, 22, 51, 0.6)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.03)',
        backdropFilter: 'blur(20px)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div 
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(16, 185, 129, 0.2))' }}
          >
            <span className="text-xl">🧬</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Micronutrients</h3>
            <p className="text-xs text-white/40">Last {daysToAnalyze} days avg</p>
          </div>
        </div>
        
        {overallScore !== null && (
          <div className="text-right">
            <p className={`text-2xl font-black ${
              overallScore >= 80 ? 'text-green-400' : 
              overallScore >= 60 ? 'text-yellow-400' : 'text-orange-400'
            }`}>
              <AnimatedNumber value={overallScore} duration={800} />
            </p>
            <p className="text-[10px] text-white/40">
              {overallScore >= 80 ? 'Excellent' : overallScore >= 60 ? 'Good' : 'Needs work'}
            </p>
          </div>
        )}
      </div>
      
      {/* Category Filter */}
      <div className="flex space-x-2 mb-4 overflow-x-auto pb-1">
        {(['all', 'vitamins', 'minerals', 'fats'] as CategoryFilter[]).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
              category === cat 
                ? 'bg-purple-500/30 text-purple-300' 
                : 'bg-white/5 text-white/40 hover:bg-white/10'
            }`}
          >
            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
          </button>
        ))}
      </div>
      
      {/* Nutrient Bars */}
      <div className="space-y-1">
        {displayedNutrients.map(nutrient => (
          <NutrientBar
            key={nutrient.key}
            nutrient={nutrient}
            value={averages[nutrient.key] || 0}
            recommended={RECOMMENDED_DAILY_VALUES[nutrient.key]}
          />
        ))}
      </div>
      
      {/* Show More/Less */}
      {nutrientsWithData.length > 5 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full mt-3 py-2 text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors"
        >
          {isExpanded ? 'Show less' : `Show ${nutrientsWithData.length - 5} more`}
        </button>
      )}
    </div>
  );
};

export default MicronutrientCard;

