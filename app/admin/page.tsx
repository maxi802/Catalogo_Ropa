'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORIAS = ["Zapatillas", "Camisetas", "Pantalones", "Conjuntos", "Medias", "Gorras", "Pelotas"];

interface ProductoAdmin {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  stock_talles: { [key: string]: number };
  imagen_url: string[] | string | null;
  descripcion: string;
}

// Definimos un tipo para manejar fotos locales o URLs externas
interface FotoEstado {
  file: File | null;
  preview: string;
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  
  const [tallesNuevo, setTallesNuevo] = useState<{ [key: string]: number }>({});
  const [inputTalle, setInputTalle] = useState('');
  const [inputStockTalle, setInputStockTalle] = useState('');
  const [inputUrlImagen, setInputUrlImagen] = useState('');

  const [fotosLocales, setFotosLocales] = useState<FotoEstado[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileEditInputRef = useRef<HTMLInputElement>(null);

  const [editando, setEditando] = useState<ProductoAdmin | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession) {
        router.replace('/login');
      } else {
        setSession(currentSession);
        setCheckingAuth(false);
        fetchProductos();
      }
    };
    checkUser();
  }, [router]);

  const getUrlsArray = (urls: string[] | string | null | undefined): string[] => {
    if (!urls) return [];
    if (Array.isArray(urls)) return urls.filter(u => u && u.trim() !== "");
    if (typeof urls === 'string') return urls.split(',').map(u => u.trim()).filter(u => u !== "");
    return [];
  };

  const fetchProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*').order('nombre');
    if (data) setProductos(data as ProductoAdmin[]);
    if (error) console.error(error.message);
  };

  const agregarTalle = (esEdicion: boolean) => {
    if (!inputTalle || !inputStockTalle) return;
    const talleKey = inputTalle.toUpperCase().trim();
    const stockVal = parseInt(inputStockTalle);

    if (esEdicion && editando) {
      setEditando({
        ...editando,
        stock_talles: { ...editando.stock_talles, [talleKey]: stockVal }
      });
    } else {
      setTallesNuevo(prev => ({ ...prev, [talleKey]: stockVal }));
    }
    setInputTalle('');
    setInputStockTalle('');
  };

  const agregarUrlImagen = (esEdicion: boolean) => {
    if (!inputUrlImagen.trim()) return;
    const url = inputUrlImagen.trim();

    if (esEdicion && editando) {
      const urls = getUrlsArray(editando.imagen_url);
      setEditando({ ...editando, imagen_url: [...urls, url] });
    } else {
      setFotosLocales(prev => [...prev, { file: null, preview: url }]);
    }
    setInputUrlImagen('');
  };

  const actualizarStockTalle = (talleKey: string, nuevoStock: string, esEdicion: boolean) => {
    const valor = parseInt(nuevoStock) || 0;
    if (esEdicion && editando) {
      setEditando({
        ...editando,
        stock_talles: { ...editando.stock_talles, [talleKey]: valor }
      });
    } else {
      setTallesNuevo(prev => ({ ...prev, [talleKey]: valor }));
    }
  };

  const eliminarTalle = (talleKey: string, esEdicion: boolean) => {
    if (esEdicion && editando) {
      const copia = { ...editando.stock_talles };
      delete copia[talleKey];
      setEditando({ ...editando, stock_talles: copia });
    } else {
      const copia = { ...tallesNuevo };
      delete copia[talleKey];
      setTallesNuevo(copia);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const nuevosArchivos: FotoEstado[] = Array.from(files).map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));

    if (isEdit && editando) {
      const currentUrls = getUrlsArray(editando.imagen_url);
      // Actualizamos fotos locales para la subida posterior
      setFotosLocales(prev => [...prev, ...nuevosArchivos]);
      // Mostramos el preview en el array de urls del producto editando
      setEditando({ ...editando, imagen_url: [...currentUrls, ...nuevosArchivos.map(f => f.preview)] });
    } else {
      setFotosLocales(prev => [...prev, ...nuevosArchivos]);
    }
    e.target.value = '';
  };

  const eliminarFoto = (index: number, isEdit: boolean) => {
    if (isEdit && editando) {
      const nuevasUrls = [...getUrlsArray(editando.imagen_url)];
      const urlAEliminar = nuevasUrls[index];
      nuevasUrls.splice(index, 1);
      setEditando({ ...editando, imagen_url: nuevasUrls });
      if (urlAEliminar.startsWith('blob:')) {
        setFotosLocales(prev => prev.filter(f => f.preview !== urlAEliminar));
      }
    } else {
      setFotosLocales(prev => {
        const nuevaLista = [...prev];
        if (nuevaLista[index].file) URL.revokeObjectURL(nuevaLista[index].preview);
        nuevaLista.splice(index, 1);
        return nuevaLista;
      });
    }
  };

  const eliminarProducto = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?`)) return;
    try {
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      setProductos(productos.filter(p => p.id !== id));
      alert("Eliminado con éxito");
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formElement = e.currentTarget; 
    const formData = new FormData(formElement);
    
    if (!formData.get('nombre') || !formData.get('precio') || !formData.get('categoria') || fotosLocales.length === 0) {
      return alert("Por favor, completa todos los campos obligatorios");
    }

    if (Object.keys(tallesNuevo).length === 0) return alert("Agrega al menos un talle");
    
    setLoading(true);
    setMensaje('Subiendo...');

    try {
      const urlsFinales: string[] = [];
      for (const item of fotosLocales) {
        if (item.file) {
          const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
          const { error: uploadError } = await supabase.storage.from('fotos-productos').upload(fileName, item.file);
          if (uploadError) throw uploadError;
          const { data: { publicUrl } } = supabase.storage.from('fotos-productos').getPublicUrl(fileName);
          urlsFinales.push(publicUrl);
        } else {
          // Es una URL externa directa
          urlsFinales.push(item.preview);
        }
      }

      const { error: dbError } = await supabase.from('productos').insert([{
        nombre: formData.get('nombre'),
        precio: parseFloat(formData.get('precio') as string),
        categoria: formData.get('categoria'),
        stock_talles: tallesNuevo,
        descripcion: formData.get('descripcion'),
        imagen_url: urlsFinales
      }]);

      if (dbError) throw dbError;

      setMensaje('✅ ¡Publicado!');
      setTallesNuevo({});
      setFotosLocales([]);
      formElement.reset(); 
      fetchProductos();
    } catch (err) {
      console.error(err);
      setMensaje(`❌ Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;

    const currentUrls = getUrlsArray(editando.imagen_url);
    if (!editando.nombre || !editando.precio || !editando.categoria || currentUrls.length === 0) {
        return alert("El nombre, precio, categoría e imágenes son obligatorios.");
    }

    setLoading(true);
    try {
      const urlsFinales: string[] = [];

      for (const url of currentUrls) {
        if (url.startsWith('blob:')) {
          const itemLocal = fotosLocales.find(f => f.preview === url);
          if (itemLocal && itemLocal.file) {
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
            const { error: upErr } = await supabase.storage.from('fotos-productos').upload(fileName, itemLocal.file);
            if (upErr) throw upErr;
            const { data: { publicUrl } } = supabase.storage.from('fotos-productos').getPublicUrl(fileName);
            urlsFinales.push(publicUrl);
          }
        } else {
          urlsFinales.push(url);
        }
      }

      const { error: updErr } = await supabase.from('productos').update({
        nombre: editando.nombre,
        precio: editando.precio,
        categoria: editando.categoria,
        descripcion: editando.descripcion,
        stock_talles: editando.stock_talles,
        imagen_url: urlsFinales
      }).eq('id', editando.id);

      if (updErr) throw updErr;

      setEditando(null);
      setFotosLocales([]);
      fetchProductos();
      alert("¡Producto Actualizado Con Exito!");
    } catch (err) {
      alert("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const onDragStart = (index: number) => setDraggedIndex(index);
  const onDragOver = (e: React.DragEvent, index: number, isEdit: boolean) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    if (isEdit && editando) {
      const nuevasUrls = [...getUrlsArray(editando.imagen_url)];
      const item = nuevasUrls.splice(draggedIndex, 1)[0];
      nuevasUrls.splice(index, 0, item);
      setEditando({ ...editando, imagen_url: nuevasUrls });
    } else if (!isEdit) {
      const nuevasFotos = [...fotosLocales];
      const item = nuevasFotos.splice(draggedIndex, 1)[0];
      nuevasFotos.splice(index, 0, item);
      setFotosLocales(nuevasFotos);
    }
    setDraggedIndex(index);
  };

  if (checkingAuth) return <div className="min-h-screen flex items-center justify-center font-black uppercase text-xs tracking-widest">Cargando Sistema...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8 text-black font-sans">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between items-center mb-8 bg-white p-3 rounded-2xl border border-zinc-100 shadow-sm">
          <Link href="/" className="text-[10px] font-black uppercase bg-zinc-50 px-4 py-2 rounded-xl border border-zinc-200 hover:bg-black hover:text-white transition-colors">← Volver al Catalogo</Link>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[8px] font-black uppercase text-zinc-400 italic">Sesión iniciada</span>
              <span className="text-[10px] font-bold text-black">{session?.user?.email}</span>
            </div>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[10px] font-black uppercase bg-red-500 text-white px-4 py-2 rounded-xl hover:bg-red-600 transition-colors shadow-lg shadow-red-100">Cerrar Sesion</button>
          </div>
        </div>

        {/* PANEL NUEVO PRODUCTO */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl mb-12">
          <h2 className="text-xl font-black uppercase italic mb-6">Nuevo Producto</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Agregar Fotos *</label>
              
              <div className="flex gap-3 overflow-x-auto pb-2">
                <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 shrink-0 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer">
                  <span className="text-xl">+</span>
                  <input type="file" multiple ref={fileInputRef} onChange={(e) => handleFileChange(e, false)} className="hidden" accept="image/*" />
                </div>
                {fotosLocales.map((foto, i) => (
                  <div key={i} draggable onDragStart={() => onDragStart(i)} onDragOver={(e) => onDragOver(e, i, false)} className="relative w-24 h-24 shrink-0 rounded-3xl overflow-hidden border bg-white">
                    <img src={foto.preview} className="w-full h-full object-cover" alt="" />
                    <button type="button" onClick={() => eliminarFoto(i, false)} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px]">✕</button>
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <input value={inputUrlImagen} onChange={e => setInputUrlImagen(e.target.value)} placeholder="Pegar URL de imagen... (Opcional)" className="flex-1 p-3 bg-zinc-50 rounded-xl text-xs font-bold border border-zinc-100 outline-none" />
                <button type="button" onClick={() => agregarUrlImagen(false)} className="bg-zinc-100 px-4 rounded-xl font-black text-[10px] uppercase">Añadir URL</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Nombre *</label>
                <input name="nombre" required className="w-full p-4 bg-zinc-50 rounded-2xl font-bold border border-zinc-100 outline-none focus:border-black" />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Categoría *</label>
                <select name="categoria" required className="w-full p-4 bg-zinc-50 rounded-2xl font-bold border border-zinc-100 outline-none appearance-none">
                  <option value="">Seleccionar...</option>
                  {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
            </div>

            <div className="p-6 bg-zinc-50 rounded-4xl border border-zinc-100 space-y-4">
              <label className="text-[10px] font-black uppercase text-zinc-400 italic">Talles y Stock *</label>
              <div className="flex gap-2">
                <input value={inputTalle} onChange={e => setInputTalle(e.target.value)} placeholder="Talle" className="flex-1 p-3 rounded-xl text-xs font-bold uppercase" />
                <input value={inputStockTalle} onChange={e => setInputStockTalle(e.target.value)} type="number" placeholder="Stock" className="w-20 p-3 rounded-xl text-xs font-bold" />
                <button type="button" onClick={() => agregarTalle(false)} className="bg-black text-white px-5 rounded-xl font-black">+</button>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(tallesNuevo).map(([t, s]) => (
                  <div key={t} className="flex items-center gap-2 bg-white border border-zinc-200 px-3 py-2 rounded-xl">
                    <span className="text-[10px] font-black uppercase">{t}:</span>
                    <input type="number" value={s} onChange={(e) => actualizarStockTalle(t, e.target.value, false)} className="w-12 text-[10px] font-bold outline-none" />
                    <button type="button" onClick={() => eliminarTalle(t, false)} className="text-red-500 font-bold ml-1">×</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Descripción (Opcional)</label>
              <textarea name="descripcion" rows={2} className="w-full p-4 bg-zinc-50 rounded-2xl font-bold border border-zinc-100 outline-none" />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Precio ($) *</label>
              <input name="precio" type="number" step="0.01" required className="w-full p-4 bg-zinc-50 rounded-2xl font-bold border border-zinc-100 outline-none" />
            </div>

            <button disabled={loading} className="w-full py-5 bg-black text-white rounded-3xl font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              {loading ? 'Subiendo...' : 'Publicar Producto'}
            </button>
          </form>
          {mensaje && <p className="mt-4 text-center text-[10px] font-black uppercase">{mensaje}</p>}
        </div>

        {/* LISTADO DE PRODUCTOS */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-zinc-100 space-y-3">
          {productos.map((prod) => (
            <div key={prod.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-3xl border border-zinc-100">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl overflow-hidden shadow-inner border border-zinc-200">
                  <img src={getUrlsArray(prod.imagen_url)[0]} className="w-full h-full object-cover" alt="" />
                </div>
                <div>
                  <p className="text-[11px] font-black uppercase leading-tight">{prod.nombre}</p>
                  <p className="text-[8px] font-bold text-zinc-400 uppercase">
                    {Object.entries(prod.stock_talles || {}).map(([t, s]) => `${t}(${s})`).join(' | ')}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditando(prod)} className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center">✏️</button>
                <button onClick={() => eliminarProducto(prod.id, prod.nombre)} className="w-10 h-10 bg-white border border-red-100 rounded-xl flex items-center justify-center">🗑️</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* MODAL EDICION */}
      {editando && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setEditando(null); setFotosLocales([]); }} />
          <form onSubmit={handleUpdate} className="relative bg-white w-full max-w-lg p-8 rounded-[3rem] shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
            <h2 className="text-2xl font-black uppercase italic">Editar Producto</h2>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Gestionar Imágenes (Archivo o URL) *</label>
                
                <div className="flex gap-3 overflow-x-auto pb-2">
                  <div onClick={() => fileEditInputRef.current?.click()} className="w-20 h-20 shrink-0 bg-zinc-50 rounded-2xl border-2 border-dashed border-zinc-200 flex items-center justify-center cursor-pointer">
                    <span className="text-lg">+</span>
                    <input type="file" multiple ref={fileEditInputRef} onChange={(e) => handleFileChange(e, true)} className="hidden" accept="image/*" />
                  </div>
                  {getUrlsArray(editando.imagen_url).map((url, i) => (
                    <div key={i} draggable onDragStart={() => onDragStart(i)} onDragOver={(e) => onDragOver(e, i, true)} className="relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden border bg-white cursor-move">
                      <img src={url} className="w-full h-full object-cover" alt="" />
                      <button type="button" onClick={() => eliminarFoto(i, true)} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px]">✕</button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                    <input value={inputUrlImagen} onChange={e => setInputUrlImagen(e.target.value)} placeholder="Pegar URL de nueva imagen..." className="flex-1 p-2 bg-zinc-100 rounded-xl text-[10px] font-bold outline-none" />
                    <button type="button" onClick={() => agregarUrlImagen(true)} className="bg-black text-white px-3 rounded-xl font-bold text-[10px] uppercase">Añadir</button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Nombre *</label>
                    <input required value={editando.nombre} onChange={e => setEditando({...editando, nombre: e.target.value})} className="w-full p-4 bg-zinc-100 rounded-2xl font-bold border-none outline-none" />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Categoría *</label>
                    <select required value={editando.categoria} onChange={e => setEditando({...editando, categoria: e.target.value})} className="w-full p-4 bg-zinc-100 rounded-2xl font-bold border-none outline-none appearance-none">
                        {CATEGORIAS.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
              </div>
              
              <div className="p-4 bg-zinc-50 rounded-2xl space-y-3 border border-zinc-100">
                <label className="text-[10px] font-black uppercase text-zinc-400 italic">Talles y Stock *</label>
                <div className="flex gap-2">
                  <input value={inputTalle} onChange={e => setInputTalle(e.target.value)} placeholder="Talle" className="flex-1 p-2 rounded-lg text-xs font-bold uppercase" />
                  <input value={inputStockTalle} onChange={e => setInputStockTalle(e.target.value)} type="number" placeholder="Cant." className="w-16 p-2 rounded-lg text-xs font-bold" />
                  <button type="button" onClick={() => agregarTalle(true)} className="bg-black text-white px-3 rounded-lg font-bold">+</button>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {Object.entries(editando.stock_talles || {}).map(([t, s]) => (
                    <div key={t} className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-zinc-200 shadow-sm focus-within:border-black">
                      <span className="text-[10px] font-black uppercase text-zinc-400">{t}:</span>
                      <input type="number" value={s} onChange={(e) => actualizarStockTalle(t, e.target.value, true)} className="w-10 text-[10px] font-black outline-none bg-transparent" />
                      <button type="button" onClick={() => eliminarTalle(t, true)} className="text-red-500 font-bold ml-1 hover:scale-110">×</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Precio ($) *</label>
                <input required type="number" step="0.01" value={editando.precio} onChange={e => setEditando({...editando, precio: parseFloat(e.target.value)})} className="w-full p-4 bg-zinc-100 rounded-2xl font-bold border-none outline-none" />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Descripción (Opcional)</label>
                <textarea value={editando.descripcion} onChange={e => setEditando({...editando, descripcion: e.target.value})} rows={2} className="w-full p-4 bg-zinc-100 rounded-2xl font-bold border-none outline-none resize-none" />
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => { setEditando(null); setFotosLocales([]); }} className="flex-1 py-4 bg-zinc-100 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
              <button disabled={loading} className="flex-2 py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">
                {loading ? 'Guardando...' : 'Confirmar Cambios'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}