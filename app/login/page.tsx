'use client';
import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); // Estado para el botón
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ 
      email, 
      password 
    });

    if (error) {
      setError(`Error: ${error.message}`); 
      setLoading(false);
    } else {
      router.push('/admin');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4 font-sans">
      <form 
        onSubmit={handleLogin} 
        className="bg-white p-10 rounded-[2.5rem] border border-zinc-100 shadow-2xl w-full max-w-md"
      >
        <div className="text-center mb-8">
          <span className="text-4xl mb-4 block">🔐</span>
          <h1 className="text-3xl font-black uppercase tracking-tighter italic text-black">
            Acceso Admin
          </h1>
          <p className="text-zinc-400 text-[10px] font-bold uppercase tracking-widest mt-2">
            Solo personal autorizado
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black uppercase ml-2 mb-1 block text-zinc-400">Email</label>
            <input 
              type="email" 
              placeholder="admin@tumarca.com" 
              className="w-full p-4 bg-zinc-50 border-none rounded-2xl outline-none focus:ring-2 ring-black text-black placeholder:text-zinc-300 transition-all"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-black uppercase ml-2 mb-1 block text-zinc-400">Contraseña</label>
            <input 
              type="password" 
              placeholder="••••••••" 
              className="w-full p-4 bg-zinc-50 border-none rounded-2xl outline-none focus:ring-2 ring-black text-black placeholder:text-zinc-300 transition-all"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button 
            disabled={loading}
            className="w-full bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-800 disabled:bg-zinc-200 transition-all shadow-lg active:scale-95"
          >
            {loading ? 'Verificando...' : 'Entrar al Panel'}
          </button>

          {error && (
            <div className="bg-red-50 p-3 rounded-xl border border-red-100">
              <p className="text-red-500 text-[10px] font-black uppercase text-center">
                {error}
              </p>
            </div>
          )}
        </div>
      </form>
    </div>
  );
}