import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
} from '@mui/material';
import { Add as AddIcon, AddShoppingCart as AddCartIcon } from '@mui/icons-material';
import { useCart } from '../context/CartContext';

function Products() {
  const [products] = useState([
    { id: 1, name: 'Product 1', price: 9.99, stock: 100 },
    { id: 2, name: 'Product 2', price: 19.99, stock: 50 },
    { id: 3, name: 'Product 3', price: 29.99, stock: 75 },
  ]);

  const { addToCart } = useCart();

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
        <Typography variant="h4">Products</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
        >
          Add Product
        </Button>
      </div>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Price</TableCell>
              <TableCell>Stock</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id}>
                <TableCell>{product.id}</TableCell>
                <TableCell>{product.name}</TableCell>
                <TableCell>${product.price}</TableCell>
                <TableCell>{product.stock}</TableCell>
                <TableCell>
                  <Button color="primary">Edit</Button>
                  <Button color="error">Delete</Button>
                  <Button
                    variant="contained"
                    color="primary"
                    size="small"
                    startIcon={<AddCartIcon />}
                    onClick={() => addToCart(product)}
                  >
                    Add to Cart
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
}

export default Products;
