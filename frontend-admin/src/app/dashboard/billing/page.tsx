'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function BillingPage() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Price IDs de Stripe configurables mediante variables de entorno
  const PRICE_STARTER = process.env.NEXT_PUBLIC_STRIPE_PRICE_STARTER || 'price_1Q_starter_dummy';
  const PRICE_PREMIUM = process.env.NEXT_PUBLIC_STRIPE_PRICE_PREMIUM || 'price_1Q_premium_dummy';

  const loadBillingStatus = async () => {
    try {
      setLoading(true);
      const data = await api.get('/billing/status');
      setStatus(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar estado de facturación');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBillingStatus();
  }, []);

  const handleSubscribe = async (priceId: string) => {
    try {
      setActionLoading(true);
      const res = await api.post('/billing/checkout-session', { priceId });
      if (res.url) {
        window.location.href = res.url; // Redirigir a Stripe Checkout
      } else {
        alert('No se pudo generar la sesión de pago.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al conectar con Stripe');
    } finally {
      setActionLoading(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      setActionLoading(true);
      const res = await api.post('/billing/portal-session', {});
      if (res.url) {
        window.location.href = res.url; // Redirigir al Billing Portal de Stripe
      } else {
        alert('No se pudo generar la sesión del portal.');
      }
    } catch (err: any) {
      alert(err.message || 'Error al abrir el portal de facturación');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  const isSubscribed = status?.subscriptionStatus === 'active' || status?.subscriptionStatus === 'trialing';
  const currentPlan = status?.stripePriceId === PRICE_PREMIUM ? 'Premium (Multi-sucursal)' : 'Básico (Starter)';

  return (
    <div className="space-y-6 font-sans text-sm text-slate-650">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Suscripción y Facturación</h1>
        <p className="text-slate-500 text-xs mt-1 font-medium">Administra los planes de pago y suscripción de tu negocio en la nube.</p>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Subscription status panel */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado de Cuenta</span>
              <span className={`px-2 py-0.5 text-[10px] font-black uppercase rounded ${
                isSubscribed ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}>
                {status?.subscriptionStatus ? status.subscriptionStatus : 'Sin Suscripción'}
              </span>
            </div>
            {isSubscribed ? (
              <div className="mt-2 space-y-1">
                <p className="text-sm font-bold text-slate-800">Plan Actual: <span className="text-indigo-650">{currentPlan}</span></p>
                <p className="text-xs text-slate-450">
                  Renovación/Vencimiento: <span className="font-semibold text-slate-700">{new Date(status.subscriptionEndsAt).toLocaleDateString()}</span>
                </p>
              </div>
            ) : (
              <p className="text-xs text-slate-450 mt-1">Actualmente estás en modo de prueba local. Para producción, selecciona un plan de Stripe abajo.</p>
            )}
          </div>

          {isSubscribed && (
            <button
              onClick={handleManageBilling}
              disabled={actionLoading}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-semibold text-xs rounded-xl text-slate-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Gestionar Tarjetas y Facturas
            </button>
          )}
        </div>
      </div>

      {/* Pricing Plans Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Planes Disponibles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan Starter */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-6 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Plan Básico (Starter)</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Ideal para locales individuales o micro-negocios.</p>
                </div>
                <span className="text-lg font-black text-indigo-650">$9<span className="text-xs font-semibold text-slate-400">/mes</span></span>
              </div>
              <ul className="space-y-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  1 Sucursal física y 1 Bodega
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  Ventas ilimitadas y catálogo de productos
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  Arqueo y control de caja diario
                </li>
              </ul>
            </div>
            <div>
              <button
                onClick={() => handleSubscribe(PRICE_STARTER)}
                disabled={actionLoading || (isSubscribed && status?.stripePriceId === PRICE_STARTER)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition shadow-sm ${
                  status?.stripePriceId === PRICE_STARTER
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {status?.stripePriceId === PRICE_STARTER ? 'Tu Plan Actual' : 'Suscribirse ahora'}
              </button>
            </div>
          </div>

          {/* Plan Pro */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm p-6 space-y-4 flex flex-col justify-between border-l-4 border-l-indigo-600">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-slate-800 text-base">Plan Premium (Pro)</h3>
                    <span className="bg-indigo-50 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded">POPULAR</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-0.5">Para negocios multi-sucursal y control avanzado de bodega.</p>
                </div>
                <span className="text-lg font-black text-indigo-650">$29<span className="text-xs font-semibold text-slate-400">/mes</span></span>
              </div>
              <ul className="space-y-2 text-xs text-slate-500 pt-2 border-t border-slate-100">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  Multi-sucursal e inventario por bodega ilimitado
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  Traspasos físicos de mercancía entre bodegas
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  Créditos y Fiados a clientes (Límites y abonos)
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                  </svg>
                  Reportes e historial exportable completo
                </li>
              </ul>
            </div>
            <div>
              <button
                onClick={() => handleSubscribe(PRICE_PREMIUM)}
                disabled={actionLoading || (isSubscribed && status?.stripePriceId === PRICE_PREMIUM)}
                className={`w-full py-2.5 rounded-xl font-bold text-xs transition shadow-sm ${
                  status?.stripePriceId === PRICE_PREMIUM
                    ? 'bg-slate-100 text-slate-400 cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {status?.stripePriceId === PRICE_PREMIUM ? 'Tu Plan Actual' : 'Suscribirse ahora'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
