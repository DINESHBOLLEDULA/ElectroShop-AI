import React, { createContext, useContext, useState, useCallback } from 'react';

export interface WishlistItem {
  id: number;
  name: string;
  brand: string;
  price: number;
  image: string;
  rating: number;
  reviews: number;
}

interface WishlistContextType {
  items: WishlistItem[];
  addToWishlist: (product: any) => void;
  removeFromWishlist: (id: number) => void;
  isInWishlist: (id: number) => boolean;
  toggleWishlist: (product: any) => void;
}

const WishlistContext = createContext<WishlistContextType>({
  items: [],
  addToWishlist: () => {},
  removeFromWishlist: () => {},
  isInWishlist: () => false,
  toggleWishlist: () => {},
});

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<WishlistItem[]>([]);

  const addToWishlist = useCallback((product: any) => {
    setItems(prev => {
      if (prev.find(item => item.id === product.id)) return prev;
      return [...prev, {
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        image: product.image,
        rating: product.rating,
        reviews: product.reviews,
      }];
    });
  }, []);

  const removeFromWishlist = useCallback((id: number) => {
    setItems(prev => prev.filter(item => item.id !== id));
  }, []);

  const isInWishlist = useCallback(
    (id: number) => items.some(item => item.id === id),
    [items]
  );

  const toggleWishlist = useCallback((product: any) => {
    setItems(prev => {
      if (prev.find(item => item.id === product.id)) {
        return prev.filter(item => item.id !== product.id);
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        image: product.image,
        rating: product.rating,
        reviews: product.reviews,
      }];
    });
  }, []);

  return (
    <WishlistContext.Provider
      value={{ items, addToWishlist, removeFromWishlist, isInWishlist, toggleWishlist }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export const useWishlist = () => useContext(WishlistContext);
