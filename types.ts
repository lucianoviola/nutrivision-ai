export interface Macros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodItem {
  name: string;
  servingSize: string;
  macros: Macros;
}

export interface MealLog {
  id: string;
  timestamp: number;
  imageUrl?: string;
  items: FoodItem[];
  totalMacros: Macros;
  type: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  note?: string;
  savedMealId?: string; // Reference to saved meal template if this was created from one
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