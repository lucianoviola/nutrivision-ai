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
}

export interface UserSettings {
  dailyCalorieGoal: number;
  dailyProteinGoal: number;
  dailyCarbGoal: number;
  dailyFatGoal: number;
  appleHealthConnected: boolean;
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  CAMERA = 'CAMERA',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
}