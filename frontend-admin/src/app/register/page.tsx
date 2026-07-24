'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '../services/api';

export default function RegisterTenantPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState('');
  const [slug, setSlug] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTenantNameChange = (name: string) => {
    setTenantName(name);
    const generatedSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-');
    setSlug(generatedSlug);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await api.post('/auth/register-tenant', {
        tenantName,
        slug: slug.toLowerCase(),
        adminName,
        adminEmail: adminEmail.toLowerCase(),
        adminPassword,
      });

      api.setToken(response.token);
      api.saveSession(response.user, response.tenant);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al registrar la empresa');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm">
        
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center mb-3 shadow-sm shadow-indigo-600/10">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none">
            Cloud POS
          </h1>
          <p className="text-slate-400 font-bold text-[10px] uppercase tracking-wider mt-2">
            Registro de Nueva Empresa Privada
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-0.5">
              Nombre de la Empresa / Tienda
            </label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => handleTenantNameChange(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl focus:outline-none text-sm text-slate-900 placeholder-slate-400 transition"
              placeholder="Mi Tienda Principal"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-0.5">
              Identificador Único (Slug)
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl focus:outline-none text-sm text-slate-900 placeholder-slate-400 transition"
              placeholder="mitienda"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-0.5">
              Nombre Completo del Dueño
            </label>
            <input
              type="text"
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl focus:outline-none text-sm text-slate-900 placeholder-slate-400 transition"
              placeholder="Carlos Pérez"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-0.5">
              Correo Electrónico (Login)
            </label>
            <input
              type="email"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl focus:outline-none text-sm text-slate-900 placeholder-slate-400 transition"
              placeholder="dueno@mitienda.com"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 pl-0.5">
              Contraseña
            </label>
            <input
              type="password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              required
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl focus:outline-none text-sm text-slate-900 placeholder-slate-400 transition"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-350 text-white rounded-xl text-sm font-bold transition shadow-sm mt-2"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Crear Mi Empresa Privada'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
          ¿Ya tienes una empresa registrada?{' '}
          <Link href="/login" className="font-bold text-indigo-600 hover:underline">
            Iniciar Sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
