'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../services/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [desktopMode, setDesktopMode] = useState<'CAJA' | 'ADMIN' | 'WEB'>('WEB');

  useEffect(() => {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    const isCajaExe = ua.includes('CloudPOS-Caja');
    const isAdminExe = ua.includes('CloudPOS-Admin');
    if (isCajaExe) setDesktopMode('CAJA');
    else if (isAdminExe) setDesktopMode('ADMIN');

    const token = api.getToken();
    const { user } = api.getSession();
    if (token && user) {
      if (isCajaExe || user.role === 'CASHIER') {
        router.push('/dashboard/pos');
      } else {
        router.push('/dashboard');
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });

      if (desktopMode === 'ADMIN' && response.user.role === 'CASHIER') {
        api.setToken(null);
        setError('Acceso denegado: este ejecutable es exclusivo para Administradores. Usa "Cloud POS - Caja".');
        setLoading(false);
        return;
      }

      api.setToken(response.token);
      api.saveSession(response.user, response.tenant);
      
      if (desktopMode === 'CAJA' || response.user.role === 'CASHIER') {
        router.push('/dashboard/pos');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-805">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
        
        <div className="flex flex-col items-center mb-6">
          <div className={`w-12 h-12 text-white rounded-xl flex items-center justify-center mb-3 shadow-sm ${
            desktopMode === 'CAJA' ? 'bg-emerald-600 shadow-emerald-600/10' : 'bg-indigo-600 shadow-indigo-600/10'
          }`}>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
            Cloud POS
          </h1>
          <p className={`font-black text-[10px] uppercase tracking-wider mt-2 px-2.5 py-0.5 rounded-full ${
            desktopMode === 'CAJA'
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'text-slate-500'
          }`}>
            {desktopMode === 'CAJA'
              ? 'Terminal de Caja — Punto de Venta'
              : desktopMode === 'ADMIN'
              ? 'Panel de Administración'
              : 'Panel de Acceso'}
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2 pl-0.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl focus:outline-none text-sm text-slate-900 placeholder-slate-400 transition"
              placeholder="admin@cloudpos.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-555 uppercase tracking-wider mb-2 pl-0.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl focus:outline-none text-sm text-slate-900 placeholder-slate-400 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white rounded-xl text-sm font-bold transition shadow-sm"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Ingresar al Panel'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
          ¿Quieres registrar una nueva empresa independiente?{' '}
          <Link href="/register" className="font-bold text-indigo-600 hover:underline">
            Registrar Mi Tienda
          </Link>
        </div>
      </div>
    </div>
  );
}
