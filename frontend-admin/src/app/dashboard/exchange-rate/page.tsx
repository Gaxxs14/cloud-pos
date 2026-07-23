'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ExchangeRatePage() {
  const [currentRate, setCurrentRate] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [usdToBs, setUsdToBs] = useState('');
  const [source, setSource] = useState<'BCV' | 'PARALELO' | 'MANUAL'>('BCV');

  const loadData = async () => {
    try {
      setLoading(true);
      const [cur, hist] = await Promise.all([
        api.get('/exchange-rates/current'),
        api.get('/exchange-rates'),
      ]);
      setCurrentRate(cur);
      setHistory(hist);
    } catch (e: any) {
      setError(e.message || 'Error al cargar tasa de cambio');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await api.post('/exchange-rates', {
        usdToBs: parseFloat(usdToBs),
        source,
      });
      setSuccess('Tasa de cambio actualizada correctamente');
      setUsdToBs('');
      loadData();
    } catch (e: any) {
      setError(e.message || 'Error al guardar la tasa');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-sm text-slate-700 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Tasa de Cambio</h1>
        <p className="text-slate-500 text-xs mt-1">
          Gestiona la tasa USD → Bolívares que se usará en cobros y reportes del día.
        </p>
      </div>

      {/* Tasa vigente */}
      {currentRate && (
        <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-indigo-200 text-xs font-bold uppercase tracking-wider mb-1">Tasa Vigente</p>
              <p className="text-4xl font-extrabold tracking-tight">
                Bs. {parseFloat(currentRate.usdToBs || 1).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-indigo-200 mt-1 text-sm">por cada 1 USD</p>
            </div>
            <div className="bg-white/20 rounded-xl px-3 py-1.5 text-xs font-bold">
              {currentRate.source || 'MANUAL'}
            </div>
          </div>
          {currentRate.createdAt && (
            <p className="text-indigo-200 text-[11px] mt-4">
              Actualizada: {new Date(currentRate.createdAt).toLocaleString('es-VE')}
            </p>
          )}
        </div>
      )}

      {/* Formulario */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm p-6">
        <h2 className="text-sm font-bold text-slate-700 mb-4">Registrar Nueva Tasa del Día</h2>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-semibold">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-semibold">
            ✓ {success}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                1 USD = Bs. *
              </label>
              <input
                type="number"
                step="0.0001"
                min="0.0001"
                required
                value={usdToBs}
                onChange={(e) => setUsdToBs(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl focus:outline-none text-slate-900 font-bold text-lg transition"
                placeholder="42.50"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                Fuente
              </label>
              <select
                value={source}
                onChange={(e) => setSource(e.target.value as any)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 rounded-xl focus:outline-none text-slate-900 font-medium transition"
              >
                <option value="BCV">BCV (Banco Central)</option>
                <option value="PARALELO">Paralelo / Dólar Monitor</option>
                <option value="MANUAL">Manual / Acordada</option>
              </select>
            </div>
          </div>

          {usdToBs && parseFloat(usdToBs) > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 font-semibold mb-2">Vista Previa de Conversión</p>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[1, 5, 10, 20, 50, 100].map((d) => (
                  <div key={d} className="bg-white border border-slate-200 rounded-lg p-2">
                    <p className="text-[10px] text-slate-400 font-bold">${d} USD</p>
                    <p className="font-bold text-slate-800">
                      Bs. {(d * parseFloat(usdToBs)).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-sm text-sm flex items-center justify-center gap-2"
          >
            {saving ? (
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
                Guardar Tasa del Día
              </>
            )}
          </button>
        </form>
      </div>

      {/* Historial */}
      {history.length > 0 && (
        <div className="bg-white border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historial de Tasas</span>
          </div>
          <div className="divide-y divide-slate-100">
            {history.map((r: any) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/50 transition">
                <div>
                  <span className="font-bold text-slate-800">
                    Bs. {parseFloat(r.usdToBs).toLocaleString('es-VE', { minimumFractionDigits: 2 })}
                  </span>
                  <span className="text-slate-400 text-xs ml-2">/ 1 USD</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded">
                    {r.source}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {new Date(r.createdAt).toLocaleDateString('es-VE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
