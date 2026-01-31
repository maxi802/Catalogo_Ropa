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
  imagen_url: string[];
  stock_talles: { [talle: string]: number }; // Usamos el nuevo campo JSONB
  descripcion: string;
}

interface ItemCarrito extends Producto {
  cantidad: number;
  talleSeleccionado: string;
}

export default function ProductoDetalle() {
  const { id } = useParams();
  const router = useRouter();
  
  const [producto, setProducto] = useState<Producto | null>(null);
  const [cargando, setCargando] = useState(true);
  const [fotoActual, setFotoActual] = useState(0);
  const [talleElegido, setTalleElegido] = useState<string>(''); // Estado para el talle obligatorio

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
    
    // VALIDACIÓN OBLIGATORIA DE TALLE
    if (!talleElegido) {
      alert("Por favor, selecciona un talle antes de añadir al carrito.");
      return;
    }
    
    const storageActual = localStorage.getItem('carrito');
    let carritoActual: ItemCarrito[] = [];
    
    try {
      if (storageActual) carritoActual = JSON.parse(storageActual);
    } catch (e) {
      carritoActual = [];
    }
    
    // Buscamos combinación ID + TALLE
    const indice = carritoActual.findIndex(
        item => item.id === producto.id && item.talleSeleccionado === talleElegido
    );
    
    const stockMaximo = producto.stock_talles[talleElegido] || 0;

    if (indice !== -1) {
      if (carritoActual[indice].cantidad < stockMaximo) {
        carritoActual[indice].cantidad += 1;
      } else {
        alert(`Lo sentimos, no hay más stock disponible para el talle ${talleElegido}.`);
        return;
      }
    } else {
      carritoActual.push({ ...producto, cantidad: 1, talleSeleccionado: talleElegido });
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

  const imagenes = Array.isArray(producto.imagen_url) ? producto.imagen_url : [producto.imagen_url];
  // Calculamos si hay stock general (si al menos un talle tiene > 0)
  const hayStockGeneral = Object.values(producto.stock_talles || {}).some(s => s > 0);

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
            <div className="relative aspect-square rounded-[3rem] overflow-hidden bg-zinc-50 border border-zinc-100 shadow-2xl mb-6">
              <img 
                src={imagenes[fotoActual]} 
                alt={producto.nombre} 
                className="w-full h-full object-cover transition-all duration-500" 
              />
              {imagenes.length > 1 && (
                <div className="absolute inset-0 flex items-center justify-between px-4 opacity-0 hover:opacity-100 transition-opacity">
                  <button onClick={() => setFotoActual(prev => (prev > 0 ? prev - 1 : imagenes.length - 1))} className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg">←</button>
                  <button onClick={() => setFotoActual(prev => (prev < imagenes.length - 1 ? prev + 1 : 0))} className="bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg">→</button>
                </div>
              )}
            </div>

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
          
          <div className="space-y-6 mb-10 border-l-2 border-black pl-6">
            <p className="text-zinc-500 leading-relaxed max-w-md italic font-medium whitespace-pre-line">
              {producto.descripcion || "Sin descripción disponible."}
            </p>
          </div>

          {/* --- SELECTOR DE TALLES --- */}
          <div className="mb-10">
            <h3 className="text-[10px] font-black uppercase tracking-widest mb-4">Seleccionar Talle</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(producto.stock_talles || {}).map(([talle, stock]) => (
                <button
                  key={talle}
                  disabled={stock <= 0}
                  onClick={() => setTalleElegido(talle)}
                  className={`min-w-15 h-12 rounded-xl text-xs font-black uppercase border-2 transition-all
                    ${stock <= 0 
                      ? 'border-zinc-100 text-zinc-300 cursor-not-allowed bg-zinc-50' 
                      : talleElegido === talle 
                        ? 'border-black bg-black text-white scale-105 shadow-lg' 
                        : 'border-zinc-100 hover:border-black text-black'
                    }`}
                >
                  {talle}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2 mb-4">
              <span className={`w-2 h-2 rounded-full ${hayStockGeneral ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                {hayStockGeneral ? 'Stock Disponible' : 'Agotado'}
              </span>
            </div>
            
            <button 
              onClick={manejarAñadirAlCarrito}
              disabled={!hayStockGeneral}
              className={`w-full py-6 rounded-4xl font-black uppercase tracking-widest transition-all shadow-2xl 
                ${talleElegido 
                  ? 'bg-black text-white hover:bg-zinc-800' 
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed'}`}
            >
              {!hayStockGeneral ? 'Agotado' : talleElegido ? 'Añadir al carrito' : 'Seleccioná un talle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}