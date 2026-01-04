'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient, Session } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface ProductoAdmin {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  stock: number;
  imagen_url: string;
  descripcion: string;
}

export default function AdminPage() {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [productos, setProductos] = useState<ProductoAdmin[]>([]);
  
  const [fotoArchivo, setFotoArchivo] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [editando, setEditando] = useState<ProductoAdmin | null>(null);
  const [fotoEditArchivo, setFotoEditArchivo] = useState<File | null>(null);
  const [previewEditUrl, setPreviewEditUrl] = useState<string | null>(null);
  const fileEditInputRef = useRef<HTMLInputElement>(null);

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

  const fetchProductos = async () => {
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('nombre');
    
    if (error) return;
    if (data) setProductos(data as ProductoAdmin[]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit: boolean) => {
    const file = e.target.files?.[0];
    if (file) {
      if (isEdit) {
        setFotoEditArchivo(file);
        setPreviewEditUrl(URL.createObjectURL(file));
      } else {
        setFotoArchivo(file);
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const eliminarProducto = async (id: string, nombre: string, imageUrl: string) => {
    const confirmar = window.confirm(`¿Estás seguro de eliminar "${nombre}"?`);
    if (confirmar) {
      try {
        if (imageUrl && imageUrl.includes('fotos-productos')) {
          const nombreArchivo = imageUrl.split('/').pop();
          if (nombreArchivo) {
            await supabase.storage.from('fotos-productos').remove([nombreArchivo]);
          }
        }
        await supabase.from('productos').delete().eq('id', id);
        setProductos(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        console.error("Error al eliminar", err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    if (!fotoArchivo) return setMensaje('❌ Selecciona una foto');
    setLoading(true);

    try {
      const ext = fotoArchivo.name.split('.').pop();
      const fileName = `${Date.now()}.${ext}`;
      await supabase.storage.from('fotos-productos').upload(fileName, fotoArchivo);
      const { data: { publicUrl } } = supabase.storage.from('fotos-productos').getPublicUrl(fileName);

      const { error } = await supabase.from('productos').insert([{
        nombre: formData.get('nombre') as string,
        precio: parseFloat(formData.get('precio') as string) || 0,
        categoria: formData.get('categoria') as string,
        stock: parseInt(formData.get('stock') as string) || 0,
        descripcion: formData.get('descripcion') as string,
        imagen_url: publicUrl
      }]);

      if (error) throw error;
      setMensaje('✅ ¡Publicado!');
      form.reset();
      setPreviewUrl(null);
      setFotoArchivo(null);
      fetchProductos();
    } catch (err) {
      setMensaje('❌ Error al subir');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editando) return;
    setLoading(true);

    try {
      let urlFinal = editando.imagen_url;

      if (fotoEditArchivo) {
        const ext = fotoEditArchivo.name.split('.').pop();
        const fileName = `${Date.now()}.${ext}`;
        await supabase.storage.from('fotos-productos').upload(fileName, fotoEditArchivo);
        const { data: { publicUrl } } = supabase.storage.from('fotos-productos').getPublicUrl(fileName);
        urlFinal = publicUrl;
      }

      const { error } = await supabase.from('productos').update({
        nombre: editando.nombre,
        precio: editando.precio || 0,
        categoria: editando.categoria,
        stock: editando.stock || 0,
        descripcion: editando.descripcion || "",
        imagen_url: urlFinal
      }).eq('id', editando.id);

      if (error) throw error;
      
      setEditando(null);
      setFotoEditArchivo(null);
      setPreviewEditUrl(null);
      fetchProductos();
      alert("¡Actualizado con éxito!");
    } catch (err) {
      alert("Error al actualizar");
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return <div className="min-h-screen bg-white flex items-center justify-center text-black font-bold uppercase animate-pulse italic">Cargando Panel...</div>;

  return (
    <div className="min-h-screen bg-zinc-50 p-4 md:p-8 font-sans text-black">
      <div className="mx-auto max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <Link href="/" className="text-[10px] font-black uppercase bg-white px-4 py-2 rounded-xl border border-zinc-200 text-black shadow-sm">← Ir a la Web</Link>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-[10px] font-black uppercase bg-red-500 text-white px-4 py-2 rounded-xl shadow-lg">Cerrar Sesión</button>
        </div>

        <h1 className="text-4xl font-black italic tracking-tighter text-center uppercase mb-10 text-black">Administración</h1>

        {/* FORMULARIO CREAR */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl mb-12">
          <form onSubmit={handleSubmit} className="space-y-5">
             <div onClick={() => fileInputRef.current?.click()} className="relative w-full h-56 bg-zinc-50 rounded-4xl border-2 border-dashed border-zinc-200 flex flex-col items-center justify-center overflow-hidden cursor-pointer hover:border-black transition-all group">
              {previewUrl ? <img src={previewUrl} className="w-full h-full object-cover" alt="" /> : <div className="text-center"><span className="text-3xl block mb-2">📸</span><span className="text-[10px] font-black uppercase text-zinc-400">Subir foto del producto</span></div>}
              <input type="file" ref={fileInputRef} onChange={(e) => handleFileChange(e, false)} accept="image/*" className="hidden" />
            </div>
            <input name="nombre" placeholder="Nombre del Producto" required className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none focus:ring-2 ring-black text-black font-bold" />
            <textarea name="descripcion" placeholder="Descripción detallada..." required className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none resize-none h-28 text-black" />
            <div className="grid grid-cols-2 gap-4">
              <input name="precio" type="number" step="0.01" placeholder="Precio ($)" required className="p-4 bg-zinc-50 rounded-2xl border-none outline-none text-black font-bold" />
              <input name="stock" type="number" placeholder="Stock" defaultValue="1" required className="p-4 bg-zinc-50 rounded-2xl border-none outline-none text-black font-bold" />
            </div>
            <select name="categoria" className="w-full p-4 bg-zinc-50 rounded-2xl border-none outline-none text-black font-black uppercase text-[10px]">
              <option value="Zapatillas">Zapatillas</option>
              <option value="Remeras">Remeras</option>
              <option value="Pantalones">Pantalones</option>
            </select>
            <button disabled={loading} className="w-full py-5 bg-black text-white rounded-3xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-lg active:scale-95">
              {loading ? 'PUBLICANDO...' : 'PUBLICAR AHORA'}
            </button>
          </form>
          {mensaje && <p className="mt-4 text-center text-[10px] font-black uppercase text-black bg-zinc-100 py-2 rounded-lg">{mensaje}</p>}
        </div>

        {/* LISTA INVENTARIO CORREGIDA (TEXTO COMPLETO) */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-zinc-100 shadow-xl">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] mb-8 text-zinc-400 text-center">Gestión de Inventario</h2>
          <div className="grid gap-4">
            {productos.map((prod) => (
              <div key={prod.id} className="flex items-center justify-between p-5 bg-zinc-50 rounded-3xl hover:bg-zinc-100 transition-colors border border-zinc-100">
                <div className="flex items-center gap-4 flex-1 min-w-0"> {/* flex-1 permite que el texto use el espacio disponible */}
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-white bg-white shadow-sm shrink-0">
                    <img src={prod.imagen_url} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] font-black uppercase text-black leading-tight wrap-break-word">
                      {prod.nombre}
                    </span>
                    <span className="text-[9px] font-bold text-zinc-400 italic">
                      Stock: {prod.stock} unidades
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                   <button onClick={() => setEditando(prod)} className="w-11 h-11 bg-white border border-zinc-200 rounded-xl flex items-center justify-center text-lg shadow-sm hover:bg-black hover:text-white transition-all">✏️</button>
                   <button onClick={() => eliminarProducto(prod.id, prod.nombre, prod.imagen_url)} className="w-11 h-11 bg-red-50 text-red-500 rounded-xl flex items-center justify-center text-lg shadow-sm hover:bg-red-500 hover:text-white transition-all">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL DE EDICIÓN - CORRECCIÓN DE ERRORES */}
      {editando && (
        <div className="fixed inset-0 z-100 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={() => setEditando(null)} />
          <form onSubmit={handleUpdate} className="relative bg-white w-full max-w-lg p-8 rounded-[3rem] shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto no-scrollbar border border-zinc-100">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter text-black mb-4">Editar Datos</h2>
            
            <div onClick={() => fileEditInputRef.current?.click()} className="relative w-full h-44 bg-zinc-50 rounded-4xl border-2 border-dashed border-zinc-200 flex items-center justify-center overflow-hidden cursor-pointer group">
              <img src={previewEditUrl || editando.imagen_url} className="w-full h-full object-cover" alt="" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white font-black text-[10px] uppercase">Cambiar Imagen</div>
              <input type="file" ref={fileEditInputRef} onChange={(e) => handleFileChange(e, true)} accept="image/*" className="hidden" />
            </div>

            <div className="space-y-4">
              <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Nombre del producto</label>
              <input 
                value={editando.nombre || ""} 
                onChange={e => setEditando({...editando, nombre: e.target.value})} 
                className="w-full p-4 bg-zinc-50 rounded-2xl outline-none text-black font-bold border-none focus:ring-2 ring-black" 
                required 
              />
              
              <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Descripción</label>
              <textarea 
                value={editando.descripcion || ""} 
                onChange={e => setEditando({...editando, descripcion: e.target.value})} 
                className="w-full p-4 bg-zinc-50 rounded-2xl outline-none h-28 text-black border-none focus:ring-2 ring-black" 
                required 
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Precio ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={editando.precio ?? 0} 
                    onChange={e => setEditando({...editando, precio: parseFloat(e.target.value) || 0})} 
                    className="w-full p-4 bg-zinc-50 rounded-2xl outline-none text-black font-bold border-none focus:ring-2 ring-black" 
                    required 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-zinc-400 ml-2">Stock</label>
                  <input 
                    type="number" 
                    value={editando.stock ?? 0} 
                    onChange={e => setEditando({...editando, stock: parseInt(e.target.value) || 0})} 
                    className="w-full p-4 bg-zinc-50 rounded-2xl outline-none text-black font-bold border-none focus:ring-2 ring-black" 
                    required 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-6">
              <button type="button" onClick={() => setEditando(null)} className="flex-1 py-4 bg-zinc-100 rounded-2xl font-black uppercase text-[10px] text-black hover:bg-zinc-200 transition-all">Cancelar</button>
              <button disabled={loading} className="flex-2 py-4 bg-black text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg hover:bg-zinc-800 transition-all">
                {loading ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}