'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

// 1. Definimos la estructura base de un producto (lo que viene de Supabase)
export interface ProductoBase {
  id: string;
  nombre: string;
  precio: number;
  imagen_url?: string | null;
  categoria?: string | null;
  stock: number;
}

// 2. Definimos la estructura de un item dentro del carrito (incluye cantidad)
export interface CartItem extends ProductoBase {
  cantidad: number;
}

// 3. Definimos qué funciones y datos expone nuestro Contexto
interface CartContextType {
  cart: CartItem[];
  addToCart: (product: ProductoBase) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  total: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);

const addToCart = (product: ProductoBase & { stock: number }) => {
  setCart((prev) => {
    const exists = prev.find((item) => item.id === product.id);
    
    // Si ya existe en el carrito, verificamos si hay stock disponible para sumar uno más
    if (exists) {
      if (exists.cantidad >= product.stock) {
        alert("¡Lo sentimos! No hay más stock disponible de este producto.");
        return prev;
      }
      return prev.map((item) =>
        item.id === product.id ? { ...item, cantidad: item.cantidad + 1 } : item
      );
    }
    
    // Si es nuevo y hay stock (al menos 1), lo agregamos
    if (product.stock > 0) {
      return [...prev, { ...product, cantidad: 1 }];
    } else {
      alert("Producto sin stock.");
      return prev;
    }
  });
};

  // Función para restar 1 o eliminar si llega a cero
  const removeFromCart = (productId: string) => {
    setCart((prev) => {
      const item = prev.find((i) => i.id === productId);
      if (item && item.cantidad > 1) {
        return prev.map((i) =>
          i.id === productId 
            ? { ...i, cantidad: i.cantidad - 1 } 
            : i
        );
      }
      // Si la cantidad era 1, lo eliminamos de la lista
      return prev.filter((i) => i.id !== productId);
    });
  };

  const clearCart = () => setCart([]);

  // Calculamos el total sumando (precio * cantidad) de cada item
  const total = cart.reduce((acc, item) => acc + item.precio * item.cantidad, 0);

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, clearCart, total }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart debe usarse dentro de CartProvider");
  }
  return context;
};