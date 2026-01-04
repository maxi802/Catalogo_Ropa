import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from '@/context/CartContext';
import "./globals.css";

// Configuración de fuentes profesionales de Next.js
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Catálogo de Ropa - Tienda Online",
  description: "Administra y vende tu ropa de forma sencilla",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body
        // Aplicamos las fuentes aquí para que todo el texto se vea bien
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <CartProvider>
          {/* Al estar aquí, cualquier página dentro de /app podrá usar el carrito */}
          {children}
        </CartProvider>
      </body>
    </html>
  );
}