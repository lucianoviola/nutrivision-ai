import { GoogleGenAI, Type } from "@google/genai";
import { FoodItem } from "../types.ts";

// Helper to get key from multiple sources (Env or LocalStorage)
const getApiKey = () => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('nutrivision_api_key');
    if (stored) return stored;
  }
  if (typeof process !== 'undefined' && process.env.API_KEY) {
    return process.env.API_KEY;
  }
  return '';
};

// We create a function to get the AI instance because the key might change at runtime
const getAiInstance = () => {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
};

// Schema for the response
const foodAnalysisSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Name of the food item" },
          servingSize: { type: Type.STRING, description: "Estimated serving size (e.g., 100g, 1 cup)" },
          macros: {
            type: Type.OBJECT,
            properties: {
              calories: { type: Type.NUMBER, description: "Calories in kcal" },
              protein: { type: Type.NUMBER, description: "Protein in grams" },
              carbs: { type: Type.NUMBER, description: "Carbohydrates in grams" },
              fat: { type: Type.NUMBER, description: "Fat in grams" },
            },
            required: ["calories", "protein", "carbs", "fat"],
          },
        },
        required: ["name", "servingSize", "macros"],
      },
    },
  },
  required: ["items"],
};

export const analyzeFoodImage = async (base64Image: string): Promise<FoodItem[]> => {
  const ai = getAiInstance();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview", // Using Gemini 3 Pro for advanced reasoning
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          {
            text: "Analyze this image. If it contains food, identify each item, estimate the portion size, and calculate the nutritional values. If it is a barcode, read the barcode and identify the product associated with it and its nutritional values. Return a JSON object."
          }
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: foodAnalysisSchema,
        thinkingConfig: { thinkingBudget: 1024 } // Utilizing thinking for better accuracy on complex plates
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    return data.items || [];
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};

export const searchFoodDatabase = async (query: string): Promise<FoodItem[]> => {
  const ai = getAiInstance();

  try {
    // Request multiple options to give the user a choice
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Search for food items matching "${query}". Provide 5 distinct common variations, brands, or serving sizes (e.g. cooked vs raw, different portions). Return them as a list of items.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: foodAnalysisSchema,
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    return data.items || [];
  } catch (error) {
    console.error("Gemini Search Error:", error);
    throw error;
  }
};

export const getNutritionalInfoFromBarcode = async (barcode: string): Promise<FoodItem | null> => {
  // 1. Try OpenFoodFacts (Public Database)
  try {
    console.log("Checking OpenFoodFacts for:", barcode);
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);
    const data = await response.json();

    if (data.status === 1) {
       const p = data.product;
       const n = p.nutriments;
       
       const servingSize = p.serving_size || "100g";
       
       // OFF keys can vary. Prioritize 'serving' values, fallback to '100g', then standard keys.
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
           fat: Number(fat)
         }
       };
    }
  } catch (e) {
    console.warn("OpenFoodFacts Lookup Error (proceeding to fallback):", e);
  }

  // 2. Fallback: Ask Gemini (Broader Generic Database)
  try {
    const ai = getAiInstance();
    console.log("Falling back to Gemini for barcode:", barcode);
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: `Identify the food product associated with the barcode number "${barcode}". 
                 If you can identify it with high confidence, return its name, standard serving size, and estimated nutritional macros. 
                 If you do not recognize the barcode, return an empty list of items.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: foodAnalysisSchema,
      },
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    
    if (data.items && data.items.length > 0) {
      return data.items[0];
    }
  } catch (error) {
    console.error("Gemini Barcode Fallback Error:", error);
  }

  return null;
};