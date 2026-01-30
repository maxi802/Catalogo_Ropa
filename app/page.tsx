'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { enviarPedidoWhatsApp } from '@/lib/whatsapp'; 
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const categoriasMenu = ['Todos', 'Zapatillas', 'Camisetas','Conjuntos','Medias','Gorras','Pelotas','Pantalones'];
const ORDEN_PRIORIDAD = ['Zapatillas', 'Camisetas', 'Pantalones','Conjuntos','Medias','Gorras','Pelotas'];

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  imagen_url: string[]; 
  stock: number;
}

interface ItemCarrito extends Producto {
  cantidad: number;
}

export default function TiendaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActual, setCategoriaActual] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  
  const pathname = usePathname();
  const cargadoInicial = useRef(false);

  const sincronizarTodo = useCallback(() => {
    const guardado = localStorage.getItem('carrito');
    if (guardado) {
      try {
        const carritoParseado = JSON.parse(guardado);
        if (carritoParseado.length >= 0) {
          setCarrito(carritoParseado);
        }
      } catch (e) {
        console.error("Error al parsear el carrito:", e);
      }
    }
    if (localStorage.getItem('abrirCarrito') === 'true') {
      setCarritoAbierto(true);
      localStorage.removeItem('abrirCarrito');
    }
    setTimeout(() => {
      cargadoInicial.current = true;
    }, 300);
  }, []);

  useEffect(() => {
    sincronizarTodo();
    window.addEventListener('storage', sincronizarTodo);
    window.addEventListener('focus', sincronizarTodo);
    return () => {
      window.removeEventListener('storage', sincronizarTodo);
      window.removeEventListener('focus', sincronizarTodo);
    };
  }, [sincronizarTodo]);

  useEffect(() => {
    if (pathname === '/') {
      sincronizarTodo();
    }
  }, [pathname, sincronizarTodo]);

  useEffect(() => {
    if (cargadoInicial.current) {
      localStorage.setItem('carrito', JSON.stringify(carrito));
    }
  }, [carrito]);

  const fetchProductos = useCallback(async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*')
        .order('categoria', { ascending: true });

      if (data) setProductos(data);
      if (error) console.error("Error:", error.message);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    fetchProductos();
  }, [fetchProductos]);

  const agregarAlCarrito = (producto: Producto) => {
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id);
      if (existe) {
        if (existe.cantidad >= producto.stock) {
          alert(`Lo sentimos, solo hay ${producto.stock} unidades disponibles.`);
          return prev;
        }
        return prev.map(item => 
          item.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...producto, cantidad: 1 }];
    });
    setCarritoAbierto(true);
  };

  const modificarCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const nuevaCant = item.cantidad + delta;
        if (delta > 0 && nuevaCant > item.stock) {
          alert(`Límite de stock alcanzado (${item.stock} unidades)`);
          return item;
        }
        return { ...item, cantidad: Math.max(0, nuevaCant) };
      }
      return item;
    }).filter(item => item.cantidad > 0));
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const secciones = useMemo(() => {
    let base = productos;
    if (categoriaActual !== 'Todos') base = base.filter(p => p.categoria === categoriaActual);
    if (busqueda.trim() !== '') base = base.filter(p => p.nombre.toLowerCase().includes(busqueda.toLowerCase()));
    const grupos: { [key: string]: Producto[] } = {};
    base.forEach(prod => {
      if (!grupos[prod.categoria]) grupos[prod.categoria] = [];
      grupos[prod.categoria].push(prod);
    });
    const gruposOrdenados: { [key: string]: Producto[] } = {};
    ORDEN_PRIORIDAD.forEach(cat => {
      if (grupos[cat]) gruposOrdenados[cat] = grupos[cat];
    });
    Object.keys(grupos).forEach(cat => {
      if (!gruposOrdenados[cat]) gruposOrdenados[cat] = grupos[cat];
    });
    return gruposOrdenados;
  }, [productos, categoriaActual, busqueda]);

  return (
    <div className="min-h-screen bg-white font-sans text-black overflow-x-hidden flex flex-col">
      {/* Botón Flotante Carrito */}
      <button 
        onClick={() => setCarritoAbierto(true)}
        className="fixed bottom-8 right-8 z-60 bg-black text-white p-6 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
      >
        <span className="absolute -top-1 -right-1 bg-red-500 w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center border-2 border-white">
          {carrito.reduce((acc, item) => acc + item.cantidad, 0)}
        </span>
        🛒
      </button>

      {/* Drawer del Carrito */}
      {carritoAbierto && (
        <div className="fixed inset-0 z-100 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setCarritoAbierto(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-8 animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-2xl font-black uppercase tracking-tighter italic">Tu Carrito</h2>
              <button onClick={() => setCarritoAbierto(false)} className="text-sm font-bold uppercase text-zinc-300">Cerrar</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
              {carrito.length === 0 ? (
                <p className="text-center text-zinc-300 font-bold uppercase py-20 italic">El carrito está vacío</p>
              ) : (
                carrito.map(item => (
                  <div key={item.id} className="flex gap-4 items-center bg-zinc-50 p-4 rounded-3xl">
                    <img src={Array.isArray(item.imagen_url) ? item.imagen_url[0] : item.imagen_url} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                    <div className="flex-1">
                      <h4 className="text-[10px] font-black uppercase truncate">{item.nombre}</h4>
                      <p className="text-xs font-bold">$ {item.precio * item.cantidad}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-full border">
                      <button onClick={() => modificarCantidad(item.id, -1)} className="font-bold text-lg">-</button>
                      <span className="text-xs font-black">{item.cantidad}</span>
                      <button onClick={() => modificarCantidad(item.id, 1)} className={`font-bold text-lg ${item.cantidad >= item.stock ? 'text-zinc-300' : 'text-black'}`}>+</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="mt-8 pt-8 border-t">
              <div className="flex justify-between items-end mb-6">
                <span className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Total</span>
                <span className="text-3xl font-black tracking-tighter">$ {totalCarrito}</span>
              </div>
              <button 
                disabled={carrito.length === 0}
                onClick={() => enviarPedidoWhatsApp(carrito, totalCarrito)}
                className="w-full bg-[#25D366] text-white py-6 rounded-4xl font-black uppercase tracking-widest hover:bg-[#20ba5a] disabled:bg-zinc-100 disabled:text-zinc-300 transition-all shadow-xl shadow-green-500/20 flex items-center justify-center gap-3"
              >
                Finalizar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logoososinfondo.png" alt="Logo" className="w-30 h-30 object-contain" />
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">Luny Importa2</h1>
            </div>
            <div className="relative w-full md:w-80">
              <input 
                type="text" 
                placeholder="Buscar prenda..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full bg-zinc-100 border-none rounded-2xl px-6 py-3 text-sm focus:ring-2 ring-black outline-none transition-all"
              />
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 mt-8 no-scrollbar">
            {categoriasMenu.map(cat => (
              <button
                key={cat}
                onClick={() => setCategoriaActual(cat)}
                className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  categoriaActual === cat ? 'bg-black text-white shadow-lg' : 'bg-zinc-100 text-zinc-400 hover:bg-zinc-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-12 flex-grow">
        {cargando ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
              <div key={n} className="space-y-4">
                <div className="aspect-square bg-zinc-100 animate-pulse rounded-4xl" />
                <div className="h-4 w-3/4 bg-zinc-100 animate-pulse rounded-full" />
                <div className="h-6 w-1/2 bg-zinc-100 animate-pulse rounded-full" />
              </div>
            ))}
          </div>
        ) : Object.keys(secciones).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <span className="text-6xl mb-6 opacity-20">🔍</span>
            <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">No hay resultados</h2>
            <button onClick={() => { setBusqueda(''); setCategoriaActual('Todos'); }} className="px-8 py-3 bg-black text-white text-[10px] font-black uppercase rounded-2xl">Ver todo</button>
          </div>
        ) : (
          <div className="space-y-20">
            {Object.keys(secciones).map(categoria => (
              <section key={categoria}>
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-xl font-black uppercase tracking-tighter italic">{categoria}</h2>
                  <div className="h-0.5 flex-1 bg-zinc-100"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12 md:gap-x-8">
                  {secciones[categoria].map((prod) => (
                    <div key={prod.id} className="group">
                      <Link href={`/producto/${prod.id}`}>
                        <div className="relative aspect-square mb-5 overflow-hidden rounded-4xl bg-zinc-50 border border-zinc-100 cursor-pointer">
                          {prod.imagen_url && prod.imagen_url.length > 0 && (
                            <img src={prod.imagen_url[0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={prod.nombre} />
                          )}
                          {prod.stock <= 0 && (
                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                              <span className="bg-white border-2 border-black px-4 py-1 rounded-full text-[10px] font-black uppercase">Agotado</span>
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="px-1">
                        <Link href={`/producto/${prod.id}`}>
                          <h3 className="text-[11px] font-black uppercase leading-tight mb-2 h-8 line-clamp-2 cursor-pointer hover:underline">{prod.nombre}</h3>
                        </Link>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-lg font-black tracking-tighter">${prod.precio}</span>
                          <button disabled={prod.stock <= 0} onClick={() => agregarAlCarrito(prod)} className="text-[9px] font-black uppercase px-4 py-2.5 rounded-xl bg-black text-white hover:bg-zinc-800 transition-all flex items-center gap-1 active:scale-95">
                            <span>+</span> Añadir
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>

      {/* --- FOOTER SECCIÓN MINIMALISTA NEGRO --- */}
      <footer className="bg-black py-10 mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/logoososinfondo.png" alt="Logo" className="w-12 h-12 object-contain" />
              <h2 className="text-lg font-black uppercase tracking-tighter italic text-white">Luny Importa2</h2>
            </div>
            
            <div className="flex flex-col md:flex-row items-center gap-6 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              <p>© {new Date().getFullYear()} Luny Importa2</p>
              <div className="hidden md:block w-1 h-1 bg-zinc-800 rounded-full"></div>
              <p>Desarrolado por</p>
              <a href="mailto:martinezmaximilianor@gmail.com" className="hover:text-white transition-colors lowercase">martinezmaximilianor@gmail.com</a>
              <span className="text-zinc-300">Maximiliano Rene Martinez</span>
              <div className="hidden md:block w-1 h-1 bg-zinc-800 rounded-full"></div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}