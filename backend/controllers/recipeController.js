import Recipe from '../models/Recipe.js';
import PantryItem from '../models/PantryItem.js';
import { generateRecipe as generateRecipeAI, generatePantrySuggestions as generatePantrySuggestionsAI } from '../utils/gemini.js';

/**
 * Helper: "2 to 4" / "2-4" / "4" → integer
 */
const parseServings = (servings) => {
  if (!servings) return 1;
  if (typeof servings === 'number') return Math.round(servings);
  if (typeof servings === 'string') {
    const match = servings.match(/\d+/);
    return match ? parseInt(match[0]) : 1;
  }
  return 1;
};

/**
 * Helper: "45 minutes" / "1 hour" / "45" → integer (minutes)
 */
const parseCookTime = (cookTime) => {
  if (!cookTime) return null;
  if (typeof cookTime === 'number') return Math.round(cookTime);
  if (typeof cookTime === 'string') {
    const match = cookTime.match(/\d+/);
    return match ? parseInt(match[0]) : null;
  }
  return null;
};

/**
 * Generate recipe using AI
 */
export const generateRecipe = async (req, res, next) => {
  try {
    const {
      ingredients = [],
      usePantryIngredients = false,
      dietaryRestrictions = [],
      cuisineType = 'any',
      servings = 4,
      cookingTime = 'medium'
    } = req.body;

    let finalIngredients = [...ingredients];

    // Add pantry ingredients if requested
    if (usePantryIngredients) {
      const pantryItems = await PantryItem.findByUserId(req.user.id);
      const pantryIngredientNames = pantryItems.map(item => item.name);
      finalIngredients = [...new Set([...finalIngredients, ...pantryIngredientNames])];
    }

    if (finalIngredients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide at least one ingredient'
      });
    }

    console.log('Generating recipe for ingredients:', finalIngredients);

    // Generate recipe using Gemini AI
    const recipe = await generateRecipeAI({
      ingredients: finalIngredients,
      dietaryRestrictions,
      cuisineType,
      servings,
      cookingTime
    });

    res.json({
      success: true,
      message: 'Recipe generated successfully',
      data: { recipe }
    });

  } catch (error) {
    console.error('Generate Recipe Controller Error:', error.message);
    next(error);
  }
};

/**
 * Get smart pantry suggestions
 */
export const getPantrySuggestions = async (req, res, next) => {
  try {
    const pantryItems = await PantryItem.findByUserId(req.user.id);
    const expiringItems = await PantryItem.getExpiringSoon(req.user.id, 7);
    const expiringNames = expiringItems.map(item => item.name);

    const suggestions = await generatePantrySuggestionsAI(pantryItems, expiringNames);

    res.json({
      success: true,
      data: { suggestions }
    });
  } catch (error) {
    console.error('Pantry Suggestions Controller Error:', error.message);
    next(error);
  }
};

/**
 * Save recipe
 */
export const saveRecipe = async (req, res, next) => {
  try {
    console.log('Save recipe request body:', JSON.stringify(req.body, null, 2));

    const recipeData = {
      ...req.body,
      servings: parseServings(req.body.servings),
      cook_time: parseCookTime(req.body.cook_time),
      prep_time: parseCookTime(req.body.prep_time),
      total_time: parseCookTime(req.body.total_time),
    };

    const recipe = await Recipe.create(req.user.id, recipeData);

    res.status(201).json({
      success: true,
      message: 'Recipe saved successfully',
      data: { recipe }
    });
  } catch (error) {
    console.error('Save Recipe Controller Error:', error.message);
    next(error);
  }
};

/**
 * Get all recipes
 */
export const getRecipes = async (req, res, next) => {
  try {
    const {
      search,
      cuisine_type,
      difficulty,
      dietary_tag,
      max_cook_time,
      sort_by,
      sort_order,
      limit,
      offset
    } = req.query;

    const recipes = await Recipe.findByUserId(req.user.id, {
      search,
      cuisine_type,
      difficulty,
      dietary_tag,
      max_cook_time: max_cook_time ? parseInt(max_cook_time) : undefined,
      sort_by,
      sort_order,
      limit: limit ? parseInt(limit) : undefined,
      offset: offset ? parseInt(offset) : undefined
    });

    res.json({
      success: true,
      data: { recipes }
    });
  } catch (error) {
    console.error('Get Recipes Controller Error:', error.message);
    next(error);
  }
};

/**
 * Get recent recipes
 */
export const getRecentRecipes = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 5;
    const recipes = await Recipe.getRecent(req.user.id, limit);

    res.json({
      success: true,
      data: { recipes }
    });
  } catch (error) {
    console.error('Get Recent Recipes Controller Error:', error.message);
    next(error);
  }
};

/**
 * Get recipe by ID
 */
export const getRecipeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.findById(id, req.user.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    res.json({
      success: true,
      data: { recipe }
    });
  } catch (error) {
    console.error('Get Recipe By ID Controller Error:', error.message);
    next(error);
  }
};

/**
 * Update recipe
 */
export const updateRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.update(id, req.user.id, req.body);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    res.json({
      success: true,
      message: 'Recipe updated successfully',
      data: { recipe }
    });
  } catch (error) {
    console.error('Update Recipe Controller Error:', error.message);
    next(error);
  }
};

/**
 * Delete recipe
 */
export const deleteRecipe = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipe = await Recipe.delete(id, req.user.id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    res.json({
      success: true,
      message: 'Recipe deleted successfully',
      data: { recipe }
    });
  } catch (error) {
    console.error('Delete Recipe Controller Error:', error.message);
    next(error);
  }
};

/**
 * Get recipe stats
 */
export const getRecipeStats = async (req, res, next) => {
  try {
    const stats = await Recipe.getStats(req.user.id);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get Recipe Stats Controller Error:', error.message);
    next(error);
  }
};