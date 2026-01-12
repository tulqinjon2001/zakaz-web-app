import { createContext, useContext, useState, useEffect } from 'react';
import { storage, STORAGE_KEYS } from '../utils/storage';

const CartContext = createContext();

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState([]);

  useEffect(() => {
    // Load cart from storage
    const savedCart = storage.get(STORAGE_KEYS.CART) || [];
    setCart(savedCart);
  }, []);

  const saveCart = (newCart) => {
    setCart(newCart);
    storage.set(STORAGE_KEYS.CART, newCart);
  };

  const addToCart = (product, quantity = 1) => {
    const storeId = storage.get(STORAGE_KEYS.STORE_INFO)?.id;
    if (!storeId) return;

    const inventory = product.inventories?.[0];
    if (!inventory) return;

    const newCart = [...cart];
    const existingItem = newCart.find(
      item => item.productId === product.id && item.storeId === storeId
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      newCart.push({
        productId: product.id,
        productName: product.name,
        productImage: product.imageUrl,
        storeId: storeId,
        price: inventory.price,
        currency: inventory.currency,
        quantity: quantity,
      });
    }

    saveCart(newCart);
  };

  const removeFromCart = (productId) => {
    const newCart = cart.filter(item => item.productId !== productId);
    saveCart(newCart);
  };

  const updateQuantity = (productId, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const newCart = cart.map(item =>
      item.productId === productId ? { ...item, quantity } : item
    );
    saveCart(newCart);
  };

  const clearCart = () => {
    saveCart([]);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getTotalPrice,
    getTotalItems,
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
};

export default CartProvider;
