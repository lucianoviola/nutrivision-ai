import { FoodItem } from '../types.ts';

/**
 * Saved Meal Template - stores reusable meal combinations
 */
export interface SavedMeal {
  id: string;
  name: string;
  items: FoodItem[];
  totalMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  createdAt: number;
  lastUsed?: number;
  useCount: number;
  emoji?: string; // Optional emoji for quick visual identification
}

const STORAGE_KEY = 'nutrivision_saved_meals';

/**
 * Get all saved meals
 */
export const getSavedMeals = (): SavedMeal[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading saved meals:', error);
    return [];
  }
};

/**
 * Save a meal template
 */
export const saveMeal = (meal: Omit<SavedMeal, 'id' | 'createdAt' | 'useCount' | 'lastUsed'>): SavedMeal => {
  const savedMeals = getSavedMeals();
  const newMeal: SavedMeal = {
    ...meal,
    id: crypto.randomUUID?.() || Date.now().toString(),
    createdAt: Date.now(),
    useCount: 0,
  };
  
  savedMeals.push(newMeal);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(savedMeals));
  return newMeal;
};

/**
 * Delete a saved meal
 */
export const deleteSavedMeal = (id: string): boolean => {
  try {
    const savedMeals = getSavedMeals();
    const filtered = savedMeals.filter(m => m.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return true;
  } catch (error) {
    console.error('Error deleting saved meal:', error);
    return false;
  }
};

/**
 * Update meal usage stats
 */
export const markMealUsed = (id: string): void => {
  const savedMeals = getSavedMeals();
  const meal = savedMeals.find(m => m.id === id);
  if (meal) {
    meal.useCount = (meal.useCount || 0) + 1;
    meal.lastUsed = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedMeals));
  }
};

/**
 * Get most frequently used meals
 */
export const getMostUsedMeals = (limit: number = 5): SavedMeal[] => {
  const savedMeals = getSavedMeals();
  return savedMeals
    .sort((a, b) => (b.useCount || 0) - (a.useCount || 0))
    .slice(0, limit);
};

/**
 * Get recently used meals
 */
export const getRecentMeals = (limit: number = 5): SavedMeal[] => {
  const savedMeals = getSavedMeals();
  return savedMeals
    .filter(m => m.lastUsed)
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0))
    .slice(0, limit);
};

