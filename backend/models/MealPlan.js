import db from '../config/db.js';

class MealPlan {
    static async findByDateRange(userId, startDate, endDate) {
        const result = await db.query(
            `
            SELECT 
              mp.id,
              mp.user_id,
              mp.recipe_id,
              mp.meal_date::text AS meal_date,
              mp.meal_type,
              mp.created_at,
              mp.updated_at,
              r.name AS recipe_name,
              r.image_url,
              r.prep_time,
              r.cook_time
            FROM meal_plans mp
            JOIN recipes r ON mp.recipe_id = r.id
            WHERE mp.user_id = $1
              AND mp.meal_date >= $2
              AND mp.meal_date <= $3
            ORDER BY mp.meal_date ASC,
              CASE 
                WHEN mp.meal_type = 'breakfast' THEN 1
                WHEN mp.meal_type = 'lunch' THEN 2
                WHEN mp.meal_type = 'dinner' THEN 3
              END
            `,
            [userId, startDate, endDate]
        );
        return result.rows;
    }

    /**
     * Get weekly meal plan
     */
    static async getWeeklyPlan(userId, weekStartDate) {
        const endDate = new Date(weekStartDate);
        endDate.setDate(endDate.getDate() + 6);

        return await this.findByDateRange(userId, weekStartDate, endDate);
    }

    /**
     * Get upcoming meals (next 7 days)
     */
    static async getUpcoming(userId, limit = 5) {
        const result = await db.query(
            `SELECT mp.*, r.name as recipe_name, r.image_url
            FROM meal_plans mp
            JOIN recipes r ON mp.recipe_id = r.id
            WHERE mp.user_id = $1
            AND mp.meal_date >= CURRENT_DATE
            ORDER BY mp.meal_date ASC,
            CASE mp.meal_type
                WHEN 'breakfast' THEN 1
                WHEN 'lunch' THEN 2
                WHEN 'dinner' THEN 3
            END
            LIMIT $2`,
            [userId, limit]
        );

        return result.rows;
    }

    /**
     * Get meal plan stats
     */
    static async getStats(userId) {
        const result = await db.query(`
            SELECT
            COUNT(*) as total_planned_meals,
            COUNT(*) FILTER (WHERE meal_date >= CURRENT_DATE AND meal_date < CURRENT_DATE + INTERVAL '7 days') as this_week_count
            FROM meal_plans
            WHERE user_id = $1`,
            [userId]
        );

        return result.rows[0];
    }
}

export default MealPlan;
