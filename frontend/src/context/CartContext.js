import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  // Initialize cart items from sessionStorage
  const [cartItems, setCartItems] = useState(() => {
    const savedCartItems = sessionStorage.getItem('cartItems');
    if (savedCartItems) {
      try {
        return JSON.parse(savedCartItems);
      } catch (error) {
        console.error('Error parsing cart items from sessionStorage:', error);
        return [];
      }
    }
    return [];
  });

  const [selectedCustomer, setSelectedCustomer] = useState(() => {
    const savedCustomer = sessionStorage.getItem('selectedCustomer');
    if (savedCustomer) {
      try {
        return JSON.parse(savedCustomer);
      } catch (error) {
        console.error('Error parsing selected customer from sessionStorage:', error);
        return null;
      }
    }
    return null;
  });

  // Sync cartItems with sessionStorage whenever it changes
  useEffect(() => {
    sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
  }, [cartItems]);

  // Sync selectedCustomer with sessionStorage whenever it changes
  useEffect(() => {
    if (selectedCustomer) {
      sessionStorage.setItem('selectedCustomer', JSON.stringify(selectedCustomer));
    } else {
      sessionStorage.removeItem('selectedCustomer');
    }
  }, [selectedCustomer]);

  // Listen for storage changes from other tabs/windows or within same page
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'cartItems' || e.storageArea === sessionStorage) {
        // Reload cart items from sessionStorage
        const savedCartItems = sessionStorage.getItem('cartItems');
        if (savedCartItems) {
          try {
            const parsedItems = JSON.parse(savedCartItems);
            setCartItems(parsedItems);
          } catch (error) {
            console.error('Error parsing cart items after storage change:', error);
          }
        } else {
          setCartItems([]);
        }
      }
    };

    // Add event listener for storage changes
    window.addEventListener('storage', handleStorageChange);

    // Also check for changes periodically (since sessionStorage events don't fire in same tab)
    const intervalId = setInterval(() => {
      const savedCartItems = sessionStorage.getItem('cartItems');
      if (savedCartItems) {
        try {
          const parsedItems = JSON.parse(savedCartItems);
          // Only update if different
          if (JSON.stringify(parsedItems) !== JSON.stringify(cartItems)) {
            setCartItems(parsedItems);
          }
        } catch (error) {
          console.error('Error in cart polling:', error);
        }
      } else if (cartItems.length > 0) {
        setCartItems([]);
      }
    }, 1000); // Check every second

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [cartItems]);

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
      const priceEstimates = item.itemPriceEstimates || {};
      return total + parseFloat(priceEstimates[transactionType] || 0);
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
