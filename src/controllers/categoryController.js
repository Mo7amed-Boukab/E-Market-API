
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

}

module.exports = new CategoryController();