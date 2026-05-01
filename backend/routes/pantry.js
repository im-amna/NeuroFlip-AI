import express from 'express';
const router = express.Router();
import * as pantryController from '../controllers/pantryController.js';
import authMiddleware from '../middleware/auth.js';

router.use(authMiddleware);

router.get('/', pantryController.getPantryItems);
router.get('/stats', pantryController.getPantryStats);
router.get('/expiring-soon', pantryController.getExpiringSoon);
router.post('/', pantryController.addPantryItem);
router.post('/add-from-shopping-list', pantryController.addFromShoppingList); // ✅ add kiya
router.put('/:id', pantryController.updatePantryItem);
router.delete('/:id', pantryController.deletePantryItem);

export default router;