import PantryItem from '../models/PantryItem.js';
import db from '../config/db.js';

/**
 * Get all pantry items
 */
export const getPantryItems = async (req, res, next) => {
  try {
    const { category, is_running_low, search } = req.query;

    const items = await PantryItem.findByUserId(req.user.id, {
      category,
      is_running_low: is_running_low === 'true' ? true : undefined,
      search
    });

    res.json({
      success: true,
      data: { items }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get pantry stats
 */
export const getPantryStats = async (req, res, next) => {
  try {
    const stats = await PantryItem.getStats(req.user.id);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get items expiring soon
 */
export const getExpiringSoon = async (req, res, next) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const items = await PantryItem.getExpiringSoon(req.user.id, days);

    res.json({
      success: true,
      data: { items }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add pantry item
 */
export const addPantryItem = async (req, res, next) => {
  try {
    const item = await PantryItem.create(req.user.id, req.body);

    res.status(201).json({
      success: true,
      message: 'Item added to pantry',
      data: { item }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update pantry item
 */
export const updatePantryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await PantryItem.update(id, req.user.id, req.body);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Pantry item not found'
      });
    }

    res.json({
      success: true,
      message: 'Pantry item updated',
      data: { item }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete pantry item
 */
export const deletePantryItem = async (req, res, next) => {
  try {
    const { id } = req.params;
    const item = await PantryItem.delete(id, req.user.id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: 'Pantry item not found'
      });
    }

    res.json({
      success: true,
      message: 'Pantry item deleted',
      data: { item }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add checked shopping list items to pantry ✅ NEW
 */
export const addFromShoppingList = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get all checked shopping list items
    const checkedItems = await db.query(
      'SELECT * FROM shopping_list_items WHERE user_id = $1 AND is_checked = true',
      [userId]
    );

    if (checkedItems.rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No checked items found'
      });
    }

    // Add each to pantry
    const addedItems = [];
    for (const item of checkedItems.rows) {
      const pantryItem = await PantryItem.create(userId, {
        name: item.ingredient_name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category || 'Uncategorized',
      });
      addedItems.push(pantryItem);
    }

    // Delete checked items from shopping list
    await db.query(
      'DELETE FROM shopping_list_items WHERE user_id = $1 AND is_checked = true',
      [userId]
    );

    res.json({
      success: true,
      message: `${addedItems.length} items added to pantry`,
      data: { items: addedItems }
    });
  } catch (error) {
    next(error);
  }
};