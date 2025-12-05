import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { MealLog, FoodItem, UserSettings, Macros, Micronutrients } from '../types.ts';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Log configuration status
console.log('Supabase config:', { 
  hasUrl: Boolean(supabaseUrl), 
  hasKey: Boolean(supabaseAnonKey),
  url: supabaseUrl ? supabaseUrl.substring(0, 30) + '...' : 'none'
});

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase credentials not found. Cloud sync disabled.');
}

// Only create client if we have valid credentials
export const supabase: SupabaseClient = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder'); // Dummy client that won't be used

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
  // Micronutrients (optional, may be null)
  fiber?: number | null;
  sugar?: number | null;
  vitamin_a?: number | null;
  vitamin_c?: number | null;
  vitamin_d?: number | null;
  vitamin_e?: number | null;
  vitamin_k?: number | null;
  vitamin_b6?: number | null;
  vitamin_b12?: number | null;
  folate?: number | null;
  calcium?: number | null;
  iron?: number | null;
  magnesium?: number | null;
  potassium?: number | null;
  sodium?: number | null;
  zinc?: number | null;
  saturated_fat?: number | null;
  trans_fat?: number | null;
  cholesterol?: number | null;
  omega3?: number | null;
  omega6?: number | null;
}

/**
 * Convert DB micronutrients to app Micronutrients type.
 */
function dbMicrosToAppMicros(item: DbFoodItem): Micronutrients | undefined {
  const micros: Micronutrients = {};
  
  if (item.fiber != null) micros.fiber = item.fiber;
  if (item.sugar != null) micros.sugar = item.sugar;
  if (item.vitamin_a != null) micros.vitaminA = item.vitamin_a;
  if (item.vitamin_c != null) micros.vitaminC = item.vitamin_c;
  if (item.vitamin_d != null) micros.vitaminD = item.vitamin_d;
  if (item.vitamin_e != null) micros.vitaminE = item.vitamin_e;
  if (item.vitamin_k != null) micros.vitaminK = item.vitamin_k;
  if (item.vitamin_b6 != null) micros.vitaminB6 = item.vitamin_b6;
  if (item.vitamin_b12 != null) micros.vitaminB12 = item.vitamin_b12;
  if (item.folate != null) micros.folate = item.folate;
  if (item.calcium != null) micros.calcium = item.calcium;
  if (item.iron != null) micros.iron = item.iron;
  if (item.magnesium != null) micros.magnesium = item.magnesium;
  if (item.potassium != null) micros.potassium = item.potassium;
  if (item.sodium != null) micros.sodium = item.sodium;
  if (item.zinc != null) micros.zinc = item.zinc;
  if (item.saturated_fat != null) micros.saturatedFat = item.saturated_fat;
  if (item.trans_fat != null) micros.transFat = item.trans_fat;
  if (item.cholesterol != null) micros.cholesterol = item.cholesterol;
  if (item.omega3 != null) micros.omega3 = item.omega3;
  if (item.omega6 != null) micros.omega6 = item.omega6;
  
  return Object.keys(micros).length > 0 ? micros : undefined;
}

/**
 * Convert app FoodItem to DB insert format.
 */
function appItemToDbInsert(item: FoodItem, mealLogId: string): Record<string, unknown> {
  const dbItem: Record<string, unknown> = {
    meal_log_id: mealLogId,
    name: item.name,
    serving_size: item.servingSize,
    calories: item.macros.calories,
    protein: item.macros.protein,
    carbs: item.macros.carbs,
    fat: item.macros.fat,
  };
  
  // Add micronutrients if present
  if (item.micros) {
    if (item.micros.fiber !== undefined) dbItem.fiber = item.micros.fiber;
    if (item.micros.sugar !== undefined) dbItem.sugar = item.micros.sugar;
    if (item.micros.vitaminA !== undefined) dbItem.vitamin_a = item.micros.vitaminA;
    if (item.micros.vitaminC !== undefined) dbItem.vitamin_c = item.micros.vitaminC;
    if (item.micros.vitaminD !== undefined) dbItem.vitamin_d = item.micros.vitaminD;
    if (item.micros.vitaminE !== undefined) dbItem.vitamin_e = item.micros.vitaminE;
    if (item.micros.vitaminK !== undefined) dbItem.vitamin_k = item.micros.vitaminK;
    if (item.micros.vitaminB6 !== undefined) dbItem.vitamin_b6 = item.micros.vitaminB6;
    if (item.micros.vitaminB12 !== undefined) dbItem.vitamin_b12 = item.micros.vitaminB12;
    if (item.micros.folate !== undefined) dbItem.folate = item.micros.folate;
    if (item.micros.calcium !== undefined) dbItem.calcium = item.micros.calcium;
    if (item.micros.iron !== undefined) dbItem.iron = item.micros.iron;
    if (item.micros.magnesium !== undefined) dbItem.magnesium = item.micros.magnesium;
    if (item.micros.potassium !== undefined) dbItem.potassium = item.micros.potassium;
    if (item.micros.sodium !== undefined) dbItem.sodium = item.micros.sodium;
    if (item.micros.zinc !== undefined) dbItem.zinc = item.micros.zinc;
    if (item.micros.saturatedFat !== undefined) dbItem.saturated_fat = item.micros.saturatedFat;
    if (item.micros.transFat !== undefined) dbItem.trans_fat = item.micros.transFat;
    if (item.micros.cholesterol !== undefined) dbItem.cholesterol = item.micros.cholesterol;
    if (item.micros.omega3 !== undefined) dbItem.omega3 = item.micros.omega3;
    if (item.micros.omega6 !== undefined) dbItem.omega6 = item.micros.omega6;
  }
  
  return dbItem;
}

interface DbProfile {
  id: string;
  email: string | null;
  display_name: string | null;
  daily_calorie_goal: number;
  daily_protein_goal: number;
  daily_carb_goal: number;
  daily_fat_goal: number;
  openai_api_key: string | null;
  gemini_api_key: string | null;
  ai_provider: string | null;
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
  if (!isSupabaseConfigured()) {
    return null;
  }
  
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Error getting user:', error);
      return null;
    }
    return user;
  } catch (err) {
    console.error('Exception getting user:', err);
    return null;
  }
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
    aiProvider: (profile.ai_provider as 'openai' | 'gemini') || 'openai',
  };
}

/**
 * Get API keys from profile.
 */
export async function getApiKeys(userId: string): Promise<{ openaiKey: string | null; geminiKey: string | null } | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('openai_api_key, gemini_api_key')
    .eq('id', userId)
    .single();
  
  if (error || !data) {
    console.error('Error fetching API keys:', error);
    return null;
  }
  
  return {
    openaiKey: data.openai_api_key,
    geminiKey: data.gemini_api_key,
  };
}

/**
 * Save API keys to profile.
 */
export async function saveApiKeys(
  userId: string, 
  openaiKey: string | null, 
  geminiKey: string | null,
  aiProvider: 'openai' | 'gemini'
): Promise<boolean> {
  const { error } = await supabase
    .from('profiles')
    .update({
      openai_api_key: openaiKey || null,
      gemini_api_key: geminiKey || null,
      ai_provider: aiProvider,
    })
    .eq('id', userId);
  
  if (error) {
    console.error('Error saving API keys:', error);
    return false;
  }
  
  return true;
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
  
  console.log(`📋 Fetched ${mealLogs.length} meal logs from Supabase`);
  
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
        micros: dbMicrosToAppMicros(item),
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
    console.error('Attempted to insert:', {
      id: mealLog.id,
      user_id: userId,
      meal_type: mealLog.type,
      timestamp: mealLog.timestamp,
    });
    return null;
  }
  
  // Insert food items with micronutrients
  if (mealLog.items.length > 0) {
    const foodItemsToInsert = mealLog.items.map(item => 
      appItemToDbInsert(item, mealLog.id)
    );
    
    const { error: itemsError } = await supabase
      .from('food_items')
      .insert(foodItemsToInsert);
    
    if (itemsError) {
      console.error('Error creating food items:', itemsError);
    }
  }
  
  console.log('✅ Meal log created successfully:', mealLog.id);
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
    const foodItemsToInsert = mealLog.items.map(item => 
      appItemToDbInsert(item, mealLog.id)
    );
    
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
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!(url && key && url.includes('supabase.co'));
}

export default supabase;

