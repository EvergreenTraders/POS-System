import React, { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const addToCart = (item) => {
    setCartItems(prevItems => [...prevItems, item]);
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId
          ? { ...item, quantity: Math.max(0, quantity) }
          : item
      ).filter(item => item.quantity > 0)
    );
  };

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => {
      const transactionType = item.transactionType || 'pawn';
      return total + parseFloat(item.itemPriceEstimates[transactionType] || 0);
    }, 0);
  };

  const setCustomer = (customer) => {
    setSelectedCustomer(customer);
  };

  const clearCustomer = () => {
    setSelectedCustomer(null);
  };

  const clearCart = () => {
    setCartItems([]);
    setSelectedCustomer(null);
  };

  return (
    <CartContext.Provider value={{
      cartItems,
      addToCart,
      removeFromCart,
      updateQuantity,
      getCartTotal,
      selectedCustomer,
      setCustomer,
      clearCustomer,
      clearCart,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  return useContext(CartContext);
}
