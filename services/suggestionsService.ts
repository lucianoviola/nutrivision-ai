import { MealLog, UserSettings, FoodItem } from '../types';

export interface MealSuggestion {
  id: string;
  type: 'balance' | 'goal' | 'timing' | 'variety';
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  title: string;
  reason: string;
  suggestions: string[];
  macroFocus?: 'protein' | 'carbs' | 'fat' | 'calories';
  targetMacros?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

/**
 * Generate smart meal suggestions based on today's intake
 */
export function generateSuggestions(
  logs: MealLog[], 
  settings: UserSettings
): MealSuggestion[] {
  const suggestions: MealSuggestion[] = [];
  const now = new Date();
  const hour = now.getHours();

  // Get today's meals
  const todayLogs = logs.filter(l => {
    const logDate = new Date(l.timestamp);
    return logDate.toDateString() === now.toDateString();
  });

  // Calculate today's totals
  const todayTotals = todayLogs.reduce((acc, log) => ({
    calories: acc.calories + log.totalMacros.calories,
    protein: acc.protein + log.totalMacros.protein,
    carbs: acc.carbs + log.totalMacros.carbs,
    fat: acc.fat + log.totalMacros.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  // Calculate remaining
  const remaining = {
    calories: settings.dailyCalorieGoal - todayTotals.calories,
    protein: settings.dailyProteinGoal - todayTotals.protein,
    carbs: settings.dailyCarbGoal - todayTotals.carbs,
    fat: settings.dailyFatGoal - todayTotals.fat,
  };

  // Determine next meal type
  const nextMealType = getNextMealType(hour, todayLogs);
  
  if (!nextMealType) return suggestions;

  // 1. Protein-focused suggestion if low
  if (remaining.protein > settings.dailyProteinGoal * 0.4) {
    suggestions.push({
      id: 'protein-boost',
      type: 'balance',
      mealType: nextMealType,
      title: `High-Protein ${capitalize(nextMealType)}`,
      reason: `You need ${Math.round(remaining.protein)}g more protein today`,
      suggestions: getProteinRichFoods(nextMealType),
      macroFocus: 'protein',
      targetMacros: {
        calories: Math.round(remaining.calories / getMealsRemaining(hour)),
        protein: Math.round(remaining.protein * 0.6),
        carbs: Math.round(remaining.carbs / getMealsRemaining(hour)),
        fat: Math.round(remaining.fat / getMealsRemaining(hour)),
      },
    });
  }

  // 2. Low-calorie option if close to goal
  if (remaining.calories < 500 && remaining.calories > 0) {
    suggestions.push({
      id: 'light-meal',
      type: 'goal',
      mealType: nextMealType,
      title: `Light ${capitalize(nextMealType)}`,
      reason: `Only ${Math.round(remaining.calories)} calories left for today`,
      suggestions: getLowCalorieFoods(nextMealType),
      macroFocus: 'calories',
      targetMacros: {
        calories: Math.round(remaining.calories * 0.8),
        protein: Math.round(remaining.protein * 0.5),
        carbs: Math.round(remaining.carbs * 0.5),
        fat: Math.round(remaining.fat * 0.5),
      },
    });
  }

  // 3. Balanced meal if ratios are off
  const proteinRatio = todayTotals.protein / (todayTotals.protein + todayTotals.carbs + todayTotals.fat || 1);
  if (proteinRatio < 0.2 && todayTotals.calories > 500) {
    suggestions.push({
      id: 'balanced-meal',
      type: 'balance',
      mealType: nextMealType,
      title: `Balanced ${capitalize(nextMealType)}`,
      reason: 'Your protein ratio is low today',
      suggestions: getBalancedFoods(nextMealType),
      macroFocus: 'protein',
    });
  }

  // 4. Carb-conscious if high carbs
  const carbRatio = todayTotals.carbs / (todayTotals.protein + todayTotals.carbs + todayTotals.fat || 1);
  if (carbRatio > 0.55 && todayTotals.calories > 800) {
    suggestions.push({
      id: 'low-carb',
      type: 'balance',
      mealType: nextMealType,
      title: `Low-Carb ${capitalize(nextMealType)}`,
      reason: 'You\'ve had a lot of carbs today',
      suggestions: getLowCarbFoods(nextMealType),
      macroFocus: 'carbs',
    });
  }

  // 5. Energy boost for afternoon slump
  if (hour >= 14 && hour <= 16 && nextMealType === 'snack') {
    suggestions.push({
      id: 'energy-snack',
      type: 'timing',
      mealType: 'snack',
      title: 'Afternoon Energy Boost',
      reason: 'A balanced snack can help with the afternoon slump',
      suggestions: ['Greek yogurt with berries', 'Apple with almond butter', 'Handful of mixed nuts', 'Protein smoothie'],
    });
  }

  return suggestions.slice(0, 3);
}

function getNextMealType(hour: number, todayLogs: MealLog[]): 'breakfast' | 'lunch' | 'dinner' | 'snack' | null {
  const hasBreakfast = todayLogs.some(l => l.type === 'breakfast');
  const hasLunch = todayLogs.some(l => l.type === 'lunch');
  const hasDinner = todayLogs.some(l => l.type === 'dinner');

  if (hour >= 5 && hour < 11 && !hasBreakfast) return 'breakfast';
  if (hour >= 11 && hour < 15 && !hasLunch) return 'lunch';
  if (hour >= 15 && hour < 17) return 'snack';
  if (hour >= 17 && hour < 21 && !hasDinner) return 'dinner';
  if (hour >= 21 || hour < 5) return 'snack';
  
  return 'snack';
}

function getMealsRemaining(hour: number): number {
  if (hour < 11) return 3;
  if (hour < 15) return 2;
  if (hour < 21) return 1;
  return 1;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getProteinRichFoods(mealType: string): string[] {
  const foods: Record<string, string[]> = {
    breakfast: ['Greek yogurt parfait', 'Egg white omelette', 'Protein pancakes', 'Cottage cheese bowl'],
    lunch: ['Grilled chicken salad', 'Tuna wrap', 'Lean beef stir-fry', 'Salmon bowl'],
    dinner: ['Grilled salmon', 'Chicken breast', 'Lean steak', 'Shrimp stir-fry'],
    snack: ['Protein shake', 'Greek yogurt', 'Beef jerky', 'Hard-boiled eggs'],
  };
  return foods[mealType] || foods.snack;
}

function getLowCalorieFoods(mealType: string): string[] {
  const foods: Record<string, string[]> = {
    breakfast: ['Egg white omelette with veggies', 'Greek yogurt (plain)', 'Fresh fruit bowl'],
    lunch: ['Large green salad', 'Veggie soup', 'Grilled chicken lettuce wraps'],
    dinner: ['Grilled fish with vegetables', 'Cauliflower rice stir-fry', 'Zucchini noodles'],
    snack: ['Cucumber slices', 'Celery with salsa', 'Air-popped popcorn', 'Berries'],
  };
  return foods[mealType] || foods.snack;
}

function getBalancedFoods(mealType: string): string[] {
  const foods: Record<string, string[]> = {
    breakfast: ['Oatmeal with protein powder', 'Eggs with toast and avocado', 'Smoothie bowl'],
    lunch: ['Grain bowl with protein', 'Sandwich on whole grain', 'Buddha bowl'],
    dinner: ['Salmon with quinoa and veggies', 'Chicken with sweet potato', 'Stir-fry with tofu'],
    snack: ['Apple with nut butter', 'Cheese and crackers', 'Trail mix'],
  };
  return foods[mealType] || foods.snack;
}

function getLowCarbFoods(mealType: string): string[] {
  const foods: Record<string, string[]> = {
    breakfast: ['Eggs and avocado', 'Smoked salmon and cream cheese', 'Keto pancakes'],
    lunch: ['Cobb salad', 'Lettuce wraps', 'Cauliflower rice bowl'],
    dinner: ['Grilled steak with asparagus', 'Baked salmon with broccoli', 'Zucchini lasagna'],
    snack: ['Cheese cubes', 'Olives', 'Nuts', 'Cucumber with guacamole'],
  };
  return foods[mealType] || foods.snack;
}

/**
 * Get a quick suggestion message based on current state
 */
export function getQuickSuggestion(logs: MealLog[], settings: UserSettings): string | null {
  const suggestions = generateSuggestions(logs, settings);
  if (suggestions.length === 0) return null;
  
  const top = suggestions[0];
  return `💡 ${top.title}: ${top.suggestions[0]}`;
}
