import { FoodItem } from '../types.ts';

/**
 * Real food database service using USDA FoodData Central API
 * Free, fast, and accurate - no AI hallucinations!
 */

const USDA_API_KEY = 'DEMO_KEY'; // Free demo key, can be replaced with user's own key
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

interface USDASearchResult {
  foods: Array<{
    fdcId: number;
    description: string;
    foodNutrients?: Array<{
      nutrientId: number;
      nutrientName: string;
      value: number;
      unitName: string;
    }>;
  }>;
}

/**
 * Search USDA FoodData Central database
 * Returns verified nutrition data from official US government database
 */
export const searchFoodDatabase = async (query: string): Promise<FoodItem[]> => {
  console.log(`🔍 Searching USDA FoodData Central for: "${query}"`);
  const startTime = Date.now();
  
  try {
    // USDA API search endpoint
    const url = `${USDA_BASE_URL}/foods/search?query=${encodeURIComponent(query)}&api_key=${USDA_API_KEY}&pageSize=10&dataType=Foundation,SR%20Legacy`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`USDA API error: ${response.status} ${response.statusText}`);
    }
    
    const data: USDASearchResult = await response.json();
    const duration = Date.now() - startTime;
    console.log(`⏱️ USDA search responded in ${duration}ms`);
    
    if (!data.foods || data.foods.length === 0) {
      console.log('No results from USDA, trying OpenFoodFacts...');
      return await searchOpenFoodFacts(query);
    }
    
    // Convert USDA format to our FoodItem format with relevance scoring
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    
    const itemsWithScore: Array<{ item: FoodItem; score: number }> = data.foods
      .filter(food => food.foodNutrients && food.foodNutrients.length > 0)
      .map(food => {
        const nutrients = food.foodNutrients!;
        
        // Extract macros from nutrients
        // USDA nutrient IDs: 1008=Energy (kcal), 1003=Protein, 1005=Carbs, 1004=Fat
        const getNutrient = (id: number) => {
          const nutrient = nutrients.find(n => n.nutrientId === id);
          return nutrient ? Number(nutrient.value) || 0 : 0;
        };
        
        const calories = getNutrient(1008); // Energy (kcal)
        const protein = getNutrient(1003); // Protein
        const carbs = getNutrient(1005); // Carbohydrates
        const fat = getNutrient(1004); // Fat
        
        // Skip if no meaningful nutrition data
        if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
          return null;
        }
        
        const name = food.description;
        const nameLower = name.toLowerCase();
        
        // Calculate relevance score
        let score = 0;
        
        // Exact match (highest priority)
        if (nameLower === queryLower) {
          score += 1000;
        }
        // Starts with query
        else if (nameLower.startsWith(queryLower)) {
          score += 500;
        }
        // Contains query as whole phrase
        else if (nameLower.includes(queryLower)) {
          score += 300;
        }
        // Contains all query words
        else if (queryWords.every(word => nameLower.includes(word))) {
          score += 200;
        }
        // Contains some query words
        else {
          const matchingWords = queryWords.filter(word => nameLower.includes(word)).length;
          score += matchingWords * 50;
        }
        
        // Boost common foods (shorter names often = more common)
        if (name.length < 30) {
          score += 20;
        }
        
        // Penalize very long names (often less relevant)
        if (name.length > 60) {
          score -= 30;
        }
        
        // Penalize generic terms
        const genericTerms = ['raw', 'uncooked', 'prepared', 'cooked', 'without', 'with', 'and'];
        if (genericTerms.some(term => nameLower.includes(term))) {
          score -= 10;
        }
        
        return {
          item: {
            name: food.description,
            servingSize: '100g', // USDA defaults to 100g
            macros: {
              calories: Math.round(calories),
              protein: Math.round(protein * 10) / 10, // Round to 1 decimal
              carbs: Math.round(carbs * 10) / 10,
              fat: Math.round(fat * 10) / 10,
            },
          },
          score,
        };
      })
      .filter((result): result is { item: FoodItem; score: number } => result !== null);
    
    // Sort by score (highest first) and take top 8
    const items = itemsWithScore
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(result => result.item);
    
    console.log(`✅ Found ${items.length} food items from USDA`);
    return items;
  } catch (error: any) {
    console.error('❌ USDA search error:', error);
    // Fallback to OpenFoodFacts
    console.log('Falling back to OpenFoodFacts...');
    return await searchOpenFoodFacts(query);
  }
};

/**
 * Fallback: Search OpenFoodFacts database
 * Used when USDA doesn't have results or fails
 */
const searchOpenFoodFacts = async (query: string): Promise<FoodItem[]> => {
  console.log(`🔍 Searching OpenFoodFacts for: "${query}"`);
  const startTime = Date.now();
  
  try {
    // OpenFoodFacts search API
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=10`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`OpenFoodFacts API error: ${response.status}`);
    }
    
    const data = await response.json();
    const duration = Date.now() - startTime;
    console.log(`⏱️ OpenFoodFacts search responded in ${duration}ms`);
    
    if (!data.products || data.products.length === 0) {
      console.log('No results from OpenFoodFacts');
      return [];
    }
    
    // Convert OpenFoodFacts format to our FoodItem format with relevance scoring
    const queryLower = query.toLowerCase().trim();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 0);
    
    const itemsWithScore: Array<{ item: FoodItem; score: number }> = data.products
      .filter((product: any) => product.nutriments)
      .map((product: any) => {
        const n = product.nutriments;
        const servingSize = product.serving_size || '100g';
        
        // Extract macros (OpenFoodFacts uses different keys)
        const calories = n['energy-kcal_100g'] || n['energy-kcal'] || 0;
        const protein = n['proteins_100g'] || n['proteins'] || 0;
        const carbs = n['carbohydrates_100g'] || n['carbohydrates'] || 0;
        const fat = n['fat_100g'] || n['fat'] || 0;
        
        // Skip if no meaningful nutrition data
        if (calories === 0 && protein === 0 && carbs === 0 && fat === 0) {
          return null;
        }
        
        const name = product.product_name || product.product_name_en || query;
        const nameLower = name.toLowerCase();
        
        // Calculate relevance score
        let score = 0;
        
        // Exact match (highest priority)
        if (nameLower === queryLower) {
          score += 1000;
        }
        // Starts with query
        else if (nameLower.startsWith(queryLower)) {
          score += 500;
        }
        // Contains query as whole phrase
        else if (nameLower.includes(queryLower)) {
          score += 300;
        }
        // Contains all query words
        else if (queryWords.every(word => nameLower.includes(word))) {
          score += 200;
        }
        // Contains some query words
        else {
          const matchingWords = queryWords.filter(word => nameLower.includes(word)).length;
          score += matchingWords * 50;
        }
        
        // Boost products with better data quality (has all macros)
        if (calories > 0 && protein > 0 && carbs > 0 && fat > 0) {
          score += 30;
        }
        
        // Boost products with popularity score (if available)
        if (product.popularity_tags && product.popularity_tags.length > 0) {
          score += 20;
        }
        
        // Penalize very long names
        if (name.length > 60) {
          score -= 30;
        }
        
        return {
          item: {
            name: name,
            servingSize: servingSize,
            macros: {
              calories: Math.round(calories),
              protein: Math.round(protein * 10) / 10,
              carbs: Math.round(carbs * 10) / 10,
              fat: Math.round(fat * 10) / 10,
            },
          },
          score,
        };
      })
      .filter((result): result is { item: FoodItem; score: number } => result !== null);
    
    // Sort by score (highest first) and take top 8
    const items = itemsWithScore
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(result => result.item);
    
    console.log(`✅ Found ${items.length} food items from OpenFoodFacts`);
    return items;
  } catch (error: any) {
    console.error('❌ OpenFoodFacts search error:', error);
    return [];
  }
};

/**
 * Get detailed nutrition info for a specific food ID (USDA)
 * Useful for getting different serving sizes
 */
export const getFoodDetails = async (fdcId: number): Promise<FoodItem | null> => {
  try {
    const url = `${USDA_BASE_URL}/food/${fdcId}?api_key=${USDA_API_KEY}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      return null;
    }
    
    const food = await response.json();
    
    if (!food.foodNutrients || food.foodNutrients.length === 0) {
      return null;
    }
    
    const nutrients = food.foodNutrients;
    const getNutrient = (id: number) => {
      const nutrient = nutrients.find((n: any) => n.nutrient.id === id);
      return nutrient ? Number(nutrient.amount) || 0 : 0;
    };
    
    return {
      name: food.description,
      servingSize: '100g',
      macros: {
        calories: Math.round(getNutrient(1008)),
        protein: Math.round(getNutrient(1003) * 10) / 10,
        carbs: Math.round(getNutrient(1005) * 10) / 10,
        fat: Math.round(getNutrient(1004) * 10) / 10,
      },
    };
  } catch (error) {
    console.error('Error fetching food details:', error);
    return null;
  }
};

