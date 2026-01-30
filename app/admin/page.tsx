'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const CATEGORIAS = ["Zapatillas","Camisetas","Pantalones", "Conjuntos", "Medias", "Gorras","Pelotas"];

interface ProductoAdmin {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  stock: number;
  imagen_url: string[] | string | null; 
  descripcion: string;
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  
  const [fotosLocales, setFotosLocales] = useState<{file: File, preview: string}[]>([]);
  const [urlsExternas, setUrlsExternas] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editando, setEditando] = useState<ProductoAdmin | null>(null);
  const [archivoParaSubir, setArchivoParaSubir] = useState<{file: File, tempUrl: string} | null>(null);
  const fileEditInputRef = useRef<HTMLInputElement>(null);

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
    if (typeof urls === 'string') {
      return urls.split(',').map(u => u.trim()).filter(u => u !== "");
    }
    return [];
  };

  const fetchProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*').order('nombre');
    if (data) setProductos(data as ProductoAdmin[]);
  };

  const eliminarProducto = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar "${nombre}"?`)) return;
    try {
      const productoAEliminar = productos.find(p => p.id === id);
      if (productoAEliminar) {
        const urls = getUrlsArray(productoAEliminar.imagen_url);
        const fotosStorage = urls
          .filter(url => url.includes('fotos-productos'))
          .map(url => {
            const partes = url.split('/');
            return partes[partes.length - 1];
          });

        if (fotosStorage.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('fotos-productos')
            .remove(fotosStorage);
          if (storageError) console.error("Error borrando archivos:", storageError);
        }
      }
      const { error } = await supabase.from('productos').delete().eq('id', id);
      if (error) throw error;
      setProductos(productos.filter(p => p.id !== id));
      alert("Producto y sus fotos eliminados con éxito");
    } catch (err) {
      alert(`Error al eliminar: ${(err as Error).message}`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (isEdit && editando) {
        const file = files[0];
        const tempUrl = URL.createObjectURL(file);
        setArchivoParaSubir({ file, tempUrl });
        const currentUrls = getUrlsArray(editando.imagen_url);
        setEditando({ ...editando, imagen_url: [tempUrl, ...currentUrls] });
    } else {
        const nuevosArchivos = Array.from(files).map(file => ({
            file,
            preview: URL.createObjectURL(file)
        }));
        setFotosLocales(prev => [...prev, ...nuevosArchivos]);
    }
    e.target.value = '';
  };

  const eliminarFotoLocal = (index: number) => {
    setFotosLocales(prev => {
        const nuevaLista = [...prev];
        URL.revokeObjectURL(nuevaLista[index].preview);
        nuevaLista.splice(index, 1);
        return nuevaLista;
    });
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editando) return;
    setLoading(true);
    try {
      let urlsFinales = [...getUrlsArray(editando.imagen_url)];
      if (archivoParaSubir) {
        const ext = archivoParaSubir.file.name.split('.').pop();
        const fileName = `${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from('fotos-productos')
          .upload(fileName, archivoParaSubir.file);
        if (uploadError) throw uploadError;
        const { data: { publicUrl } } = supabase.storage
          .from('fotos-productos')
          .getPublicUrl(fileName);
        urlsFinales = urlsFinales.map(u => u === archivoParaSubir.tempUrl ? publicUrl : u);
      }
      const urlsParaEnviar = urlsFinales.filter(u => u && !u.startsWith('blob:'));
      const { error } = await supabase.from('productos').update({
        nombre: editando.nombre,
        precio: Number(editando.precio) || 0,
        stock: Number(editando.stock) || 0,
        descripcion: editando.descripcion || "",
        categoria: editando.categoria || "General",
        imagen_url: urlsParaEnviar 
      }).eq('id', editando.id);
      if (error) throw error;
      setEditando(null);
      setArchivoParaSubir(null);
      fetchProductos();
      alert("¡Producto actualizado!");
    } catch (err) {
      alert("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setLoading(true);
    setMensaje('');

    try {
      const urlsSubidas: string[] = [];
      for (const item of fotosLocales) {
        const ext = item.file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const { error: upError } = await supabase.storage.from('fotos-productos').upload(fileName, item.file);
        if (upError) throw upError;
        const { data: { publicUrl } } = supabase.storage.from('fotos-productos').getPublicUrl(fileName);
        urlsSubidas.push(publicUrl);
      }
      const urlsFinales = [...urlsSubidas, ...urlsExternas];
      const { error: insertError } = await supabase.from('productos').insert([{
        nombre: formData.get('nombre') as string,
        precio: parseFloat(formData.get('precio') as string) || 0,
        categoria: formData.get('categoria') as string,
        stock: parseInt(formData.get('stock') as string) || 0,
        descripcion: formData.get('descripcion') as string || "",
        imagen_url: urlsFinales 
      }]);
      if (insertError) throw insertError;
      setMensaje('✅ ¡Publicado con éxito!');
      setFotosLocales([]);
      setUrlsExternas([]);
      form.reset();
      fetchProductos();
    } catch (err) {
      setMensaje(`❌ Error: ${(err as Error).message || 'No se pudo publicar'}`);
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
      const itemArrastrado = nuevasUrls[draggedIndex];
      nuevasUrls.splice(draggedIndex, 1);
      nuevasUrls.splice(index, 0, itemArrastrado);
      setDraggedIndex(index);
      setEditando({ ...editando, imagen_url: nuevasUrls });
    } else if (!isEdit) {
      const nuevasFotos = [...fotosLocales];
      const itemArrastrado = nuevasFotos[draggedIndex];
      nuevasFotos.splice(draggedIndex, 1);
      nuevasFotos.splice(index, 0, itemArrastrado);
      setDraggedIndex(index);
      setFotosLocales(nuevasFotos);
    }
  };

  const eliminarFotoDeEdicion = (indexAEliminar: number) => {
    if (!editando) return;
    const actuales = getUrlsArray(editando.imagen_url);
    const nuevasUrls = actuales.filter((_, index) => index !== indexAEliminar);
    setEditando({ ...editando, imagen_url: nuevasUrls });
  };

  if (checkingAuth) return <div className="min-h-screen flex items-center justify-center font-black animate-pulse uppercase">Cargando Admin...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8 text-black font-sans">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-[10px] font-black uppercase bg-white px-4 py-2 rounded-xl border border-zinc-200 shadow-sm">← Volver al Catalogo</Link>
          <div className="text-center">
            <p className="text-[8px] font-black uppercase text-zinc-400">Administrador Logueado</p>
            <p className="text-[10px] font-bold italic">{session?.user.email}</p>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[10px] font-black uppercase bg-red-500 text-white px-4 py-2 rounded-xl">Cerrar Session</button>
        </div>

        {/* --- FORMULARIO NUEVO PRODUCTO --- */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl mb-12">
          <h2 className="text-xl font-black uppercase italic mb-6">Nuevo Producto</h2>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Galería de fotos (Arrastra para reordenar)</label>
              <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                <div onClick={() => fileInputRef.current?.click()} className="w-24 h-24 shrink-0 bg-zinc-50 rounded-3xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-100 transition-all">
                  <span className="text-xl">+</span>
                  <input type="file" multiple ref={fileInputRef} onChange={(e) => handleFileChange(e, false)} className="hidden" accept="image/*" />
                </div>
                {fotosLocales.map((foto, i) => (
                  <div 
                    key={`local-${i}`} 
                    draggable 
                    onDragStart={() => onDragStart(i)}
                    onDragOver={(e) => onDragOver(e, i, false)}
                    onDragEnd={() => setDraggedIndex(null)}
                    className={`relative w-24 h-24 shrink-0 rounded-3xl overflow-hidden border cursor-move transition-all ${draggedIndex === i ? 'opacity-30 scale-95' : ''}`}
                  >
                    <img src={foto.preview} className="w-full h-full object-cover pointer-events-none" alt="" />
                    <button type="button" onClick={() => eliminarFotoLocal(i)} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px]">✕</button>
                  </div>
                ))}
                {urlsExternas.map((url, i) => (
                  <div key={`ext-${i}`} className="relative w-24 h-24 shrink-0 rounded-3xl overflow-hidden border">
                    <img src={url} className="w-full h-full object-cover" alt="" />
                    <button type="button" onClick={() => setUrlsExternas(urlsExternas.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px]">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">URL Imagen Externa</label>
                <input 
                  placeholder="Pegar URL de imagen externa y Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = e.currentTarget.value.trim();
                      if (val) { setUrlsExternas([...urlsExternas, val]); e.currentTarget.value = ""; }
                    }
                  }}
                  className="w-full p-4 bg-zinc-50 rounded-2xl border border-zinc-100 font-bold text-xs outline-none focus:border-black transition-all"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Nombre del Producto</label>
                  <input name="nombre" placeholder="Nombre" required className="w-full p-4 bg-zinc-50 rounded-2xl font-bold border border-zinc-100 outline-none focus:border-black transition-all" />
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Categoría</label>
                  <select name="categoria" required defaultValue="" className="w-full p-4 bg-zinc-50 rounded-2xl font-bold border border-zinc-100 outline-none focus:border-black transition-all appearance-none cursor-pointer">
                    <option value="" disabled>Elegir Categoría</option>
                    {CATEGORIAS.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Descripción</label>
                <textarea name="descripcion" placeholder="Descripción del producto..." rows={3} className="w-full p-4 bg-zinc-50 rounded-2xl font-bold border border-zinc-100 outline-none focus:border-black transition-all resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Precio ($)</label>
                  <input name="precio" type="number" step="0.01" placeholder="0.00" required className="w-full p-4 bg-zinc-50 rounded-2xl font-bold border border-zinc-100 outline-none focus:border-black transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Stock (Unidades)</label>
                  <input name="stock" type="number" placeholder="0" required className="w-full p-4 bg-zinc-50 rounded-2xl font-bold border border-zinc-100 outline-none focus:border-black transition-all" />
                </div>
              </div>
            </div>

            <button disabled={loading} className="w-full py-5 bg-black text-white rounded-3xl font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-black/10">
              {loading ? 'Subiendo...' : 'Publicar Producto'}
            </button>
          </form>
          {mensaje && <p className="mt-4 text-center text-[10px] font-black uppercase">{mensaje}</p>}
        </div>

        {/* --- LISTADO --- */}
        <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-zinc-100">
          <div className="space-y-3">
            {productos.map((prod) => (
              <div key={prod.id} className="flex items-center justify-between p-4 bg-zinc-50 rounded-3xl border border-zinc-100 gap-4">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 shrink-0 rounded-xl bg-white overflow-hidden shadow-sm flex items-center justify-center">
                    {getUrlsArray(prod.imagen_url)[0] ? (
                      <img src={getUrlsArray(prod.imagen_url)[0]} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <span className="text-[8px] font-black text-zinc-300">N/A</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase leading-tight wrap-break-word">{prod.nombre}</p>
                    <p className="text-[8px] font-bold text-zinc-400 uppercase mt-0.5">{prod.categoria}</p>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setEditando(prod)} className="w-10 h-10 bg-white border border-zinc-200 rounded-xl flex items-center justify-center shadow-sm hover:bg-black hover:text-white transition-all">✏️</button>
                  <button onClick={() => eliminarProducto(prod.id, prod.nombre)} className="w-10 h-10 bg-white border border-red-100 rounded-xl flex items-center justify-center shadow-sm hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- MODAL EDITAR --- */}
      {editando && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditando(null)} />
          <form onSubmit={handleUpdate} className="relative bg-white w-full max-w-lg p-8 rounded-[3rem] shadow-2xl space-y-5 overflow-y-auto max-h-[85vh] border border-zinc-200 no-scrollbar">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter">Editar Datos</h2>
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Galería (Arrastra para reordenar)</label>
              <div className="flex gap-3 overflow-x-auto pb-2 items-center no-scrollbar">
                <div onClick={() => fileEditInputRef.current?.click()} className="w-20 h-20 shrink-0 bg-zinc-100 rounded-2xl border-2 border-dashed border-zinc-300 flex items-center justify-center cursor-pointer">
                  <span className="text-xl">+</span>
                  <input type="file" ref={fileEditInputRef} onChange={(e) => handleFileChange(e, true)} className="hidden" />
                </div>
                {getUrlsArray(editando.imagen_url).map((url, index) => (
                  <div key={index} draggable onDragStart={() => onDragStart(index)} onDragOver={(e) => onDragOver(e, index, true)} onDragEnd={() => setDraggedIndex(null)}
                    className={`relative w-20 h-20 shrink-0 rounded-2xl overflow-hidden border-2 cursor-move transition-all ${draggedIndex === index ? 'opacity-30 scale-95' : 'border-zinc-100'}`}>
                    <img src={url} className="w-full h-full object-cover pointer-events-none" alt="" />
                    <button type="button" onClick={() => eliminarFotoDeEdicion(index)} className="absolute top-1 right-1 bg-red-500 text-white w-5 h-5 rounded-full text-[10px] flex items-center justify-center">✕</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Nombre</label>
                  <input value={editando.nombre} onChange={e => setEditando({...editando, nombre: e.target.value})} className="w-full p-4 bg-zinc-100 rounded-2xl font-bold border-none outline-none" placeholder="Nombre" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Categoría</label>
                  <select value={editando.categoria} onChange={e => setEditando({...editando, categoria: e.target.value})} className="w-full p-4 bg-zinc-100 rounded-2xl font-bold border-none outline-none appearance-none cursor-pointer">
                    {CATEGORIAS.map(cat => (<option key={cat} value={cat}>{cat}</option>))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Descripción</label>
                <textarea value={editando.descripcion || ""} onChange={e => setEditando({...editando, descripcion: e.target.value})} rows={3} className="w-full p-4 bg-zinc-100 rounded-2xl font-bold border-none outline-none resize-none" placeholder="Descripción" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Precio ($)</label>
                  <input type="number" step="0.01" value={editando.precio} onChange={e => setEditando({...editando, precio: parseFloat(e.target.value)})} className="w-full p-4 bg-zinc-100 rounded-2xl font-bold border-none outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2 italic">Stock</label>
                  <input type="number" value={editando.stock} onChange={e => setEditando({...editando, stock: parseInt(e.target.value)})} className="w-full p-4 bg-zinc-100 rounded-2xl font-bold border-none outline-none" />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4 sticky bottom-0 bg-white">
              <button type="button" onClick={() => setEditando(null)} className="flex-1 py-4 bg-zinc-100 rounded-2xl font-black uppercase text-[10px]">Cancelar</button>
              <button disabled={loading} className="flex-2 py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all">
                {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}