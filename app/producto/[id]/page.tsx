'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  imagen_url: string;
  stock: number;
  descripcion: string; // AGREGAMOS EL CAMPO DESCRIPCIÓN
}

interface ItemCarrito extends Producto {
  cantidad: number;
}

export default function ProductoDetalle() {
  const { id } = useParams();
  const router = useRouter();
  
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    async function getProducto() {
      if (!id) return;
      
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .eq('id', id)
        .single();

      if (data) setProducto(data as Producto);
      if (error) console.error("Error cargando producto:", error.message);
      setCargando(false);
    }
    getProducto();
  }, [id]);

const manejarAñadirAlCarrito = () => {
    if (!producto) return;
    
    // 1. Obtener lo que ya hay en el storage
    const storageActual = localStorage.getItem('carrito');
    let carritoActual: ItemCarrito[] = [];
    
    if (storageActual) {
      carritoActual = JSON.parse(storageActual);
    }
    
    // 2. Revisar si el producto ya existe para sumar cantidad o añadir nuevo
    const indice = carritoActual.findIndex(item => item.id === producto.id);
    
    if (indice !== -1) {
      if (carritoActual[indice].cantidad < producto.stock) {
        carritoActual[indice].cantidad += 1;
      } else {
        alert("Sin stock suficiente");
        return;
      }
    } else {
      carritoActual.push({ ...producto, cantidad: 1 });
    }
    
    // 3. GUARDAR TODO DE NUEVO EN EL STORAGE
    localStorage.setItem('carrito', JSON.stringify(carritoActual));
    
    // 4. Marcar que se debe abrir el carrito al volver
    localStorage.setItem('abrirCarrito', 'true');
    
    // 5. Ir a la tienda
    router.push('/'); 
  };

  if (cargando) return (
    <div className="min-h-screen flex items-center justify-center font-black uppercase italic animate-pulse">
      Cargando...
    </div>
  );
  
  if (!producto) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center px-4">
      <p className="font-black uppercase italic text-2xl tracking-tighter">Producto no encontrado</p>
      <button onClick={() => router.push('/')} className="bg-black text-white px-8 py-3 rounded-full text-[10px] font-black uppercase tracking-widest">
        Volver a la tienda
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <button 
        onClick={() => router.back()}
        className="fixed top-8 left-8 z-50 bg-black text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-110 transition-transform shadow-xl"
      >
        ← Volver
      </button>

      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col md:flex-row gap-12 lg:gap-24">
        <div className="w-full md:w-1/2">
          <div className="sticky top-24 aspect-3/4 rounded-[3rem] overflow-hidden bg-zinc-50 border border-zinc-100 shadow-2xl">
            <img src={producto.imagen_url} alt={producto.nombre} className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="w-full md:w-1/2 flex flex-col justify-center py-10">
          <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400 mb-4 inline-block">
            {producto.categoria}
          </span>
          <h1 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.9] mb-6">
            {producto.nombre}
          </h1>
          <p className="text-4xl font-black tracking-tighter mb-8 text-zinc-900">
            ${producto.precio}
          </p>
          
          <div className="space-y-6 mb-12 border-l-2 border-black pl-6">
            <p className="text-zinc-500 leading-relaxed max-w-md italic font-medium whitespace-pre-line">
              {/* AQUÍ CARGAMOS LA DESCRIPCIÓN DE SUPABASE */}
              {producto.descripcion || "Sin descripción disponible."}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full ${producto.stock > 0 ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                {producto.stock > 0 ? `Disponible: ${producto.stock} Unidades` : 'Sin Stock'}
              </span>
            </div>
            
            <button 
              onClick={manejarAñadirAlCarrito}
              disabled={producto.stock <= 0}
              className="w-full bg-black text-white py-6 rounded-4xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-2xl disabled:bg-zinc-100"
            >
              {producto.stock > 0 ? 'Añadir al carrito' : 'Agotado'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}