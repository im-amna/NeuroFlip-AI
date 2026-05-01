import express from 'express';
const router = express.Router();
import * as shoppingListController from '../controllers/shoppingListController.js';
import authMiddleware from '../middleware/auth.js';

router.use(authMiddleware);

router.get('/', shoppingListController.getShoppingList);
router.post('/generate', shoppingListController.generateFromMealPlan);
router.post('/', shoppingListController.addItem);
router.put('/:id', shoppingListController.updateItem);
router.put('/:id/toggle', shoppingListController.toggleChecked);
router.patch('/:id/toggle', shoppingListController.toggleChecked);  // ✅ PATCH bhi add kiya
router.delete('/clear/checked', shoppingListController.clearChecked);  // ✅ :id se pehle
router.delete('/clear/all', shoppingListController.clearAll);          // ✅ :id se pehle
router.delete('/:id', shoppingListController.deleteItem);
router.post('/add-to-pantry', shoppingListController.addCheckedToPantry);

export default router;