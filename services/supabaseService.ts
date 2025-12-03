import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { MealLog, FoodItem, UserSettings, Macros } from '../types.ts';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Cloud sync disabled.');
}

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

// Types for database
interface DbMealLog {
  id: string;
  user_id: string;
  timestamp: number;
  meal_type: string;
  image_url: string | null;
  total_calories: number;
  total_protein: number;
  total_carbs: number;
  total_fat: number;
  note: string | null;
}

interface DbFoodItem {
  id: string;
  meal_log_id: string;
  name: string;
  serving_size: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

interface DbProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  daily_calorie_goal: number;
  daily_protein_goal: number;
  daily_carb_goal: number;
  daily_fat_goal: number;
}

// ============ AUTH ============

/**
 * Sign up with email and password.
 */
export async function signUp(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    return { user: null, error: error.message };
  }
  
  return { user: data.user, error: null };
}

/**
 * Sign in with email and password.
 */
export async function signIn(email: string, password: string): Promise<{ user: User | null; error: string | null }> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  
  if (error) {
    return { user: null, error: error.message };
  }
  
  return { user: data.user, error: null };
}

/**
 * Sign out the current user.
 */
export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

/**
 * Get the current authenticated user.
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Subscribe to auth state changes.
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
    callback(session?.user ?? null);
  });
  
  return () => subscription.unsubscribe();
}

// ============ USER SETTINGS / PROFILE ============

/**
 * Get user settings from profile.
 */
export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    console.error('Error fetching settings:', error);
    return null;
  }
  
  const profile = data as DbProfile;
  return {
    dailyCalorieGoal: profile.daily_calorie_goal,
    dailyProteinGoal: profile.daily_protein_goal,
    dailyCarbGoal: profile.daily_carb_goal,
    dailyFatGoal: profile.daily_fat_goal,
    appleHealthConnected: false,
    aiProvider: 'openai',
  };
}

/**
 * Update user settings.
 */
export async function updateUserSettings(userId: string, settings: UserSettings): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      daily_calorie_goal: settings.dailyCalorieGoal,
      daily_protein_goal: settings.dailyProteinGoal,
      daily_carb_goal: settings.dailyCarbGoal,
      daily_fat_goal: settings.dailyFatGoal,
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Error updating settings:', error);
    return false;
  }
  
  return true;
}

// ============ MEAL LOGS ============

/**
 * Fetch all meal logs for a user.
 */
export async function getMealLogs(userId: string): Promise<MealLog[]> {
  // Fetch meal logs
  const { data: mealLogs, error: logsError } = await supabase
    .from('meal_logs')
    .select('*')
    .eq('user_id', userId)
    .order('timestamp', { ascending: false });
  
  if (logsError || !mealLogs) {
    console.error('Error fetching meal logs:', logsError);
    return [];
  }
  
  // Fetch food items for all meal logs
  const mealIds = mealLogs.map(log => log.id);
  const { data: foodItems, error: itemsError } = await supabase
    .from('food_items')
    .select('*')
    .in('meal_log_id', mealIds);
  
  if (itemsError) {
    console.error('Error fetching food items:', itemsError);
  }
  
  // Map database records to app types
  return mealLogs.map((log: DbMealLog) => {
    const items = (foodItems || [])
      .filter((item: DbFoodItem) => item.meal_log_id === log.id)
      .map((item: DbFoodItem): FoodItem => ({
        name: item.name,
        servingSize: item.serving_size || '',
        macros: {
          calories: item.calories,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        },
      }));
    
    return {
      id: log.id,
      timestamp: log.timestamp,
      type: log.meal_type as MealLog['type'],
      imageUrl: log.image_url || undefined,
      items,
      totalMacros: {
        calories: log.total_calories,
        protein: log.total_protein,
        carbs: log.total_carbs,
        fat: log.total_fat,
      },
      note: log.note || undefined,
    };
  });
}

/**
 * Create a new meal log.
 */
export async function createMealLog(userId: string, mealLog: MealLog): Promise<MealLog | null> {
  // Upload image if exists
  let imageUrl = mealLog.imageUrl;
  if (imageUrl && imageUrl.startsWith('data:')) {
    const uploadedUrl = await uploadMealImage(userId, mealLog.id, imageUrl);
    if (uploadedUrl) {
      imageUrl = uploadedUrl;
    }
  }
  
  // Insert meal log
  const { data: insertedLog, error: logError } = await supabase
    .from('meal_logs')
    .insert({
      id: mealLog.id,
      user_id: userId,
      timestamp: mealLog.timestamp,
      meal_type: mealLog.type,
      image_url: imageUrl,
      total_calories: mealLog.totalMacros.calories,
      total_protein: mealLog.totalMacros.protein,
      total_carbs: mealLog.totalMacros.carbs,
      total_fat: mealLog.totalMacros.fat,
      note: mealLog.note || null,
    })
    .select()
    .single();
  
  if (logError || !insertedLog) {
    console.error('Error creating meal log:', logError);
    return null;
  }
  
  // Insert food items
  if (mealLog.items.length > 0) {
    const foodItemsToInsert = mealLog.items.map(item => ({
      meal_log_id: mealLog.id,
      name: item.name,
      serving_size: item.servingSize,
      calories: item.macros.calories,
      protein: item.macros.protein,
      carbs: item.macros.carbs,
      fat: item.macros.fat,
    }));
    
    const { error: itemsError } = await supabase
      .from('food_items')
      .insert(foodItemsToInsert);
    
    if (itemsError) {
      console.error('Error creating food items:', itemsError);
    }
  }
  
  return {
    ...mealLog,
    imageUrl,
  };
}

/**
 * Update an existing meal log.
 */
export async function updateMealLog(userId: string, mealLog: MealLog): Promise<boolean> {
  // Update meal log
  const { error: logError } = await supabase
    .from('meal_logs')
    .update({
      timestamp: mealLog.timestamp,
      meal_type: mealLog.type,
      total_calories: mealLog.totalMacros.calories,
      total_protein: mealLog.totalMacros.protein,
      total_carbs: mealLog.totalMacros.carbs,
      total_fat: mealLog.totalMacros.fat,
      note: mealLog.note || null,
    })
    .eq('id', mealLog.id)
    .eq('user_id', userId);
  
  if (logError) {
    console.error('Error updating meal log:', logError);
    return false;
  }
  
  // Delete existing food items and re-insert
  await supabase
    .from('food_items')
    .delete()
    .eq('meal_log_id', mealLog.id);
  
  if (mealLog.items.length > 0) {
    const foodItemsToInsert = mealLog.items.map(item => ({
      meal_log_id: mealLog.id,
      name: item.name,
      serving_size: item.servingSize,
      calories: item.macros.calories,
      protein: item.macros.protein,
      carbs: item.macros.carbs,
      fat: item.macros.fat,
    }));
    
    await supabase
      .from('food_items')
      .insert(foodItemsToInsert);
  }
  
  return true;
}

/**
 * Delete a meal log.
 */
export async function deleteMealLog(userId: string, mealLogId: string): Promise<boolean> {
  // Delete associated image from storage
  await supabase.storage
    .from('meal-images')
    .remove([`${userId}/${mealLogId}.jpg`]);
  
  // Delete meal log (food items cascade)
  const { error } = await supabase
    .from('meal_logs')
    .delete()
    .eq('id', mealLogId)
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error deleting meal log:', error);
    return false;
  }
  
  return true;
}

// ============ IMAGE STORAGE ============

/**
 * Upload a meal image to storage.
 */
export async function uploadMealImage(userId: string, mealId: string, base64Data: string): Promise<string | null> {
  try {
    // Convert base64 to blob
    const base64Response = await fetch(base64Data);
    const blob = await base64Response.blob();
    
    const filePath = `${userId}/${mealId}.jpg`;
    
    const { error } = await supabase.storage
      .from('meal-images')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true,
      });
    
    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('meal-images')
      .getPublicUrl(filePath);
    
    return publicUrl;
  } catch (err) {
    console.error('Error uploading image:', err);
    return null;
  }
}

// ============ DATA MIGRATION ============

/**
 * Migrate local storage data to Supabase.
 */
export async function migrateFromLocalStorage(userId: string): Promise<{ success: boolean; migratedCount: number }> {
  try {
    // Get local data
    const localLogs = localStorage.getItem('nutrivision_logs');
    const localSettings = localStorage.getItem('nutrivision_settings');
    
    let migratedCount = 0;
    
    // Migrate settings
    if (localSettings) {
      const settings = JSON.parse(localSettings) as UserSettings;
      await updateUserSettings(userId, settings);
    }
    
    // Migrate meal logs
    if (localLogs) {
      const logs = JSON.parse(localLogs) as MealLog[];
      
      for (const log of logs) {
        const result = await createMealLog(userId, log);
        if (result) {
          migratedCount++;
        }
      }
    }
    
    return { success: true, migratedCount };
  } catch (err) {
    console.error('Migration error:', err);
    return { success: false, migratedCount: 0 };
  }
}

/**
 * Check if user has cloud data.
 */
export async function hasCloudData(userId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('meal_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);
  
  if (error) {
    return false;
  }
  
  return (count || 0) > 0;
}

/**
 * Check if Supabase is configured.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export default supabase;

