import { MealLog, UserSettings } from '../types';

export interface Insight {
  id: string;
  type: 'pattern' | 'achievement' | 'suggestion' | 'warning' | 'trend';
  icon: string;
  title: string;
  description: string;
  metric?: string;
  color: 'purple' | 'pink' | 'green' | 'orange' | 'blue' | 'red';
  priority: number; // Higher = more important
}

/**
 * Analyze meal logs and generate personalized insights
 */
export function generateInsights(logs: MealLog[], settings: UserSettings): Insight[] {
  const insights: Insight[] = [];
  
  if (logs.length < 3) {
    return [{
      id: 'not-enough-data',
      type: 'suggestion',
      icon: '📊',
      title: 'Keep logging!',
      description: 'Log a few more meals to unlock personalized insights about your eating patterns.',
      color: 'purple',
      priority: 1,
    }];
  }

  // Get date ranges
  const now = new Date();
  const last7Days = logs.filter(l => {
    const diff = now.getTime() - l.timestamp;
    return diff < 7 * 24 * 60 * 60 * 1000;
  });
  
  const last30Days = logs.filter(l => {
    const diff = now.getTime() - l.timestamp;
    return diff < 30 * 24 * 60 * 60 * 1000;
  });

  // 1. Weekend vs Weekday analysis
  const weekendInsight = analyzeWeekendPattern(last30Days, settings);
  if (weekendInsight) insights.push(weekendInsight);

  // 2. Meal timing patterns
  const timingInsight = analyzeMealTiming(last7Days);
  if (timingInsight) insights.push(timingInsight);

  // 3. Protein consistency
  const proteinInsight = analyzeProteinConsistency(last7Days, settings);
  if (proteinInsight) insights.push(proteinInsight);

  // 4. Calorie trend
  const trendInsight = analyzeCalorieTrend(last7Days, settings);
  if (trendInsight) insights.push(trendInsight);

  // 5. Best day of the week
  const bestDayInsight = analyzeBestDay(last30Days, settings);
  if (bestDayInsight) insights.push(bestDayInsight);

  // 6. Meal type distribution
  const mealTypeInsight = analyzeMealTypeDistribution(last7Days);
  if (mealTypeInsight) insights.push(mealTypeInsight);

  // 7. Late night eating
  const lateNightInsight = analyzeLateNightEating(last7Days);
  if (lateNightInsight) insights.push(lateNightInsight);

  // 8. Streak analysis
  const streakInsight = analyzeStreak(logs);
  if (streakInsight) insights.push(streakInsight);

  // 9. Macro balance
  const macroInsight = analyzeMacroBalance(last7Days, settings);
  if (macroInsight) insights.push(macroInsight);

  // 10. Favorite foods
  const favoriteInsight = analyzeFavoriteFoods(last30Days);
  if (favoriteInsight) insights.push(favoriteInsight);

  // Sort by priority
  return insights.sort((a, b) => b.priority - a.priority).slice(0, 5);
}

function analyzeWeekendPattern(logs: MealLog[], settings: UserSettings): Insight | null {
  const weekendLogs = logs.filter(l => {
    const day = new Date(l.timestamp).getDay();
    return day === 0 || day === 6;
  });
  
  const weekdayLogs = logs.filter(l => {
    const day = new Date(l.timestamp).getDay();
    return day !== 0 && day !== 6;
  });

  if (weekendLogs.length < 2 || weekdayLogs.length < 3) return null;

  // Calculate average daily calories
  const weekendDays = new Set(weekendLogs.map(l => new Date(l.timestamp).toDateString())).size;
  const weekdayDays = new Set(weekdayLogs.map(l => new Date(l.timestamp).toDateString())).size;

  const weekendAvg = weekendLogs.reduce((sum, l) => sum + l.totalMacros.calories, 0) / weekendDays;
  const weekdayAvg = weekdayLogs.reduce((sum, l) => sum + l.totalMacros.calories, 0) / weekdayDays;

  const diff = ((weekendAvg - weekdayAvg) / weekdayAvg) * 100;

  if (Math.abs(diff) > 15) {
    if (diff > 0) {
      return {
        id: 'weekend-pattern',
        type: 'pattern',
        icon: '📅',
        title: 'Weekend Splurge Pattern',
        description: `You eat ${Math.round(diff)}% more calories on weekends vs weekdays.`,
        metric: `+${Math.round(weekendAvg - weekdayAvg)} cal`,
        color: 'orange',
        priority: 8,
      };
    } else {
      return {
        id: 'weekend-pattern',
        type: 'pattern',
        icon: '🎯',
        title: 'Consistent Weekends',
        description: `Great discipline! You eat ${Math.round(Math.abs(diff))}% less on weekends.`,
        metric: `${Math.round(weekendAvg - weekdayAvg)} cal`,
        color: 'green',
        priority: 6,
      };
    }
  }
  return null;
}

function analyzeMealTiming(logs: MealLog[]): Insight | null {
  if (logs.length < 5) return null;

  const breakfastTimes = logs
    .filter(l => l.type === 'breakfast')
    .map(l => new Date(l.timestamp).getHours());

  if (breakfastTimes.length < 3) return null;

  const avgBreakfastHour = breakfastTimes.reduce((a, b) => a + b, 0) / breakfastTimes.length;
  const variance = breakfastTimes.reduce((sum, h) => sum + Math.pow(h - avgBreakfastHour, 2), 0) / breakfastTimes.length;

  if (variance < 1) {
    return {
      id: 'consistent-timing',
      type: 'achievement',
      icon: '⏰',
      title: 'Consistent Meal Times',
      description: `Your breakfast timing is very consistent around ${Math.round(avgBreakfastHour)}:00. This supports healthy metabolism!`,
      color: 'green',
      priority: 5,
    };
  } else if (variance > 4) {
    return {
      id: 'irregular-timing',
      type: 'suggestion',
      icon: '⏰',
      title: 'Irregular Meal Times',
      description: 'Your meal times vary significantly. Consistent eating times can improve digestion.',
      color: 'orange',
      priority: 4,
    };
  }
  return null;
}

function analyzeProteinConsistency(logs: MealLog[], settings: UserSettings): Insight | null {
  if (logs.length < 5) return null;

  // Group by day
  const dailyProtein: { [key: string]: number } = {};
  logs.forEach(l => {
    const day = new Date(l.timestamp).toDateString();
    dailyProtein[day] = (dailyProtein[day] || 0) + l.totalMacros.protein;
  });

  const days = Object.values(dailyProtein);
  if (days.length < 3) return null;

  const avgProtein = days.reduce((a, b) => a + b, 0) / days.length;
  const goalPercent = (avgProtein / settings.dailyProteinGoal) * 100;

  if (goalPercent < 70) {
    return {
      id: 'low-protein',
      type: 'warning',
      icon: '🥩',
      title: 'Protein Gap',
      description: `You're averaging ${Math.round(avgProtein)}g protein/day, ${Math.round(100 - goalPercent)}% below your goal.`,
      metric: `-${Math.round(settings.dailyProteinGoal - avgProtein)}g`,
      color: 'red',
      priority: 9,
    };
  } else if (goalPercent >= 90 && goalPercent <= 110) {
    return {
      id: 'protein-perfect',
      type: 'achievement',
      icon: '💪',
      title: 'Protein Champion',
      description: `Crushing it! You're hitting your protein goal consistently at ${Math.round(avgProtein)}g/day.`,
      metric: `${Math.round(goalPercent)}%`,
      color: 'green',
      priority: 7,
    };
  }
  return null;
}

function analyzeCalorieTrend(logs: MealLog[], settings: UserSettings): Insight | null {
  if (logs.length < 7) return null;

  // Get last 7 days of data
  const dailyCalories: number[] = [];
  const now = new Date();
  
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dayStr = date.toDateString();
    
    const dayTotal = logs
      .filter(l => new Date(l.timestamp).toDateString() === dayStr)
      .reduce((sum, l) => sum + l.totalMacros.calories, 0);
    
    if (dayTotal > 0) dailyCalories.push(dayTotal);
  }

  if (dailyCalories.length < 4) return null;

  // Calculate trend (simple linear regression)
  const n = dailyCalories.length;
  const xSum = (n * (n - 1)) / 2;
  const ySum = dailyCalories.reduce((a, b) => a + b, 0);
  const xySum = dailyCalories.reduce((sum, y, i) => sum + i * y, 0);
  const xxSum = dailyCalories.reduce((sum, _, i) => sum + i * i, 0);
  
  const slope = (n * xySum - xSum * ySum) / (n * xxSum - xSum * xSum);
  const dailyChange = slope;

  if (Math.abs(dailyChange) > 50) {
    if (dailyChange > 0) {
      return {
        id: 'calorie-trend-up',
        type: 'trend',
        icon: '📈',
        title: 'Calories Trending Up',
        description: `Your daily intake is increasing by ~${Math.round(dailyChange)} calories per day this week.`,
        color: 'orange',
        priority: 7,
      };
    } else {
      return {
        id: 'calorie-trend-down',
        type: 'trend',
        icon: '📉',
        title: 'Calories Trending Down',
        description: `You're reducing intake by ~${Math.round(Math.abs(dailyChange))} calories per day. Stay consistent!`,
        color: 'blue',
        priority: 6,
      };
    }
  }
  return null;
}

function analyzeBestDay(logs: MealLog[], settings: UserSettings): Insight | null {
  if (logs.length < 14) return null;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayStats: { [key: number]: { total: number; count: number } } = {};

  // Group by day of week
  logs.forEach(l => {
    const day = new Date(l.timestamp).getDay();
    if (!dayStats[day]) dayStats[day] = { total: 0, count: 0 };
    dayStats[day].total += l.totalMacros.calories;
    dayStats[day].count++;
  });

  // Find the day closest to goal
  let bestDay = 0;
  let bestScore = Infinity;

  Object.entries(dayStats).forEach(([day, stats]) => {
    const avg = stats.total / stats.count;
    const diff = Math.abs(avg - settings.dailyCalorieGoal);
    if (diff < bestScore && stats.count >= 2) {
      bestScore = diff;
      bestDay = parseInt(day);
    }
  });

  if (bestScore < 200) {
    return {
      id: 'best-day',
      type: 'pattern',
      icon: '⭐',
      title: `${dayNames[bestDay]} is Your Best Day`,
      description: `You consistently hit your calorie goal on ${dayNames[bestDay]}s. What's your secret?`,
      color: 'purple',
      priority: 5,
    };
  }
  return null;
}

function analyzeMealTypeDistribution(logs: MealLog[]): Insight | null {
  if (logs.length < 7) return null;

  const typeCounts = { breakfast: 0, lunch: 0, dinner: 0, snack: 0 };
  logs.forEach(l => {
    typeCounts[l.type as keyof typeof typeCounts]++;
  });

  const total = logs.length;
  const snackPercent = (typeCounts.snack / total) * 100;
  const breakfastPercent = (typeCounts.breakfast / total) * 100;

  if (snackPercent > 40) {
    return {
      id: 'high-snacking',
      type: 'pattern',
      icon: '🍪',
      title: 'Snack Heavy',
      description: `${Math.round(snackPercent)}% of your meals are snacks. Consider more structured meals for better satiety.`,
      color: 'orange',
      priority: 6,
    };
  }

  if (breakfastPercent < 10 && total > 10) {
    return {
      id: 'skipping-breakfast',
      type: 'suggestion',
      icon: '🌅',
      title: 'Breakfast Skipper',
      description: 'You rarely log breakfast. A morning meal can boost metabolism and focus.',
      color: 'blue',
      priority: 5,
    };
  }
  return null;
}

function analyzeLateNightEating(logs: MealLog[]): Insight | null {
  const lateNightLogs = logs.filter(l => {
    const hour = new Date(l.timestamp).getHours();
    return hour >= 21 || hour < 5;
  });

  if (lateNightLogs.length < 2) return null;

  const percent = (lateNightLogs.length / logs.length) * 100;

  if (percent > 20) {
    const lateCalories = lateNightLogs.reduce((sum, l) => sum + l.totalMacros.calories, 0);
    return {
      id: 'late-night-eating',
      type: 'warning',
      icon: '🌙',
      title: 'Night Owl Eating',
      description: `${Math.round(percent)}% of your meals are after 9 PM. Late eating can affect sleep and digestion.`,
      metric: `${Math.round(lateCalories)} cal`,
      color: 'orange',
      priority: 7,
    };
  }
  return null;
}

function analyzeStreak(logs: MealLog[]): Insight | null {
  if (logs.length < 3) return null;

  // Calculate current streak
  const dates = new Set(logs.map(l => new Date(l.timestamp).toDateString()));
  let streak = 0;
  const today = new Date();

  for (let i = 0; i < 365; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    if (dates.has(date.toDateString())) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }

  if (streak >= 7) {
    return {
      id: 'streak',
      type: 'achievement',
      icon: '🔥',
      title: `${streak} Day Streak!`,
      description: streak >= 30 
        ? 'Incredible dedication! You\'re building a lasting habit.'
        : streak >= 14
        ? 'Two weeks strong! Keep the momentum going.'
        : 'A full week of tracking! You\'re building great habits.',
      color: 'pink',
      priority: 8,
    };
  }
  return null;
}

function analyzeMacroBalance(logs: MealLog[], settings: UserSettings): Insight | null {
  if (logs.length < 5) return null;

  const totals = logs.reduce((acc, l) => ({
    protein: acc.protein + l.totalMacros.protein,
    carbs: acc.carbs + l.totalMacros.carbs,
    fat: acc.fat + l.totalMacros.fat,
  }), { protein: 0, carbs: 0, fat: 0 });

  const totalMacros = totals.protein + totals.carbs + totals.fat;
  const proteinRatio = (totals.protein / totalMacros) * 100;
  const carbsRatio = (totals.carbs / totalMacros) * 100;
  const fatRatio = (totals.fat / totalMacros) * 100;

  // Check for imbalances
  if (carbsRatio > 60) {
    return {
      id: 'high-carb',
      type: 'pattern',
      icon: '🍞',
      title: 'Carb-Heavy Diet',
      description: `${Math.round(carbsRatio)}% of your calories come from carbs. Consider balancing with more protein.`,
      color: 'blue',
      priority: 6,
    };
  }

  if (fatRatio > 45) {
    return {
      id: 'high-fat',
      type: 'pattern',
      icon: '🥑',
      title: 'High Fat Intake',
      description: `${Math.round(fatRatio)}% of your macros are fats. Ensure you're getting healthy fats.`,
      color: 'orange',
      priority: 5,
    };
  }

  // Balanced diet achievement
  if (proteinRatio >= 20 && proteinRatio <= 35 && carbsRatio >= 35 && carbsRatio <= 55 && fatRatio >= 20 && fatRatio <= 35) {
    return {
      id: 'balanced-macros',
      type: 'achievement',
      icon: '⚖️',
      title: 'Balanced Macros',
      description: 'Your protein, carbs, and fats are well-balanced. Great nutritional variety!',
      color: 'green',
      priority: 7,
    };
  }
  return null;
}

function analyzeFavoriteFoods(logs: MealLog[]): Insight | null {
  if (logs.length < 10) return null;

  const foodCounts: { [key: string]: number } = {};
  logs.forEach(l => {
    l.items.forEach(item => {
      const name = item.name.toLowerCase();
      foodCounts[name] = (foodCounts[name] || 0) + 1;
    });
  });

  const sorted = Object.entries(foodCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length > 0 && sorted[0][1] >= 3) {
    const [food, count] = sorted[0];
    return {
      id: 'favorite-food',
      type: 'pattern',
      icon: '❤️',
      title: 'Your Go-To Food',
      description: `You've logged "${food}" ${count} times. It's clearly a favorite!`,
      color: 'pink',
      priority: 4,
    };
  }
  return null;
}
