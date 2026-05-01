import db from '../config/db.js';

// Helper: parse numeric values safely
const parseNum = (val, fallback = null) => {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'number') return isNaN(val) ? fallback : Math.round(val);
  if (typeof val === 'string') {
    const match = val.match(/[\d.]+/);
    return match ? parseFloat(match[0]) : fallback;
  }
  return fallback;
};

// Helper: convert fraction strings like "1/2", "1-2", "1 1/2" to decimal strings
const fractionToDecimal = (value) => {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  if (!isNaN(str) && str !== '') return String(parseFloat(str));
  if (/^\d+\s*-\s*\d+$/.test(str)) return String(parseInt(str));
  const mixed = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return String(parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]));
  const fraction = str.match(/^(\d+)\/(\d+)$/);
  if (fraction) return String(parseInt(fraction[1]) / parseInt(fraction[2]));
  const firstNum = str.match(/[\d.]+/);
  if (firstNum) return String(parseFloat(firstNum[0]));
  return null;
};

class Recipe {
  static async create(userId, recipeData) {
    const client = await db.pool.connect();

    try {
      await client.query('BEGIN');

      const {
        name,
        description,
        cuisine_type,
        difficulty,
        instructions,
        dietary_tags = [],
        user_notes,
        image_url,
        ingredients = [],
        nutrition = {}
      } = recipeData;

      const prep_time = parseNum(recipeData.prep_time);
      const cook_time = parseNum(recipeData.cook_time);
      const total_time = parseNum(recipeData.total_time);
      const servings   = parseNum(recipeData.servings, 1);

      const recipeResult = await client.query(
        `INSERT INTO recipes
        (user_id, name, description, cuisine_type, difficulty, prep_time, cook_time, servings, instructions, dietary_tags, user_notes, image_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          userId,
          name,
          description,
          cuisine_type,
          difficulty,
          prep_time,
          cook_time,
          servings,
          JSON.stringify(instructions),
          dietary_tags,
          user_notes,
          image_url
        ]
      );

      const recipe = recipeResult.rows[0];

      // ✅ FIXED: Correct parameterized query for multiple ingredients
      if (ingredients.length > 0) {
        const placeholders = [];
        const params = [];
        let paramIdx = 1;

        for (const ing of ingredients) {
          placeholders.push(`($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3})`);
          params.push(
            recipe.id,
            ing.name,
            fractionToDecimal(ing.quantity), // sanitize here too as safety net
            ing.unit || ''
          );
          paramIdx += 4;
        }

        await client.query(
          `INSERT INTO recipe_ingredients (recipe_id, ingredient_name, quantity, unit)
           VALUES ${placeholders.join(',')}`,
          params
        );
      }

      // Nutrition insert
      if (nutrition && Object.keys(nutrition).length > 0) {
        const calories = parseNum(nutrition.calories);
        const protein  = parseNum(nutrition.protein);
        const carbs    = parseNum(nutrition.carbs);
        const fats     = parseNum(nutrition.fats);
        const fiber    = parseNum(nutrition.fiber);

        try {
          await client.query(
            `INSERT INTO recipe_nutrition (recipe_id, calories, protein, carbs, fats, fiber)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [recipe.id, calories, protein, carbs, fats, fiber]
          );
        } catch (err) {
          if (err.message.includes('fiber')) {
            await client.query(
              `INSERT INTO recipe_nutrition (recipe_id, calories, protein, carbs, fats)
               VALUES ($1, $2, $3, $4, $5)`,
              [recipe.id, calories, protein, carbs, fats]
            );
          } else {
            throw err;
          }
        }
      }

      await client.query('COMMIT');
      return await this.findById(recipe.id, userId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  static async findById(id, userId) {
    const recipeResult = await db.query(
      'SELECT * FROM recipes WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (recipeResult.rows.length === 0) return null;

    const recipe = recipeResult.rows[0];

    const ingredientsResult = await db.query(
      'SELECT ingredient_name AS name, quantity, unit FROM recipe_ingredients WHERE recipe_id = $1',
      [id]
    );

    let nutritionResult;
    try {
      nutritionResult = await db.query(
        'SELECT calories, protein, carbs, fats, fiber FROM recipe_nutrition WHERE recipe_id = $1',
        [id]
      );
    } catch (err) {
      if (err.message.includes('fiber')) {
        nutritionResult = await db.query(
          'SELECT calories, protein, carbs, fats FROM recipe_nutrition WHERE recipe_id = $1',
          [id]
        );
      } else {
        throw err;
      }
    }

    return {
      ...recipe,
      ingredients: ingredientsResult.rows,
      nutrition: nutritionResult.rows[0] || null
    };
  }

  static async findByUserId(userId, filters = {}) {
    let query = 'SELECT r.*, rn.calories FROM recipes r LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id WHERE r.user_id = $1';
    const params = [userId];
    let paramCount = 1;

    if (filters.search) {
      paramCount++;
      query += ` AND (r.name ILIKE $${paramCount} OR r.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
    }

    if (filters.cuisine_type) {
      paramCount++;
      query += ` AND r.cuisine_type = $${paramCount}`;
      params.push(filters.cuisine_type);
    }

    if (filters.difficulty) {
      paramCount++;
      query += ` AND r.difficulty = $${paramCount}`;
      params.push(filters.difficulty);
    }

    if (filters.dietary_tag) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(r.dietary_tags)`;
      params.push(filters.dietary_tag);
    }

    if (filters.max_cook_time) {
      paramCount++;
      query += ` AND r.cook_time <= $${paramCount}`;
      params.push(filters.max_cook_time);
    }

    const sortBy = filters.sort_by || 'created_at';
    const sortOrder = filters.sort_order === 'asc' ? 'ASC' : 'DESC';
    query += ` ORDER BY r.${sortBy} ${sortOrder}`;

    const limit = filters.limit || 20;
    const offset = filters.offset || 0;

    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);

    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  static async getRecent(userId, limit = 5) {
    const result = await db.query(
      `SELECT r.*, rn.calories
       FROM recipes r
       LEFT JOIN recipe_nutrition rn ON r.id = rn.recipe_id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  }

  static async update(id, userId, updates) {
    const {
      name,
      description,
      cuisine_type,
      difficulty,
      instructions,
      dietary_tags,
      user_notes,
      image_url,
    } = updates;

    const prep_time = parseNum(updates.prep_time);
    const cook_time = parseNum(updates.cook_time);
    const servings  = parseNum(updates.servings);

    const result = await db.query(
      `UPDATE recipes
       SET name = COALESCE($1, name),
           description = COALESCE($2, description),
           cuisine_type = COALESCE($3, cuisine_type),
           difficulty = COALESCE($4, difficulty),
           prep_time = COALESCE($5, prep_time),
           cook_time = COALESCE($6, cook_time),
           servings = COALESCE($7, servings),
           instructions = COALESCE($8, instructions),
           dietary_tags = COALESCE($9, dietary_tags),
           user_notes = COALESCE($10, user_notes),
           image_url = COALESCE($11, image_url)
       WHERE id = $12 AND user_id = $13
       RETURNING *`,
      [
        name, description, cuisine_type, difficulty,
        prep_time, cook_time, servings,
        instructions ? JSON.stringify(instructions) : null,
        dietary_tags, user_notes, image_url,
        id, userId,
      ]
    );

    return result.rows[0];
  }

  static async delete(id, userId) {
    const result = await db.query(
      'DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );
    return result.rows[0];
  }

  static async getStats(userId) {
    const result = await db.query(
      `SELECT
        COUNT(*) as total_recipes,
        COUNT(DISTINCT cuisine_type) as cuisine_types_count,
        AVG(cook_time) as avg_cook_time
       FROM recipes
       WHERE user_id = $1`,
      [userId]
    );
    return result.rows[0];
  }
}

export default Recipe;