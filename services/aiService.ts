import { FoodItem, AIProvider } from '../types.ts';
import * as geminiService from './geminiService.ts';
import * as openaiService from './openaiService.ts';
import * as foodDatabaseService from './foodDatabaseService.ts';

// Timeout wrapper for API calls
const withTimeout = <T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
};

/**
 * Unified AI service that routes requests to the appropriate provider
 * based on user settings.
 */
export const analyzeFoodImage = async (base64Image: string, provider: AIProvider): Promise<FoodItem[]> => {
  console.log(`🤖 Routing to ${provider === 'openai' ? 'OpenAI' : 'Gemini'} service...`);
  const serviceCall = provider === 'openai' 
    ? openaiService.analyzeFoodImage(base64Image)
    : geminiService.analyzeFoodImage(base64Image);
  
  return withTimeout(serviceCall, 60000, 'Analysis timed out. Please try again.');
};

export const searchFoodDatabase = async (query: string, provider: AIProvider): Promise<FoodItem[]> => {
  console.log(`🔍 Using REAL food database (USDA + OpenFoodFacts) for: "${query}"`);
  
  // Use real food database only - no AI fallback
  // This is 10-20x faster, free, and more accurate!
  try {
    const items = await foodDatabaseService.searchFoodDatabase(query);
    console.log(`✅ Found ${items.length} items from food database`);
    return items;
  } catch (error) {
    console.error('Database search error:', error);
    // Return empty array instead of falling back to AI
    return [];
  }
};

export const getNutritionalInfoFromBarcode = async (barcode: string, provider: AIProvider): Promise<FoodItem | null> => {
  // OpenFoodFacts is tried first regardless of provider
  // Then falls back to the selected AI provider
  const serviceCall = provider === 'openai'
    ? openaiService.getNutritionalInfoFromBarcode(barcode)
    : geminiService.getNutritionalInfoFromBarcode(barcode);
  
  // 20 second timeout for barcode lookup
  return withTimeout(serviceCall, 20000, 'Barcode lookup timed out. Please try again.');
};

