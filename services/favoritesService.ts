import { FoodItem } from '../types';

const STORAGE_KEY = 'nutrivision_favorites';

export interface FavoriteFood extends FoodItem {
  id: string;
  addedAt: number;
  useCount: number;
}

/**
 * Get all favorite foods
 */
export function getFavorites(): FavoriteFood[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Add a food to favorites
 */
export function addFavorite(food: FoodItem): FavoriteFood {
  const favorites = getFavorites();
  
  // Check if already exists
  const existing = favorites.find(f => 
    f.name.toLowerCase() === food.name.toLowerCase()
  );
  
  if (existing) {
    return existing;
  }
  
  const favorite: FavoriteFood = {
    ...food,
    id: crypto.randomUUID?.() || Date.now().toString(),
    addedAt: Date.now(),
    useCount: 0,
  };
  
  favorites.unshift(favorite);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  
  return favorite;
}

/**
 * Remove a food from favorites
 */
export function removeFavorite(id: string): void {
  const favorites = getFavorites();
  const updated = favorites.filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Check if a food is favorited
 */
export function isFavorite(foodName: string): boolean {
  const favorites = getFavorites();
  return favorites.some(f => f.name.toLowerCase() === foodName.toLowerCase());
}

/**
 * Toggle favorite status
 */
export function toggleFavorite(food: FoodItem): boolean {
  const favorites = getFavorites();
  const existing = favorites.find(f => 
    f.name.toLowerCase() === food.name.toLowerCase()
  );
  
  if (existing) {
    removeFavorite(existing.id);
    return false;
  } else {
    addFavorite(food);
    return true;
  }
}

/**
 * Increment use count (for sorting by frequency)
 */
export function incrementUseCount(id: string): void {
  const favorites = getFavorites();
  const favorite = favorites.find(f => f.id === id);
  if (favorite) {
    favorite.useCount++;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  }
}

/**
 * Get favorites sorted by use count (most used first)
 */
export function getFavoritesByUsage(): FavoriteFood[] {
  return getFavorites().sort((a, b) => b.useCount - a.useCount);
}

