import { FoodItem } from '../types.ts';

/**
 * Real food database service using USDA FoodData Central API
 * Free, fast, and accurate - no AI hallucinations!
 */

const USDA_API_KEY = 'DEMO_KEY'; // Free demo key, can be replaced with user's own key
const USDA_BASE_URL = 'https://api.nal.usda.gov/fdc/v1';

/**
 * Simplify verbose USDA food names to common names
 * "Rice, white, long-grain, regular, cooked" → "White Rice (cooked)"
 * Uses smart parsing of USDA comma-separated format
 */
const simplifyFoodName = (name: string): string => {
  // USDA format: "Main food, descriptor1, descriptor2, preparation"
  const parts = name.split(',').map(p => p.trim()).filter(p => p.length > 0);
  
  if (parts.length === 0) return name;
  if (parts.length === 1) return titleCase(parts[0]);
  
  const mainFood = parts[0];
  
  // Color/type descriptors that should come BEFORE the main food
  const prefixDescriptors = ['white', 'brown', 'black', 'red', 'green', 'yellow', 'wild', 
                             'whole', 'skim', 'low-fat', 'nonfat', 'fat-free', 'plain', 
                             'greek', 'regular', 'light', 'dark', 'sweet'];
  
  // Preparation methods to show in parentheses
  const preparations = ['raw', 'cooked', 'boiled', 'steamed', 'baked', 'fried', 'grilled', 
                        'roasted', 'broiled', 'sauteed', 'dried', 'canned', 'frozen'];
  
  // Words to skip (not useful to user)
  const skipWords = ['nfs', 'ns', 'unenriched', 'enriched', 'fortified', 'regular', 
                     'standard', 'commercial', 'retail', 'all varieties', 'various types'];
  
  let prefix = '';
  let preparation = '';
  const extras: string[] = [];
  
  for (let i = 1; i < parts.length && i < 4; i++) {
    const part = parts[i].toLowerCase();
    
    // Skip noise words
    if (skipWords.some(skip => part.includes(skip))) continue;
    
    // Check if it's a prefix descriptor
    if (!prefix && prefixDescriptors.some(p => part.startsWith(p))) {
      prefix = parts[i];
    }
    // Check if it's a preparation method
    else if (!preparation && preparations.some(p => part.includes(p))) {
      preparation = part;
    }
    // Keep other meaningful descriptors (limit to 1)
    else if (extras.length < 1 && part.length > 2 && part.length < 20) {
      extras.push(parts[i]);
    }
  }
  
  // Build simplified name
  let simplified = '';
  
  if (prefix) {
    simplified = `${prefix} ${mainFood}`;
  } else if (extras.length > 0) {
    simplified = `${mainFood} ${extras[0]}`;
  } else {
    simplified = mainFood;
  }
  
  // Add preparation if present
  if (preparation) {
    simplified += ` (${preparation})`;
  }
  
  return titleCase(simplified);
};

/**
 * Convert string to Title Case
 */
const titleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Check if two foods are essentially the same (for deduplication)
 * Smarter comparison that ignores minor variations
 */
const areSimilarFoods = (name1: string, name2: string): boolean => {
  // Normalize: remove prep methods, punctuation, and common suffixes
  const normalize = (s: string) => {
    return s.toLowerCase()
      .replace(/\(.*?\)/g, '') // Remove parenthetical
      .replace(/[^a-z0-9\s]/g, ' ') // Keep only alphanumeric
      .replace(/\b(cooked|raw|steamed|boiled|fried|grilled|baked|roasted)\b/g, '')
      .replace(/\b(regular|standard|plain|whole|fresh)\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };
  
  const n1 = normalize(name1);
  const n2 = normalize(name2);
  
  // Exact match after normalization
  if (n1 === n2) return true;
  
  // Check if one contains the other (handles "White Rice" vs "White Rice Long Grain")
  if (n1.length > 5 && n2.length > 5) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }
  
  return false;
};

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
 * Smart query enhancement - reorder words to match USDA format
 * USDA uses "Category, descriptor" format, so "white rice" should search as "rice white"
 */
const smartEnhanceQuery = (query: string): string => {
  const words = query.toLowerCase().trim().split(/\s+/);
  
  // If 2+ words, try both original and reversed order
  // USDA format is usually "Main food, descriptor" so "white rice" → "rice white"
  if (words.length >= 2) {
    // Common descriptors that should come AFTER the main food word
    const descriptors = ['white', 'brown', 'black', 'red', 'green', 'whole', 'skim', 'low', 'fat', 
                         'plain', 'greek', 'raw', 'cooked', 'baked', 'fried', 'grilled', 'steamed',
                         'fresh', 'frozen', 'canned', 'dried', 'sliced', 'diced', 'ground'];
    
    // Check if first word is a descriptor
    if (descriptors.includes(words[0])) {
      // Swap: "white rice" → "rice white"
      return [...words.slice(1), words[0]].join(' ');
    }
  }
  
  return query;
};

/**
 * Search USDA FoodData Central database
 * Returns verified nutrition data from official US government database
 */
export const searchFoodDatabase = async (query: string): Promise<FoodItem[]> => {
  console.log(`🔍 Searching USDA FoodData Central for: "${query}"`);
  const startTime = Date.now();
  
  // Smart query enhancement - reorder words to match USDA format
  const enhancedQuery = smartEnhanceQuery(query);
  if (enhancedQuery !== query.toLowerCase().trim()) {
    console.log(`📝 Enhanced query: "${query}" → "${enhancedQuery}"`);
  }
  
  try {
    // USDA API search endpoint
    const url = `${USDA_BASE_URL}/foods/search?query=${encodeURIComponent(enhancedQuery)}&api_key=${USDA_API_KEY}&pageSize=20&dataType=Foundation,SR%20Legacy`;
    
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
        
        // Smart scoring based on name simplicity and relevance
        
        // 1. Shorter names are usually more common/basic
        const nameWordCount = name.split(/[\s,]+/).filter(w => w.length > 0).length;
        score += Math.max(0, 50 - nameWordCount * 8); // Fewer words = higher score
        
        // 2. Query words appearing earlier in name = more relevant
        // "Rice, white" for query "rice" is better than "Flour, rice, white"
        const firstQueryWord = queryWords[0];
        const nameWords = name.toLowerCase().split(/[\s,]+/);
        const firstWordIndex = nameWords.findIndex(w => w.includes(firstQueryWord));
        if (firstWordIndex === 0) {
          score += 60; // Query word is first = very relevant
        } else if (firstWordIndex === 1) {
          score += 30;
        } else if (firstWordIndex > 2) {
          score -= 20; // Buried deep = less relevant
        }
        
        // 3. Penalize items that are NOT what user is looking for
        // If user searches "rice", penalize "rice flour", "rice milk", etc
        const queryMainFood = queryWords[queryWords.length - 1]; // Last word is usually the main food
        const derivativeIndicators = ['flour', 'oil', 'milk', 'butter', 'powder', 'extract', 'syrup', 'juice', 'sauce'];
        const isDerivative = derivativeIndicators.some(d => nameLower.includes(d));
        const queryingDerivative = derivativeIndicators.some(d => queryLower.includes(d));
        if (isDerivative && !queryingDerivative) {
          score -= 100; // User wants rice, not rice flour
        }
        
        // 4. Penalize overly specific variants
        const specificityIndicators = ['infant', 'baby', 'formula', 'supplement', 'restaurant', 'fast food', 
                                       'brand', 'homemade', 'commercial', 'industrial'];
        if (specificityIndicators.some(term => nameLower.includes(term))) {
          score -= 50;
        }
        
        // 5. Prefer cooked versions for foods that are typically cooked
        const typicallyCooked = ['rice', 'pasta', 'chicken', 'beef', 'pork', 'fish', 'egg', 'potato', 
                                  'broccoli', 'beans', 'lentils', 'oats', 'quinoa'];
        const isTypicallyCooked = typicallyCooked.some(food => queryLower.includes(food));
        if (isTypicallyCooked) {
          if (nameLower.includes('cooked') || nameLower.includes('boiled') || nameLower.includes('steamed')) {
            score += 40;
          } else if (nameLower.includes('raw') || nameLower.includes('uncooked')) {
            score -= 20;
          }
        }
        
        // Simplify the verbose USDA name
        const simplifiedName = simplifyFoodName(food.description);
        
        return {
          item: {
            name: simplifiedName,
            servingSize: '100g', // USDA defaults to 100g
            macros: {
              calories: Math.round(calories),
              protein: Math.round(protein * 10) / 10, // Round to 1 decimal
              carbs: Math.round(carbs * 10) / 10,
              fat: Math.round(fat * 10) / 10,
            },
          },
          score,
          originalName: food.description, // Keep original for dedup check
        };
      })
      .filter((result): result is { item: FoodItem; score: number; originalName: string } => result !== null);
    
    // Sort by score (highest first)
    itemsWithScore.sort((a, b) => b.score - a.score);
    
    // Deduplicate similar foods (keep highest scored one)
    const seenNames = new Set<string>();
    const deduped = itemsWithScore.filter(result => {
      const normalizedName = result.item.name.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check if we've seen a similar name
      for (const seen of seenNames) {
        if (areSimilarFoods(result.item.name, seen)) {
          return false; // Skip this duplicate
        }
      }
      
      seenNames.add(result.item.name);
      return true;
    });
    
    // Take top 8 unique items
    const items = deduped.slice(0, 8).map(result => result.item);
    
    console.log(`✅ Found ${items.length} food items from USDA (simplified & deduped)`);
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

