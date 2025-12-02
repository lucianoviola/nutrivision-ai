import OpenAI from 'openai';
import { FoodItem } from '../types.ts';

// Helper to get OpenAI API key from multiple sources
const getOpenAiApiKey = () => {
  // 1. Check localStorage (user-set in Settings UI)
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('nutrivision_openai_api_key');
    if (stored) return stored;
  }
  
  // 2. Check Vite environment variable
  if (import.meta.env.VITE_OPENAI_API_KEY) {
    return import.meta.env.VITE_OPENAI_API_KEY;
  }
  
  // 3. Fallback to process.env
  if (typeof process !== 'undefined' && process.env.OPENAI_API_KEY) {
    return process.env.OPENAI_API_KEY;
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

export const analyzeFoodImage = async (base64Image: string): Promise<FoodItem[]> => {
  console.log('🔑 Getting OpenAI API instance...');
  const openai = getOpenAiInstance();
  console.log('✅ OpenAI instance created');

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
              text: 'Analyze this image. If it contains food, identify each item, estimate the portion size, and calculate the nutritional values. If it is a barcode, read the barcode and identify the product associated with it and its nutritional values. Return a JSON object with the structure: { "items": [{"name": string, "servingSize": string, "macros": {"calories": number, "protein": number, "carbs": number, "fat": number}}] }',
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: 'json_object' },
      // Note: gpt-5-mini doesn't support custom temperature
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
    return data.items || [];
  } catch (error) {
    console.error('OpenAI Analysis Error:', error);
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
          content: `Search for food items matching "${query}". Provide 5 distinct common variations, brands, or serving sizes (e.g. cooked vs raw, different portions). Return a JSON object with the structure: { "items": [{"name": string, "servingSize": string, "macros": {"calories": number, "protein": number, "carbs": number, "fat": number}}] }`,
        },
      ],
      response_format: { type: 'json_object' },
      // Note: gpt-5-mini doesn't support custom temperature
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
    return data.items || [];
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
  // 1. Try OpenFoodFacts (Public Database)
  try {
    console.log('Checking OpenFoodFacts for:', barcode);
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1) {
      const p = data.product;
      const n = p.nutriments;
      
      const servingSize = p.serving_size || '100g';
      
      const cals = n['energy-kcal_serving'] || n['energy-kcal_100g'] || n['energy-kcal'] || 0;
      const prot = n['proteins_serving'] || n['proteins_100g'] || n['proteins'] || 0;
      const carbs = n['carbohydrates_serving'] || n['carbohydrates_100g'] || n['carbohydrates'] || 0;
      const fat = n['fat_serving'] || n['fat_100g'] || n['fat'] || 0;

      return {
        name: p.product_name || `Product ${barcode}`,
        servingSize: servingSize,
        macros: {
          calories: Number(cals),
          protein: Number(prot),
          carbs: Number(carbs),
          fat: Number(fat),
        },
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
      model: 'gpt-5-mini-2025-08-07', // Using GPT-5 Mini
      messages: [
        {
          role: 'user',
          content: `Identify the food product associated with the barcode number "${barcode}". If you can identify it with high confidence, return its name, standard serving size, and estimated nutritional macros. If you do not recognize the barcode, return an empty list of items. Return a JSON object with the structure: { "items": [{"name": string, "servingSize": string, "macros": {"calories": number, "protein": number, "carbs": number, "fat": number}}] }`,
        },
      ],
      response_format: { type: 'json_object' },
      // Note: gpt-5-mini doesn't support custom temperature
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    const data = JSON.parse(content);
    
    if (data.items && data.items.length > 0) {
      return data.items[0];
    }
  } catch (error) {
    console.error('OpenAI Barcode Fallback Error:', error);
  }

  return null;
};

