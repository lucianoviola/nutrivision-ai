export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Micronutrients tracked for comprehensive nutrition analysis.
 * All values are in their standard units (see comments).
 * Optional because not all foods/sources provide this data.
 */
export interface Micronutrients {
  // Fiber & Sugar (grams)
  fiber?: number;
  sugar?: number;
  
  // Vitamins
  vitaminA?: number;      // mcg RAE (Retinol Activity Equivalents)
  vitaminC?: number;      // mg
  vitaminD?: number;      // mcg
  vitaminE?: number;      // mg
  vitaminK?: number;      // mcg
  vitaminB6?: number;     // mg
  vitaminB12?: number;    // mcg
  folate?: number;        // mcg DFE
  
  // Minerals
  calcium?: number;       // mg
  iron?: number;          // mg
  magnesium?: number;     // mg
  potassium?: number;     // mg
  sodium?: number;        // mg
  zinc?: number;          // mg
  
  // Fats breakdown
  saturatedFat?: number;  // g
  transFat?: number;      // g
  cholesterol?: number;   // mg
  omega3?: number;        // g (ALA + EPA + DHA)
  omega6?: number;        // g
}

/**
 * Recommended Daily Values for micronutrients.
 * Based on average adult needs (FDA Daily Values).
 */
export const RECOMMENDED_DAILY_VALUES: Required<Micronutrients> = {
  fiber: 28,
  sugar: 50, // Limit, not goal
  vitaminA: 900,
  vitaminC: 90,
  vitaminD: 20,
  vitaminE: 15,
  vitaminK: 120,
  vitaminB6: 1.7,
  vitaminB12: 2.4,
  folate: 400,
  calcium: 1300,
  iron: 18,
  magnesium: 420,
  potassium: 4700,
  sodium: 2300, // Limit, not goal
  zinc: 11,
  saturatedFat: 20, // Limit
  transFat: 0, // Limit
  cholesterol: 300, // Limit
  omega3: 1.6,
  omega6: 17,
};

export interface FoodItem {
  name: string;
  servingSize: string;
  macros: Macros;
  micros?: Micronutrients;
}

export interface MealLog {
  id: string;
  timestamp: number;
  imageUrl?: string;
  items: FoodItem[];
  totalMacros: Macros;
  totalMicros?: Micronutrients;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  note?: string;
  savedMealId?: string;
}

export type AIProvider = 'gemini' | 'openai';

export interface UserSettings {
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbGoal: number;
  dailyFatGoal: number;
  appleHealthConnected: boolean;
  aiProvider: AIProvider;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  CAMERA = 'CAMERA',
  HISTORY = 'HISTORY',
  STATS = 'STATS',
  SETTINGS = 'SETTINGS',
}