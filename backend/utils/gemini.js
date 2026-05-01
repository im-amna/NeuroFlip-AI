import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";

dotenv.config();

if (!process.env.GEMINI_API_KEY) {
  console.error('WARNING: GEMINI_API_KEY is not set. AI features will not work.');
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

/**
 * Helper: Safely extract text from Gemini response
 */
const extractText = (response) => {
  const text =
    response?.candidates?.[0]?.content?.parts?.[0]?.text ??
    response?.text;

  if (!text || typeof text !== 'string') {
    console.error("Full Gemini response:", JSON.stringify(response, null, 2));
    throw new Error("No text returned from Gemini");
  }

  return text.trim();
};

/**
 * Helper: Clean markdown wrappers
 */
const cleanJSON = (text) => {
  return text
    .replace(/```json\n?/g, '')
    .replace(/```\n?/g, '')
    .trim();
};

/**
 * Helper: Safe JSON parse
 */
const safeParse = (text) => {
  try {
    return JSON.parse(text);
  } catch (err) {
    console.error("JSON Parse Error. Raw text:\n", text);
    throw new Error("Invalid JSON returned from AI");
  }
};

/**
 * Helper: Convert fraction strings to decimal numbers
 * e.g. "1/2" => "0.5", "1-2" => "1", "1 1/2" => "1.5"
 * Returns a string representation safe for numeric DB columns.
 */
const fractionToDecimal = (value) => {
  if (value === null || value === undefined) return null;

  const str = String(value).trim();

  // Already a plain number
  if (!isNaN(str) && str !== '') return String(parseFloat(str));

  // Range like "1-2" => take the lower bound
  if (/^\d+\s*-\s*\d+$/.test(str)) {
    return String(parseInt(str));
  }

  // Mixed number like "1 1/2"
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = parseInt(mixed[1]);
    const num = parseInt(mixed[2]);
    const den = parseInt(mixed[3]);
    return String(whole + num / den);
  }

  // Simple fraction like "1/2"
  const fraction = str.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    const num = parseInt(fraction[1]);
    const den = parseInt(fraction[2]);
    return String(num / den);
  }

  // Extract first number as fallback (e.g. "2-3 cloves" => "2")
  const firstNum = str.match(/[\d.]+/);
  if (firstNum) return String(parseFloat(firstNum[0]));

  // Can't parse — return null so DB does not choke
  return null;
};

/**
 * Generate Recipe
 */
export const generateRecipe = async ({
  ingredients,
  dietaryRestrictions = [],
  cuisineType = 'any',
  servings = 4,
  cookingTime = 'medium'
}) => {
  const dietaryInfo = dietaryRestrictions.length > 0
    ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}`
    : 'No dietary restrictions';

  const timeGuide = {
    quick: 'under 30 minutes',
    medium: '30-60 minutes',
    long: 'over 60 minutes'
  };

  const prompt = `Generate a detailed recipe and return ONLY raw JSON, no markdown, no explanation, no extra text.

Ingredients available: ${ingredients.join(', ')}
${dietaryInfo}
Cuisine type: ${cuisineType}
Servings: ${servings}
Cooking time: ${timeGuide[cookingTime] || 'any'}

Return exactly this JSON structure:
{
  "name": "Recipe Name",
  "description": "Brief description",
  "cuisine_type": "cuisine name",
  "difficulty": "easy",
  "prep_time": 15,
  "cook_time": 30,
  "total_time": 45,
  "servings": 4,
  "dietary_tags": ["vegetarian"],
  "instructions": ["Step 1 description", "Step 2 description"],
  "ingredients": [
    { "name": "ingredient name", "quantity": "1", "unit": "cup" }
  ],
  "nutrition": {
    "calories": 300,
    "protein": 10,
    "carbs": 40,
    "fats": 10,
    "fiber": 5
  },
  "user_notes": "cooking tips here"
}

All time fields must be plain integers (minutes). Servings must be a plain integer.
IMPORTANT: All ingredient quantities must be plain decimal numbers (e.g. 0.5, 1, 2.5). Never use fractions like "1/2" or ranges like "1-2".`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = extractText(response);
    text = cleanJSON(text);

    const recipe = safeParse(text);

    if (!recipe.name) {
      throw new Error('Invalid recipe format returned from AI');
    }

    // Sanitize time and serving fields
    recipe.servings = typeof recipe.servings === 'string'
      ? parseInt(recipe.servings.match(/\d+/)?.[0]) || servings
      : Math.round(recipe.servings) || servings;

    recipe.prep_time = typeof recipe.prep_time === 'string'
      ? parseInt(recipe.prep_time.match(/\d+/)?.[0]) || null
      : recipe.prep_time || null;

    recipe.cook_time = typeof recipe.cook_time === 'string'
      ? parseInt(recipe.cook_time.match(/\d+/)?.[0]) || null
      : recipe.cook_time || null;

    recipe.total_time = typeof recipe.total_time === 'string'
      ? parseInt(recipe.total_time.match(/\d+/)?.[0]) || null
      : recipe.total_time || null;

    // Sanitize ingredient quantities — convert fractions/ranges to decimals
    if (Array.isArray(recipe.ingredients)) {
      recipe.ingredients = recipe.ingredients.map(ing => ({
        ...ing,
        quantity: fractionToDecimal(ing.quantity),
      }));
    }

    if (recipe.nutrition) {
      Object.keys(recipe.nutrition).forEach(key => {
        if (typeof recipe.nutrition[key] === 'string') {
          recipe.nutrition[key] = parseFloat(recipe.nutrition[key]) || null;
        }
      });
    }

    console.log('Recipe generated successfully:', recipe.name);
    return recipe;

  } catch (error) {
    console.error('Gemini Recipe Error:', error.message);
    throw new Error(error.message || 'Failed to generate recipe');
  }
};

/**
 * Pantry Suggestions
 */
export const generatePantrySuggestions = async (pantryItems, expiringItems = []) => {
  const pantryNames = pantryItems.map(item => item.name).join(', ');
  const expiringNames = expiringItems.length ? expiringItems.join(', ') : '';

  const prompt = `I have these ingredients: ${pantryNames}
${expiringNames ? `These are expiring soon: ${expiringNames}` : ''}

Suggest 5 meal ideas I can make. Return ONLY a JSON array of strings, no markdown:
["Meal idea 1", "Meal idea 2", "Meal idea 3", "Meal idea 4", "Meal idea 5"]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = extractText(response);
    text = cleanJSON(text);

    return safeParse(text);

  } catch (error) {
    console.error('Pantry Suggestions Error:', error.message);
    throw new Error('Failed to generate suggestions');
  }
};

/**
 * Cooking Tips
 */
export const generateCookingTips = async (recipe) => {
  const prompt = `Give 5 cooking tips for this recipe: ${recipe.name}
Ingredients used: ${recipe.ingredients?.map(i => i.name).join(', ') || 'N/A'}

Return ONLY a JSON array of strings, no markdown:
["Tip 1", "Tip 2", "Tip 3", "Tip 4", "Tip 5"]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let text = extractText(response);
    text = cleanJSON(text);

    return safeParse(text);

  } catch (error) {
    console.error('Cooking Tips Error:', error.message);
    return ['Cook with patience and taste as you go!'];
  }
};

export default {
  generateRecipe,
  generatePantrySuggestions,
  generateCookingTips
};