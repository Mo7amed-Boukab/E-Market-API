
const Category = require('../models/category');
class CategoryController {

    async createCategory(req, res) {
       try {
         const { name } = req.body;

         if (!name) {
           return res.status(400).json({ message: 'Missing required fields' });
         }
         
         const category = new Category({ name }); 
         await category.save();

         return res.status(201).json({ message: 'Category created successfully', category });

       } catch (error) {
         console.error('Error creating category:', error);
         return res.status(500).json({ message: 'Error creating category' });
       }       
    }

    async getAllCategories(req, res) {
      try {
        const categories = await Category.find();

        if (categories.length === 0) {
          return res.status(404).json({ message: 'No categories found' });
        }

        return res.status(200).json(categories);

      } catch (error) {
        console.error('Error retrieving categories:', error);
        return res.status(500).json({ message: 'Error retrieving categories' });
      }
    }

    async getCategoryById(req, res) {
      try {
        const { id } = req.params;
        const category = await Category.findById(id);

        if (!category) {
          return res.status(404).json({ message: 'Category not found' });
        }

        return res.status(200).json(category);

      } catch (error) {
        console.error('Error retrieving category:', error);
        return res.status(500).json({ message: 'Error retrieving category' });
      }
    }

    async updateCategory(req, res) {
      try {
        const { id } = req.params;
        const { name } = req.body;

        if (!name) {
          return res.status(400).json({ message: 'Missing required fields' });
        }

        const category = await Category.findById(id);

        if (!category) {
          return res.status(404).json({ message: 'Category not found' });
        }

        category.name = name;
        await category.save();

        return res.status(200).json({ message: 'Category updated successfully', category });

      } catch (error) {
        console.error('Error updating category:', error);
        return res.status(500).json({ message: 'Error updating category' });
      }
    }

    async deleteCategory(req, res) {
      try {
        const { id } = req.params;
        const category = await Category.findById(id);

        if (!category) {
          return res.status(404).json({ message: 'Category not found' });
        }

        await Category.findByIdAndDelete(id);
        return res.status(200).json({ message: 'Category deleted successfully' });

      } catch (error) {
        console.error('Error deleting category:', error);
        return res.status(500).json({ message: 'Error deleting category' });
      }
    }

}

module.exports = new CategoryController();