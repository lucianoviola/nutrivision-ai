import OpenAI from 'openai';
import { FoodItem, Micronutrients } from '../types.ts';

/**
 * Parse micronutrients from AI response, with safe defaults.
 */
const parseMicronutrients = (micros: any): Micronutrients | undefined => {
  if (!micros || typeof micros !== 'object') return undefined;
  
  const result: Micronutrients = {};
  
  // Only include values that are present and valid numbers
  if (typeof micros.fiber === 'number') result.fiber = micros.fiber;
  if (typeof micros.sugar === 'number') result.sugar = micros.sugar;
  if (typeof micros.vitaminA === 'number') result.vitaminA = micros.vitaminA;
  if (typeof micros.vitaminC === 'number') result.vitaminC = micros.vitaminC;
  if (typeof micros.vitaminD === 'number') result.vitaminD = micros.vitaminD;
  if (typeof micros.vitaminE === 'number') result.vitaminE = micros.vitaminE;
  if (typeof micros.vitaminK === 'number') result.vitaminK = micros.vitaminK;
  if (typeof micros.vitaminB6 === 'number') result.vitaminB6 = micros.vitaminB6;
  if (typeof micros.vitaminB12 === 'number') result.vitaminB12 = micros.vitaminB12;
  if (typeof micros.folate === 'number') result.folate = micros.folate;
  if (typeof micros.calcium === 'number') result.calcium = micros.calcium;
  if (typeof micros.iron === 'number') result.iron = micros.iron;
  if (typeof micros.magnesium === 'number') result.magnesium = micros.magnesium;
  if (typeof micros.potassium === 'number') result.potassium = micros.potassium;
  if (typeof micros.sodium === 'number') result.sodium = micros.sodium;
  if (typeof micros.zinc === 'number') result.zinc = micros.zinc;
  if (typeof micros.saturatedFat === 'number') result.saturatedFat = micros.saturatedFat;
  if (typeof micros.transFat === 'number') result.transFat = micros.transFat;
  if (typeof micros.cholesterol === 'number') result.cholesterol = micros.cholesterol;
  if (typeof micros.omega3 === 'number') result.omega3 = micros.omega3;
  if (typeof micros.omega6 === 'number') result.omega6 = micros.omega6;
  
  // Return undefined if no micronutrients were found
  return Object.keys(result).length > 0 ? result : undefined;
};

// Helper to get OpenAI API key from multiple sources
const getOpenAiApiKey = () => {
  // 1. Check localStorage (user-set in Settings UI) - PRIMARY METHOD
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('nutrivision_openai_api_key');
    if (stored) return stored;
  }
  
  // 2. Check Vite environment variable (only for local development)
  // ⚠️ SECURITY: VITE_ prefixed vars are exposed in client bundle!
  // Only use this for local dev, NOT in production
  if (import.meta.env.DEV && import.meta.env.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }
  
  return '';
};

// Get OpenAI instance
const getOpenAiInstance = () => {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY_MISSING");
  }
  return new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
};

// JSON schema for food analysis response
const foodAnalysisSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the food item' },
          servingSize: { type: 'string', description: 'Estimated serving size (e.g., 100g, 1 cup)' },
          macros: {
            type: 'object',
            properties: {
              calories: { type: 'number', description: 'Calories in kcal' },
              protein: { type: 'number', description: 'Protein in grams' },
              carbs: { type: 'number', description: 'Carbohydrates in grams' },
              fat: { type: 'number', description: 'Fat in grams' },
            },
            required: ['calories', 'protein', 'carbs', 'fat'],
          },
        },
        required: ['name', 'servingSize', 'macros'],
      },
    },
  },
  required: ['items'],
} as const;

// Check if correction is simple (text-only) vs complex (needs image)
const isSimpleCorrection = (correctionText: string): boolean => {
  const lower = correctionText.toLowerCase();
  // Simple corrections: wrong food name, wrong item identification
  // Complex corrections: add items, adjust portions, change amounts
  const simpleKeywords = ['is', 'was', 'not', 'actually', 'wrong', 'incorrect', 'should be'];
  const complexKeywords = ['add', 'more', 'less', 'bigger', 'smaller', 'increase', 'decrease', 'portion'];
  
  const hasSimple = simpleKeywords.some(kw => lower.includes(kw));
  const hasComplex = complexKeywords.some(kw => lower.includes(kw));
  
  // If it's clearly a simple correction and not complex, try text-only
  return hasSimple && !hasComplex;
};

export const correctFoodAnalysis = async (
  base64Image: string,
  originalItems: FoodItem[],
  correctionText: string
): Promise<FoodItem[]> => {
  console.log('🔧 Correcting food analysis with user feedback...');
  const openai = getOpenAiInstance();
  
  // Clean base64 if it still has prefix
  let cleanBase64 = base64Image;
  if (base64Image.includes(',')) {
    cleanBase64 = base64Image.split(',')[1];
  }

  const originalItemsText = originalItems.map(item => 
    `- ${item.name} (${item.servingSize}): ${item.macros.calories} kcal, P:${item.macros.protein}g C:${item.macros.carbs}g F:${item.macros.fat}g`
  ).join('\n');

  const needsImage = !isSimpleCorrection(correctionText);
  console.log(`📊 Correction type: ${needsImage ? 'Complex (needs image)' : 'Simple (text-only)'}`);

  try {
    // For simple corrections, try text-only first (faster, cheaper)
    if (!needsImage) {
      try {
        console.log('💬 Attempting text-only correction...');
        const textResponse = await openai.chat.completions.create({
          model: 'gpt-4o-mini', // Lighter, faster model for text-only
          messages: [
            {
              role: 'user',
              content: `I previously analyzed a food image and got these results:\n\n${originalItemsText}\n\nHowever, the user has provided this correction: "${correctionText}"\n\nPlease correct the food items based on the user's feedback. For example, if they say "this is rice not pasta", replace pasta with rice. Keep the same serving sizes and adjust macros if you know the correct values, otherwise keep them similar. Return a JSON object with the corrected structure: { "items": [{"name": string, "servingSize": string, "macros": {"calories": number, "protein": number, "carbs": number, "fat": number}}] }`,
            },
          ],
          response_format: { type: 'json_object' },
        });

        const textContent = textResponse.choices[0]?.message?.content;
        if (textContent) {
          const parsed = JSON.parse(textContent);
          if (parsed.items && Array.isArray(parsed.items) && parsed.items.length > 0) {
            console.log('✅ Text-only correction successful');
            return parsed.items.map((item: any) => ({
              name: item.name || 'Unknown',
              servingSize: item.servingSize || 'Unknown',
              macros: {
                calories: item.macros?.calories || 0,
                protein: item.macros?.protein || 0,
                carbs: item.macros?.carbs || 0,
                fat: item.macros?.fat || 0,
              },
            }));
          }
        }
      } catch (textError) {
        console.log('⚠️ Text-only correction failed, falling back to image-based correction');
        // Fall through to image-based correction
      }
    }

    // Complex corrections or text-only fallback: use image with lighter model
    console.log('🖼️ Using image-based correction...');
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini', // Lighter model for corrections (faster than gpt-5-mini)
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `I previously analyzed this food image and got these results:\n\n${originalItemsText}\n\nHowever, the user has provided this correction: "${correctionText}"\n\nPlease re-analyze the image taking into account the user's feedback. Correct any mistakes, add missing items, or adjust portions as needed. Return a JSON object with the corrected structure: { "items": [{"name": string, "servingSize": string, "macros": {"calories": number, "protein": number, "carbs": number, "fat": number}}] }`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${cleanBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const parsed = JSON.parse(content);
    if (!parsed.items || !Array.isArray(parsed.items)) {
      throw new Error('Invalid response format from OpenAI');
    }

    return parsed.items.map((item: any) => ({
      name: item.name || 'Unknown',
      servingSize: item.servingSize || 'Unknown',
      macros: {
        calories: item.macros?.calories || 0,
        protein: item.macros?.protein || 0,
        carbs: item.macros?.carbs || 0,
        fat: item.macros?.fat || 0,
      },
    }));
  } catch (error: any) {
    console.error('❌ Error correcting food analysis:', error);
    throw new Error(error?.message || 'Failed to correct food analysis');
  }
};

export const analyzeFoodImage = async (base64Image: string): Promise<FoodItem[]> => {
  console.log('🔑 Getting OpenAI API instance...');
  const openai = getOpenAiInstance();
  console.log('✅ OpenAI instance created');

  // Validate and clean base64 image
  console.log('📷 Image data received:', {
    exists: !!base64Image,
    length: base64Image?.length || 0,
    hasPrefix: base64Image?.includes(','),
    preview: base64Image?.substring(0, 50)
  });
  
  if (!base64Image) {
    throw new Error('No image data provided');
  }
  
  // Clean base64 if it still has data URL prefix
  let cleanBase64 = base64Image;
  if (base64Image.includes(',')) {
    cleanBase64 = base64Image.split(',')[1] || base64Image;
  }
  
  if (cleanBase64.length < 100) {
    throw new Error(`Image data too small (${cleanBase64.length} chars)`);
  }
  
  console.log('📷 Cleaned base64:', {
    length: cleanBase64.length,
    preview: cleanBase64.substring(0, 30) + '...'
  });

  const startTime = Date.now();
  try {
    console.log('📡 Sending request to OpenAI API (gpt-5-mini-2025-08-07)...');
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07', // Using GPT-5 Mini for vision analysis
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Analyze this image. If it contains food, identify each item, estimate the portion size, and calculate comprehensive nutritional values including micronutrients.

Return a JSON object with this structure:
{
  "items": [{
    "name": string,
    "servingSize": string,
    "macros": {
      "calories": number,
      "protein": number (g),
      "carbs": number (g),
      "fat": number (g)
    },
    "micros": {
      "fiber": number (g),
      "sugar": number (g),
      "vitaminA": number (mcg RAE),
      "vitaminC": number (mg),
      "vitaminD": number (mcg),
      "vitaminE": number (mg),
      "vitaminK": number (mcg),
      "vitaminB6": number (mg),
      "vitaminB12": number (mcg),
      "folate": number (mcg),
      "calcium": number (mg),
      "iron": number (mg),
      "magnesium": number (mg),
      "potassium": number (mg),
      "sodium": number (mg),
      "zinc": number (mg),
      "saturatedFat": number (g),
      "cholesterol": number (mg),
      "omega3": number (g),
      "omega6": number (g)
    }
  }]
}

Notes:
- Estimate micronutrients based on typical values for each food
- Include only micronutrients you're confident about (omit uncertain ones)
- For barcodes, read and identify the product with its nutritional values`,
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${cleanBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
    });

    const apiDuration = Date.now() - startTime;
    console.log(`⏱️ OpenAI API responded in ${(apiDuration / 1000).toFixed(2)}s`);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('📥 Raw response received:', { 
      responseLength: content.length,
      preview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
    });

    const data = JSON.parse(content);
    console.log(`✅ Successfully extracted ${data.items?.length || 0} food item(s)`);
    
    // Parse items with micronutrients
    return (data.items || []).map((item: any) => ({
      name: item.name || 'Unknown',
      servingSize: item.servingSize || 'Unknown',
      macros: {
        calories: item.macros?.calories || 0,
        protein: item.macros?.protein || 0,
        carbs: item.macros?.carbs || 0,
        fat: item.macros?.fat || 0,
      },
      micros: parseMicronutrients(item.micros),
    }));
  } catch (error) {
    console.error('OpenAI Analysis Error:', error);
    throw error;
  }
};

// Restaurant menu item type
export interface MenuItem {
  name: string;
  description?: string;
  price?: string;
  servingSize: string;
  macros: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  tags?: string[]; // e.g., "vegetarian", "spicy", "gluten-free"
}

export interface MenuAnalysisResult {
  restaurantName?: string;
  menuItems: MenuItem[];
}

export const analyzeRestaurantMenu = async (base64Image: string): Promise<MenuAnalysisResult> => {
  console.log('🍽️ Analyzing restaurant menu image...');
  const openai = getOpenAiInstance();
  const startTime = Date.now();
  
  // Clean base64 if it still has prefix
  let cleanBase64 = base64Image;
  if (base64Image.includes(',')) {
    cleanBase64 = base64Image.split(',')[1];
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a nutrition expert analyzing restaurant menus. Extract menu items and estimate their nutritional content based on typical restaurant portions and preparation methods.

For each item:
- Estimate portion sizes based on typical restaurant servings
- Calculate macros based on common ingredients and preparation methods
- Be realistic about restaurant portions (they're usually larger than home-cooked)
- Account for cooking oils, sauces, and hidden calories

Return a JSON object with this structure:
{
  "restaurantName": "string (if visible)",
  "menuItems": [{
    "name": "string",
    "description": "string (if available)",
    "price": "string (if visible)",
    "servingSize": "string (e.g., '1 plate', '12 oz')",
    "macros": { "calories": number, "protein": number, "carbs": number, "fat": number },
    "tags": ["string"] (e.g., "vegetarian", "high-protein", "spicy")
  }]
}`
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this restaurant menu image. Identify menu items and estimate their nutritional content. Focus on main dishes and popular items visible in the image.',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${cleanBase64}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 2000,
    });

    const apiDuration = Date.now() - startTime;
    console.log(`⏱️ Menu analysis completed in ${(apiDuration / 1000).toFixed(2)}s`);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const data = JSON.parse(content);
    console.log(`✅ Found ${data.menuItems?.length || 0} menu items`);
    
    return {
      restaurantName: data.restaurantName,
      menuItems: data.menuItems || [],
    };
  } catch (error) {
    console.error('Menu Analysis Error:', error);
    throw error;
  }
};

export const searchFoodDatabase = async (query: string): Promise<FoodItem[]> => {
  console.log('🔍 OpenAI searchFoodDatabase called with:', query);
  const startTime = Date.now();
  
  const openai = getOpenAiInstance();
  console.log('✅ OpenAI instance created');

  try {
    console.log('📡 Sending search request to OpenAI (gpt-5-mini-2025-08-07)...');
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07', // Using GPT-5 Mini
      messages: [
        {
          role: 'user',
          content: `Search for food items matching "${query}". Provide 5 distinct common variations, brands, or serving sizes (e.g. cooked vs raw, different portions).

Return a JSON object with this structure:
{
  "items": [{
    "name": string,
    "servingSize": string,
    "macros": {"calories": number, "protein": number, "carbs": number, "fat": number},
    "micros": {
      "fiber": number (g), "sugar": number (g),
      "vitaminC": number (mg), "iron": number (mg), "calcium": number (mg),
      "potassium": number (mg), "sodium": number (mg), "saturatedFat": number (g)
    }
  }]
}

Include key micronutrients where available. Omit uncertain values.`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const duration = Date.now() - startTime;
    console.log(`⏱️ OpenAI search responded in ${(duration / 1000).toFixed(2)}s`);

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    console.log('📥 Search response received:', {
      responseLength: content.length,
      preview: content.substring(0, 200)
    });

    const data = JSON.parse(content);
    console.log(`✅ Found ${data.items?.length || 0} food items`);
    
    return (data.items || []).map((item: any) => ({
      name: item.name || 'Unknown',
      servingSize: item.servingSize || 'Unknown',
      macros: {
        calories: item.macros?.calories || 0,
        protein: item.macros?.protein || 0,
        carbs: item.macros?.carbs || 0,
        fat: item.macros?.fat || 0,
      },
      micros: parseMicronutrients(item.micros),
    }));
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ OpenAI Search Error after ${(duration / 1000).toFixed(2)}s:`, error);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      status: error?.status,
    });
    throw error;
  }
};

export const getNutritionalInfoFromBarcode = async (barcode: string): Promise<FoodItem | null> => {
  // 1. Try OpenFoodFacts (Public Database) - has comprehensive micronutrients!
  try {
    console.log('Checking OpenFoodFacts for:', barcode);
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1) {
      const p = data.product;
      const n = p.nutriments;
      
      const servingSize = p.serving_size || '100g';
      
      // Macros - prefer serving values, fallback to 100g
      const cals = n['energy-kcal_serving'] || n['energy-kcal_100g'] || n['energy-kcal'] || 0;
      const prot = n['proteins_serving'] || n['proteins_100g'] || n['proteins'] || 0;
      const carbs = n['carbohydrates_serving'] || n['carbohydrates_100g'] || n['carbohydrates'] || 0;
      const fat = n['fat_serving'] || n['fat_100g'] || n['fat'] || 0;

      // Micronutrients from OpenFoodFacts
      const micros: Micronutrients = {};
      
      const getMicro = (key: string): number | undefined => {
        const val = n[`${key}_serving`] || n[`${key}_100g`] || n[key];
        return val !== undefined ? Number(val) : undefined;
      };
      
      if (getMicro('fiber') !== undefined) micros.fiber = getMicro('fiber');
      if (getMicro('sugars') !== undefined) micros.sugar = getMicro('sugars');
      if (getMicro('vitamin-a') !== undefined) micros.vitaminA = getMicro('vitamin-a');
      if (getMicro('vitamin-c') !== undefined) micros.vitaminC = getMicro('vitamin-c');
      if (getMicro('vitamin-d') !== undefined) micros.vitaminD = getMicro('vitamin-d');
      if (getMicro('vitamin-e') !== undefined) micros.vitaminE = getMicro('vitamin-e');
      if (getMicro('vitamin-k') !== undefined) micros.vitaminK = getMicro('vitamin-k');
      if (getMicro('vitamin-b6') !== undefined) micros.vitaminB6 = getMicro('vitamin-b6');
      if (getMicro('vitamin-b12') !== undefined) micros.vitaminB12 = getMicro('vitamin-b12');
      if (getMicro('folates') !== undefined) micros.folate = getMicro('folates');
      if (getMicro('calcium') !== undefined) micros.calcium = getMicro('calcium');
      if (getMicro('iron') !== undefined) micros.iron = getMicro('iron');
      if (getMicro('magnesium') !== undefined) micros.magnesium = getMicro('magnesium');
      if (getMicro('potassium') !== undefined) micros.potassium = getMicro('potassium');
      if (getMicro('sodium') !== undefined) micros.sodium = getMicro('sodium');
      if (getMicro('zinc') !== undefined) micros.zinc = getMicro('zinc');
      if (getMicro('saturated-fat') !== undefined) micros.saturatedFat = getMicro('saturated-fat');
      if (getMicro('trans-fat') !== undefined) micros.transFat = getMicro('trans-fat');
      if (getMicro('cholesterol') !== undefined) micros.cholesterol = getMicro('cholesterol');

      return {
        name: p.product_name || `Product ${barcode}`,
        servingSize: servingSize,
        macros: {
          calories: Number(cals),
          protein: Number(prot),
          carbs: Number(carbs),
          fat: Number(fat),
        },
        micros: Object.keys(micros).length > 0 ? micros : undefined,
      };
    }
  } catch (e) {
    console.warn('OpenFoodFacts Lookup Error (proceeding to fallback):', e);
  }

  // 2. Fallback: Ask OpenAI
  try {
    const openai = getOpenAiInstance();
    console.log('Falling back to OpenAI for barcode:', barcode);
    const response = await openai.chat.completions.create({
      model: 'gpt-5-mini-2025-08-07',
      messages: [
        {
          role: 'user',
          content: `Identify the food product associated with barcode "${barcode}". If recognized, return its nutritional info including micronutrients.

Return JSON: { "items": [{"name": string, "servingSize": string, "macros": {...}, "micros": {"fiber": g, "sugar": g, "sodium": mg, ...}}] }

Return empty items array if unrecognized.`,
        },
      ],
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const data = JSON.parse(content);
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      return {
        name: item.name || 'Unknown',
        servingSize: item.servingSize || 'Unknown',
        macros: {
          calories: item.macros?.calories || 0,
          protein: item.macros?.protein || 0,
          carbs: item.macros?.carbs || 0,
          fat: item.macros?.fat || 0,
        },
        micros: parseMicronutrients(item.micros),
      };
    }
  } catch (error) {
    console.error('OpenAI Barcode Fallback Error:', error);
  }

  return null;
};

// Menu item schema for structured output
const menuItemSchema = {
  type: 'object',
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Name of the menu item' },
          description: { type: 'string', description: 'Brief description if available' },
          price: { type: 'string', description: 'Price if visible (e.g., "$12.99")' },
          servingSize: { type: 'string', description: 'Estimated serving size' },
          macros: {
            type: 'object',
            properties: {
              calories: { type: 'number', description: 'Estimated calories' },
              protein: { type: 'number', description: 'Estimated protein in grams' },
              carbs: { type: 'number', description: 'Estimated carbohydrates in grams' },
              fat: { type: 'number', description: 'Estimated fat in grams' },
            },
            required: ['calories', 'protein', 'carbs', 'fat'],
          },
          category: { type: 'string', description: 'Category like Appetizers, Mains, Desserts' },
          isHealthy: { type: 'boolean', description: 'Whether this is a healthier option' },
        },
        required: ['name', 'servingSize', 'macros'],
      },
    },
    restaurantName: { type: 'string', description: 'Name of the restaurant if visible' },
    cuisineType: { type: 'string', description: 'Type of cuisine (Italian, Mexican, etc.)' },
  },
  required: ['items'],
} as const;

export interface MenuItem extends FoodItem {
  description?: string;
  price?: string;
  category?: string;
  isHealthy?: boolean;
}

// Note: analyzeMenuPhoto is deprecated, use analyzeRestaurantMenu instead

