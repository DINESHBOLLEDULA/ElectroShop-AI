import React, { createContext, useContext, useState, useCallback } from 'react';

export interface CartItem {
  id: number;
  name: string;
  brand: string;
  price: number;
  image: string;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (product: any) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (
    id: number,
    quantity: number
  ) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getTotal: () => number;
  isInCart: (id: number) => boolean;
  getItemQuantity: (
    id: number
  ) => number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addToCart: () => {},
  removeFromCart: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  getItemCount: () => 0,
  getTotal: () => 0,
  isInCart: () => false,
getItemQuantity: () => 0,
});

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((product: any) => {
    setItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        image: product.image,
        quantity: 1,
      }];
    });
  }, []);

  const removeFromCart = useCallback((id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateQuantity = useCallback((id: number, quantity: number) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(item => item.id !== id));
      return;
    }
    setItems(prev =>
      prev.map(item => (item.id === id ? { ...item, quantity } : item))
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const getItemCount = useCallback(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const getTotal = useCallback(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const isInCart = useCallback(
    (id: number) => items.some(item => item.id === id),
    [items]
  );
  const getItemQuantity = useCallback(
  (id: number) =>
    items.find(
      item => item.id === id
    )?.quantity ?? 0,
  [items]
);
  return (
    <CartContext.Provider
     value={{
  items,
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  getItemCount,
  getTotal,
  isInCart,
  getItemQuantity,
}}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
