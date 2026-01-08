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
  imagen_url: string[]; // CAMBIADO A ARRAY
  stock: number;
  descripcion: string;
}

interface ItemCarrito extends Producto {
  cantidad: number;
}

export default function ProductoDetalle() {
  const { id } = useParams();
  const router = useRouter();
  
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fotoActual, setFotoActual] = useState(0); // ESTADO PARA EL CARRUSEL

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
    
    const storageActual = localStorage.getItem('carrito');
    let carritoActual: ItemCarrito[] = [];
    
    if (storageActual) {
      carritoActual = JSON.parse(storageActual);
    }
    
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
    
    localStorage.setItem('carrito', JSON.stringify(carritoActual));
    localStorage.setItem('abrirCarrito', 'true');
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

  // Aseguramos que imagen_url sea siempre un array para evitar errores
  const imagenes = Array.isArray(producto.imagen_url) ? producto.imagen_url : [producto.imagen_url];

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <button 
        onClick={() => router.back()}
        className="fixed top-8 left-8 z-50 bg-black text-white px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-110 transition-transform shadow-xl"
      >
        ← Volver
      </button>

      <div className="max-w-7xl mx-auto px-4 py-20 flex flex-col md:flex-row gap-12 lg:gap-24">
        {/* SECCIÓN IZQUIERDA: CARRUSEL */}
        <div className="w-full md:w-1/2">
          <div className="sticky top-24">
            {/* IMAGEN PRINCIPAL */}
            <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-zinc-50 border border-zinc-100 shadow-2xl mb-6">
              <img 
                src={imagenes[fotoActual]} 
                alt={producto.nombre} 
                className="w-full h-full object-cover transition-all duration-500" 
              />
              
              {/* Botones de navegación (solo si hay más de 1 imagen) */}
              {imagenes.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setFotoActual(prev => (prev > 0 ? prev - 1 : imagenes.length - 1))}
                    className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-white"
                  >
                    ←
                  </button>
                  <button 
                    onClick={() => setFotoActual(prev => (prev < imagenes.length - 1 ? prev + 1 : 0))}
                    className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg hover:bg-white"
                  >
                    →
                  </button>
                </div>
              )}
            </div>

            {/* MINIATURAS (Thumbnails) */}
            {imagenes.length > 1 && (
              <div className="flex gap-4 overflow-x-auto pb-2 no-scrollbar">
                {imagenes.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setFotoActual(index)}
                    className={`relative w-24 h-24 shrink-0 rounded-2xl overflow-hidden border-2 transition-all ${
                      fotoActual === index ? 'border-black scale-95' : 'border-transparent opacity-50'
                    }`}
                  >
                    <img src={img} className="w-full h-full object-cover" alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* SECCIÓN DERECHA: INFO */}
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