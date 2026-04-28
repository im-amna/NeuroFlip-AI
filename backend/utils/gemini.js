import dotenv from 'dotenv';
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

if (!process.env.GEMINI_API_KEY) {
  console.error('WARNING: GEMINI_API_KEY is not set. AI features will not work.');
}

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
    medium: '30–60 minutes',
    long: 'over 60 minutes'
  };

  const prompt = `Generate a detailed recipe with the following requirements:

Ingredients available: ${ingredients.join(', ')}
${dietaryInfo}
Cuisine type: ${cuisineType}
Servings: ${servings}
Cooking time: ${timeGuide[cookingTime] || 'any'}

Please provide a complete recipe in the following JSON format (return ONLY valid JSON, no markdown):
{ ... }`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate recipe. Please try again.');
  }
};

export const generatePantrySuggestions = async (pantryItems, expiringItems = []) => {
  const pantryNames = pantryItems.map(item => item.name).join(', ');
  const expiringNames = expiringItems.length > 0 ? expiringItems.join(', ') : '';

  const prompt = `Ingredients available: ${pantryNames}
${expiringNames ? `Expiring soon: ${expiringNames}` : ''}

Suggest 3 creative recipe ideas that use these ingredients.
Return ONLY a JSON array of strings (no markdown): ["Recipe idea 1", "Recipe idea 2", "Recipe idea 3"]`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Gemini API error:', error);
    throw new Error('Failed to generate suggestions');
  }
};

export const generateCookingTips = async (recipe) => {
  const prompt = `For this recipe: "${recipe.name}"
Ingredients: ${recipe.ingredients?.map(i => i.name).join(', ') || 'N/A'}
Provide 3-5 helpful cooking tips. Return ONLY a JSON array of strings (no markdown).`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    let jsonText = response.text.trim();
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?$/g, '');
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```\n?/g, '');
    }

    return JSON.parse(jsonText);
  } catch (error) {
    console.error('Gemini API error:', error);
    return ['Cook with love and patience!'];
  }
};

export default {
  generateRecipe,
  generatePantrySuggestions,
  generateCookingTips
};
