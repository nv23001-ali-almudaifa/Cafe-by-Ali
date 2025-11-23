import express from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleMenuItemAvailability,
  validateCategoryCreation,
  validateMenuItemCreation,
  validateMenuItemUpdate
} from '../controllers/menuController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/menu/categories
 * @desc    Get all active categories
 * @access  Public
 */
router.get('/categories', getCategories);

/**
 * @route   POST /api/menu/categories
 * @desc    Create a new category
 * @access  Private (Admin only)
 */
router.post('/categories', authenticate, authorize(['admin']), validateCategoryCreation, createCategory);

/**
 * @route   PUT /api/menu/categories/:id
 * @desc    Update a category
 * @access  Private (Admin only)
 */
router.put('/categories/:id', authenticate, authorize(['admin']), updateCategory);

/**
 * @route   DELETE /api/menu/categories/:id
 * @desc    Delete a category
 * @access  Private (Admin only)
 */
router.delete('/categories/:id', authenticate, authorize(['admin']), deleteCategory);

/**
 * @route   GET /api/menu/items
 * @desc    Get menu items with optional filtering and pagination
 * @access  Public
 * @query   category - Filter by category ID
 * @query   availableOnly - Filter to only available items (true/false)
 * @query   search - Search in name and description
 * @query   sortBy - Sort field (name, price, orderCount, createdAt)
 * @query   sortOrder - Sort order (asc, desc)
 * @query   page - Page number (default: 1)
 * @query   limit - Items per page (default: 20)
 */
router.get('/items', getMenuItems);

/**
 * @route   GET /api/menu/items/:id
 * @desc    Get a specific menu item by ID
 * @access  Public
 */
router.get('/items/:id', getMenuItemById);

/**
 * @route   POST /api/menu/items
 * @desc    Create a new menu item
 * @access  Private (Admin only)
 */
router.post('/items', authenticate, authorize(['admin']), validateMenuItemCreation, createMenuItem);

/**
 * @route   PUT /api/menu/items/:id
 * @desc    Update a menu item
 * @access  Private (Admin only)
 */
router.put('/items/:id', authenticate, authorize(['admin']), validateMenuItemUpdate, updateMenuItem);

/**
 * @route   DELETE /api/menu/items/:id
 * @desc    Delete a menu item
 * @access  Private (Admin only)
 */
router.delete('/items/:id', authenticate, authorize(['admin']), deleteMenuItem);

/**
 * @route   PATCH /api/menu/items/:id/toggle-availability
 * @desc    Toggle menu item availability
 * @access  Private (Admin only)
 */
router.patch('/items/:id/toggle-availability', authenticate, authorize(['admin']), toggleMenuItemAvailability);

export default router;