const yup = require('yup');

const userSchema = yup.object({
  fullname: yup.string().required('Name is required').min(3, 'Name must be at least 3 characters'),
  email: yup.string().required('Email is required').email('Invalid email format'),
  password: yup.string().required('Password is required').min(8, 'Password must be at least 8 characters'),
});

const productSchema = yup.object({
  title: yup.string().required('Title is required').min(3, 'Title must be at least 3 characters'),
  description: yup.string().required('Description is required').min(8, 'Description must be at least 8 characters'),
  price: yup.number("price must be a number").required('Price is required'),
  stock: yup.number("stock must be a number").required('Stock is required'),
  category: yup.string().required('Category is required'),
});

const CategorySchema = yup.object({
  name: yup.string().required('Name is required').min(3, 'Name must be at least 3 characters'),
});

module.exports = {userSchema, productSchema, CategorySchema};