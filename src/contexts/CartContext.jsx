import { createContext, useContext, useState, useEffect, useRef } from 'react';

const CartContext = createContext(null);

const STORAGE_KEY = 'rainora_cart_v1';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  const [lastAdded, setLastAdded] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);
  const toastTimeoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const dismissToast = () => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastVisible(false);
  };

  const addItem = (product, size, qty = 1) => {
    const quantityToAdd = Math.max(1, Number(qty) || 1);

    setItems((prev) => {
      const key = `${product.id}-${size}`;
      const existing = prev.find((i) => i.key === key);
      if (existing) {
        return prev.map((i) => (i.key === key ? { ...i, qty: i.qty + quantityToAdd } : i));
      }
      return [
        ...prev,
        {
          key,
          id: product.id,
          name: product.name,
          brand: product.brand,
          price: product.price,
          image_url: product.image_url,
          size,
          qty: quantityToAdd,
        },
      ];
    });

    // Trigger toast notification
    setLastAdded({
      product,
      size,
      qty: quantityToAdd,
      timestamp: Date.now(),
    });
    setToastVisible(true);

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 3500);
  };

  const updateQty = (key, qty) => {
    if (qty <= 0) {
      setItems((prev) => prev.filter((i) => i.key !== key));
      return;
    }
    setItems((prev) => prev.map((i) => (i.key === key ? { ...i, qty } : i)));
  };

  const removeItem = (key) => setItems((prev) => prev.filter((i) => i.key !== key));

  const clearCart = () => setItems([]);

  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const count = items.reduce((sum, i) => sum + i.qty, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        updateQty,
        removeItem,
        clearCart,
        total,
        count,
        lastAdded,
        toastVisible,
        dismissToast,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
