'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { enviarPedidoWhatsApp, CartItem } from '@/lib/whatsapp'; 
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
  stock_talles: { [talle: string]: number }; 
}

interface ItemCarrito extends Producto {
  cantidad: number;
  talleSeleccionado: string;
}

export default function TiendaPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [categoriaActual, setCategoriaActual] = useState('Todos');
  const [cargando, setCargando] = useState(true);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [seleccionarTalleId, setSeleccionarTalleId] = useState<string | null>(null);
  
  const pathname = usePathname();
  const cargadoInicial = useRef(false);

  const sincronizarTodo = useCallback(() => {
    const guardado = localStorage.getItem('carrito');
    if (guardado) {
      try {
        const carritoParseado = JSON.parse(guardado);
        setCarrito(carritoParseado);
      } catch (e) { console.error(e); }
    }
    if (localStorage.getItem('abrirCarrito') === 'true') {
      setCarritoAbierto(true);
      localStorage.removeItem('abrirCarrito');
    }
    setTimeout(() => { cargadoInicial.current = true; }, 300);
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
    if (cargadoInicial.current) {
      localStorage.setItem('carrito', JSON.stringify(carrito));
    }
  }, [carrito]);

  const fetchProductos = useCallback(async () => {
    try {
      setCargando(true);
      const { data, error } = await supabase.from('productos').select('*').order('categoria', { ascending: true });
      if (data) setProductos(data);
    } finally { setCargando(false); }
  }, []);

  useEffect(() => { fetchProductos(); }, [fetchProductos]);

  const agregarAlCarrito = (producto: Producto, talle: string) => {
    const stockDisponible = producto.stock_talles[talle] || 0;
    setCarrito(prev => {
      const existe = prev.find(item => item.id === producto.id && item.talleSeleccionado === talle);
      if (existe) {
        if (existe.cantidad >= stockDisponible) {
          alert(`⚠️ No hay más stock disponible para el talle ${talle}. Solo quedan ${stockDisponible} unidades.`);
          return prev;
        }
        return prev.map(item => 
          (item.id === producto.id && item.talleSeleccionado === talle) 
          ? { ...item, cantidad: item.cantidad + 1 } : item
        );
      }
      return [...prev, { ...producto, cantidad: 1, talleSeleccionado: talle }];
    });
    setSeleccionarTalleId(null);
    setCarritoAbierto(true);
  };

  const modificarCantidad = (id: string, talle: string, delta: number) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id && item.talleSeleccionado === talle) {
        const nuevaCant = item.cantidad + delta;
        const stockMax = item.stock_talles[talle] || 0;
        
        if (delta > 0 && nuevaCant > stockMax) {
          alert(`⚠️ Límite de stock alcanzado (${stockMax} disponibles)`);
          return item;
        }
        
        return { ...item, cantidad: Math.max(0, nuevaCant) };
      }
      return item;
    }).filter(item => item.cantidad > 0));
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  // CORRECCIÓN DEL ERROR DE TIPO PARA WHATSAPP
  const handleFinalizarCompra = () => {
    const itemsParaWhatsApp: CartItem[] = carrito.map(item => ({
      nombre: item.nombre,
      precio: item.precio,
      cantidad: item.cantidad,
      talle: item.talleSeleccionado, // Mapeamos talleSeleccionado a talle
      imagen_url: item.imagen_url
    }));
    enviarPedidoWhatsApp(itemsParaWhatsApp, totalCarrito);
  };

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
    ORDEN_PRIORIDAD.forEach(cat => { if (grupos[cat]) gruposOrdenados[cat] = grupos[cat]; });
    Object.keys(grupos).forEach(cat => { if (!gruposOrdenados[cat]) gruposOrdenados[cat] = grupos[cat]; });
    return gruposOrdenados;
  }, [productos, categoriaActual, busqueda]);

  return (
    <div className="min-h-screen bg-white font-sans text-black overflow-x-hidden flex flex-col">
      {/* Botón Flotante Carrito */}
      <button 
        onClick={() => setCarritoAbierto(true)}
        className="fixed bottom-8 right-8 z-50 bg-black text-white p-6 rounded-full shadow-2xl hover:scale-110 transition-transform active:scale-95"
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
              <h2 className="text-2xl font-black uppercase italic tracking-tighter">Tu Carrito</h2>
              <button onClick={() => setCarritoAbierto(false)} className="text-xs font-bold uppercase text-zinc-400">Cerrar</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar">
              {carrito.length === 0 ? (
                <p className="text-center text-zinc-300 font-bold uppercase py-20 italic">El carrito está vacío</p>
              ) : (
                carrito.map(item => (
                  <div key={`${item.id}-${item.talleSeleccionado}`} className="flex gap-4 items-center bg-zinc-50 p-4 rounded-3xl">
                    <img src={item.imagen_url[0]} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                    <div className="flex-1">
                      <h4 className="text-[10px] font-black uppercase truncate">{item.nombre}</h4>
                      <p className="text-[9px] text-zinc-500 font-bold uppercase">Talle: {item.talleSeleccionado}</p>
                      <p className="text-xs font-bold">$ {item.precio * item.cantidad}</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white px-3 py-1 rounded-full border">
                      <button onClick={() => modificarCantidad(item.id, item.talleSeleccionado, -1)} className="font-bold">-</button>
                      <span className="text-xs font-black">{item.cantidad}</span>
                      <button onClick={() => modificarCantidad(item.id, item.talleSeleccionado, 1)} className="font-bold">+</button>
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
                onClick={handleFinalizarCompra}
                className="w-full bg-[#25D366] text-white py-6 rounded-4xl font-black uppercase tracking-widest hover:bg-[#20ba5a] transition-all shadow-xl shadow-green-500/20 flex items-center justify-center gap-3"
              >
                Finalizar Pedido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logoososinfondo.png" alt="Logo" className="w-24 h-24 object-contain" />
              <h1 className="text-3xl font-black uppercase tracking-tighter italic">Luny Importa2</h1>
            </div>
            <input 
              type="text" 
              placeholder="Buscar prenda..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full md:w-80 bg-zinc-100 border-none rounded-2xl px-6 py-3 text-sm focus:ring-2 ring-black outline-none"
            />
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12 grow">
        {cargando ? (
           <div className="grid grid-cols-2 md:grid-cols-4 gap-8 animate-pulse">
             {[1,2,3,4].map(n => <div key={n} className="aspect-square bg-zinc-100 rounded-4xl" />)}
           </div>
        ) : (
          <div className="space-y-20">
            {Object.keys(secciones).map(categoria => (
              <section key={categoria}>
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-xl font-black uppercase tracking-tighter italic">{categoria}</h2>
                  <div className="h-0.5 flex-1 bg-zinc-100"></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-12">
                  {secciones[categoria].map((prod) => (
                    <div key={prod.id} className="group flex flex-col">
                      <Link href={`/producto/${prod.id}`}>
                        <div className="relative aspect-square mb-5 overflow-hidden rounded-4xl bg-zinc-50 border border-zinc-100 cursor-pointer">
                          <img src={prod.imagen_url[0]} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt={prod.nombre} />
                        </div>
                      </Link>
                      
                      <div className="px-1 flex flex-col grow">
                        <Link href={`/producto/${prod.id}`}>
                          <h3 className="text-[11px] font-black uppercase leading-tight mb-2 h-8 line-clamp-2 hover:underline cursor-pointer">{prod.nombre}</h3>
                        </Link>

                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {Object.entries(prod.stock_talles || {}).map(([talle, stock]) => (
                            <div 
                              key={talle}
                              title={stock > 0 ? `Stock: ${stock}` : 'Sin stock'}
                              className={`w-7 h-7 rounded-full border flex items-center justify-center text-[9px] font-bold transition-all
                                ${stock > 0 
                                  ? 'border-black text-black hover:bg-black hover:text-white cursor-pointer' 
                                  : 'border-zinc-200 text-zinc-300 bg-zinc-50 overflow-hidden relative after:content-[""] after:absolute after:w-full after:h-px after:bg-zinc-300 after:rotate-45'
                                }`}
                              onClick={() => stock > 0 && agregarAlCarrito(prod, talle)}
                            >
                              {talle}
                            </div>
                          ))}
                        </div>

                        <div className="mt-auto flex items-center justify-between">
                          <span className="text-lg font-black tracking-tighter">${prod.precio}</span>
                          
                          <div className="relative">
                            <button 
                              onClick={() => setSeleccionarTalleId(seleccionarTalleId === prod.id ? null : prod.id)}
                              className="text-[9px] font-black uppercase px-4 py-2.5 rounded-xl bg-black text-white hover:bg-zinc-800 transition-all active:scale-95 flex items-center gap-1"
                            >
                              {seleccionarTalleId === prod.id ? 'Cerrar' : '+ Añadir'}
                            </button>

                            {seleccionarTalleId === prod.id && (
                              <div className="absolute bottom-full right-0 mb-3 bg-white border border-zinc-100 shadow-2xl p-5 rounded-4xl z-30 min-w-45 animate-in fade-in zoom-in duration-200">
                                <p className="text-[10px] font-black uppercase mb-4 text-zinc-400 tracking-widest text-center">¿Qué talle buscas?</p>
                                <div className="grid grid-cols-2 gap-2">
                                  {Object.entries(prod.stock_talles).map(([talle, cant]) => (
                                    <button
                                      key={talle}
                                      disabled={cant <= 0}
                                      onClick={() => agregarAlCarrito(prod, talle)}
                                      className={`py-3 rounded-xl text-[10px] font-black uppercase border transition-all
                                        ${cant > 0 
                                          ? 'border-black hover:bg-black hover:text-white' 
                                          : 'opacity-10 border-zinc-300 cursor-not-allowed'}`}
                                    >
                                      {talle}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
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

      <footer className="bg-black py-10 mt-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/logoososinfondo.png" alt="Logo" className="w-12 h-12 object-contain" />
              <h2 className="text-lg font-black uppercase tracking-tighter italic text-white">Luny Importa2</h2>
            </div>
            <div className="flex flex-col md:flex-row items-center gap-6 text-[9px] font-black uppercase tracking-widest text-zinc-500">
              <p>© {new Date().getFullYear()} Luny Importa2</p>
              <p>Desarrollado por <span className="text-zinc-300">Maximiliano Rene Martinez</span></p>
              <a href="mailto:martinezmaximilianor@gmail.com" className="hover:text-white transition-colors lowercase">martinezmaximilianor@gmail.com</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}