import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

export interface CompareProduct {
  id: number;
  name: string;
  brand: string;
  price: number;
  rating: number;
  reviews: number;
  image: string;
  specs: Record<string, any>;
  tags?: string[];
  inStock?: boolean;
}

interface CompareContextType {
  items: CompareProduct[];
  addToCompare: (product: any) => void;
  removeFromCompare: (id: number) => void;
  clearCompare: () => void;
  isInCompare: (id: number) => boolean;
  count: number;
}

const CompareContext = createContext<CompareContextType>({
  items: [],
  addToCompare: () => {},
  removeFromCompare: () => {},
  clearCompare: () => {},
  isInCompare: () => false,
  count: 0,
});

const MAX_COMPARE = 4;

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CompareProduct[]>([]);

  const addToCompare = useCallback((product: any) => {
    setItems(prev => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.find(p => p.id === product.id)) return prev;
      return [...prev, {
        id: product.id,
        name: product.name,
        brand: product.brand,
        price: product.price,
        rating: product.rating,
        reviews: product.reviews,
        image: product.image,
        specs: product.specs || {},
        tags: product.tags,
        inStock: product.inStock,
      }];
    });
  }, []);

  const removeFromCompare = useCallback((id: number) => {
    setItems(prev => prev.filter(p => p.id !== id));
  }, []);

  const clearCompare = useCallback(() => setItems([]), []);

  const isInCompare = useCallback(
    (id: number) => items.some(p => p.id === id),
    [items]
  );

  const value = useMemo(() => ({
    items,
    addToCompare,
    removeFromCompare,
    clearCompare,
    isInCompare,
    count: items.length,
  }), [items, addToCompare, removeFromCompare, clearCompare, isInCompare]);

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
}

export const useCompare = () => useContext(CompareContext);
