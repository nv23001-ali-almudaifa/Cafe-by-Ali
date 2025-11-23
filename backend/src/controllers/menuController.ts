import { Request, Response } from 'express';
import { body, validationResult, query } from 'express-validator';
import { Category, MenuItem } from '../models';
import { logger } from '../utils/logger';

// Validation middleware
export const validateCategoryCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Category name must be between 1 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('displayOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Display order must be a non-negative integer')
];

export const validateMenuItemCreation = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Menu item name must be between 1 and 100 characters'),
  body('description')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('category')
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be greater than 0'),
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Image URL must be a valid URL'),
  body('allergens')
    .optional()
    .isArray()
    .withMessage('Allergens must be an array'),
  body('allergens.*')
    .optional()
    .isIn(['nuts', 'dairy', 'gluten', 'soy', 'eggs', 'fish', 'shellfish'])
    .withMessage('Invalid allergen type'),
  body('ingredients')
    .optional()
    .isArray()
    .withMessage('Ingredients must be an array'),
  body('preparationTime')
    .isInt({ min: 1, max: 60 })
    .withMessage('Preparation time must be between 1 and 60 minutes'),
  body('nutritionalInfo.calories')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Calories must be a non-negative number'),
  body('nutritionalInfo.protein')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Protein must be a non-negative number'),
  body('nutritionalInfo.carbs')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Carbs must be a non-negative number'),
  body('nutritionalInfo.fat')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Fat must be a non-negative number')
];

export const validateMenuItemUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Menu item name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Description must be between 1 and 500 characters'),
  body('category')
    .optional()
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be greater than 0'),
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be a boolean')
];

// Category controllers
export const getCategories = async (req: Request, res: Response) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error: any) {
    logger.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch categories'
    });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { name, description, displayOrder } = req.body;

    // Check if category already exists
    const existingCategory = await Category.findOne({ name });
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        error: 'Category with this name already exists'
      });
    }

    const category = new Category({
      name,
      description,
      displayOrder: displayOrder || 0
    });

    await category.save();

    logger.info(`New category created: ${name}`);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (error: any) {
    logger.error('Error creating category:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create category'
    });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, displayOrder, isActive } = req.body;

    const category = await Category.findByIdAndUpdate(
      id,
      { name, description, displayOrder, isActive },
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    logger.info(`Category updated: ${name}`);

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: category
    });
  } catch (error: any) {
    logger.error('Error updating category:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update category'
    });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if category has menu items
    const menuItemCount = await MenuItem.countDocuments({ category: id });
    if (menuItemCount > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete category with menu items. Please delete or reassign menu items first.'
      });
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Category not found'
      });
    }

    logger.info(`Category deleted: ${category.name}`);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting category:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete category'
    });
  }
};

// Menu item controllers
export const getMenuItems = async (req: Request, res: Response) => {
  try {
    const {
      category,
      availableOnly,
      search,
      sortBy = 'orderCount',
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    // Build filter
    const filter: any = {};

    if (category) {
      filter.category = category;
    }

    if (availableOnly === 'true') {
      filter.isAvailable = true;
    }

    if (search) {
      filter.$text = { $search: search as string };
    }

    // Build sort
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    // Calculate pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [menuItems, total] = await Promise.all([
      MenuItem.find(filter)
        .populate('category', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .exec(),
      MenuItem.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        menuItems,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          totalItems: total,
          itemsPerPage: limitNum
        }
      }
    });
  } catch (error: any) {
    logger.error('Error fetching menu items:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch menu items'
    });
  }
};

export const getMenuItemById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findById(id)
      .populate('category', 'name description');

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: menuItem
    });
  } catch (error: any) {
    logger.error('Error fetching menu item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch menu item'
    });
  }
};

export const createMenuItem = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const menuItemData = req.body;

    // Verify category exists
    const category = await Category.findById(menuItemData.category);
    if (!category) {
      return res.status(400).json({
        success: false,
        error: 'Invalid category'
      });
    }

    const menuItem = new MenuItem(menuItemData);
    await menuItem.save();

    // Populate category for response
    await menuItem.populate('category', 'name');

    logger.info(`New menu item created: ${menuItem.name}`);

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: menuItem
    });
  } catch (error: any) {
    logger.error('Error creating menu item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create menu item'
    });
  }
};

export const updateMenuItem = async (req: Request, res: Response) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { id } = req.params;
    const updateData = req.body;

    // If category is being updated, verify it exists
    if (updateData.category) {
      const category = await Category.findById(updateData.category);
      if (!category) {
        return res.status(400).json({
          success: false,
          error: 'Invalid category'
        });
      }
    }

    const menuItem = await MenuItem.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('category', 'name');

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    logger.info(`Menu item updated: ${menuItem.name}`);

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: menuItem
    });
  } catch (error: any) {
    logger.error('Error updating menu item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update menu item'
    });
  }
};

export const deleteMenuItem = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findByIdAndDelete(id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    logger.info(`Menu item deleted: ${menuItem.name}`);

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error: any) {
    logger.error('Error deleting menu item:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to delete menu item'
    });
  }
};

export const toggleMenuItemAvailability = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      return res.status(404).json({
        success: false,
        error: 'Menu item not found'
      });
    }

    menuItem.isAvailable = !menuItem.isAvailable;
    await menuItem.save();

    logger.info(`Menu item availability toggled: ${menuItem.name} -> ${menuItem.isAvailable ? 'available' : 'unavailable'}`);

    res.json({
      success: true,
      message: `Menu item is now ${menuItem.isAvailable ? 'available' : 'unavailable'}`,
      data: {
        id: menuItem._id,
        name: menuItem.name,
        isAvailable: menuItem.isAvailable
      }
    });
  } catch (error: any) {
    logger.error('Error toggling menu item availability:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to toggle menu item availability'
    });
  }
};