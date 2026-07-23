'use client';

import React, { useEffect, useState } from 'react';
import api, { BASE_URL } from '../../services/api';

export default function ReportsPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // por defecto últimos 30 días
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [valuation, setValuation] = useState<any>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // UX states: Toasts
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadFilters = async () => {
    try {
      const branchesData = await api.get('/branches');
      setBranches(branchesData);
    } catch (_) {}
  };

  const loadReportData = async () => {
    try {
      setLoading(true);
      const query = `?startDate=${startDate}&endDate=${endDate}&branchId=${selectedBranch}`;
      
      const [summaryData, topData, methodsData, valuationData] = await Promise.all([
        api.get(`/reports/summary${query}`),
        api.get(`/reports/top-products${query}`),
        api.get(`/reports/payment-methods${query}`),
        api.get(`/reports/inventory-valuation?branchId=${selectedBranch}`),
      ]);

      setSummary(summaryData);
      setTopProducts(topData);
      setPaymentMethods(methodsData);
      setValuation(valuationData);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar los reportes', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFilters();
  }, []);

  useEffect(() => {
    loadReportData();
  }, [startDate, endDate, selectedBranch]);

  const handleExportCSV = async () => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem('auth_token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${BASE_URL}/reports/export-sales?startDate=${startDate}&endDate=${endDate}&branchId=${selectedBranch}`,
        { headers }
      );

      if (!response.ok) {
        throw new Error('Error al descargar el archivo.');
      }

      const csvContent = await response.text();
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte-ventas-${startDate}-a-${endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      showToast('Reporte exportado con éxito');
    } catch (err: any) {
      showToast(err.message || 'Error al exportar CSV', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Encontrar el valor máximo de cantidad de productos vendidos para porcentaje visual
  const maxQty = topProducts.length > 0 ? Math.max(...topProducts.map((p) => p.quantity)) : 1;
  const totalRevenueMethods = paymentMethods.reduce((acc, m) => acc + m.totalAmount, 0) || 1;

  const paymentColors: Record<string, string> = {
    CASH: 'bg-emerald-500',
    CARD: 'bg-blue-500',
    TRANSFER: 'bg-amber-500',
    CREDIT: 'bg-rose-500',
  };

  const paymentLabels: Record<string, string> = {
    CASH: 'Efectivo',
    CARD: 'Tarjeta',
    TRANSFER: 'Transferencia',
    CREDIT: 'Fiado (Crédito)',
  };

  return (
    <div className="space-y-6 font-sans text-sm text-slate-650 print:p-0 print:space-y-4">
      {/* Header (oculto en print si deseamos, pero útil para mostrar el título en PDF) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:border-b print:pb-2">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Análisis y Reportes</h1>
          <p className="text-slate-400 text-xs print:hidden">Visualiza la salud financiera y descarga tu información contable.</p>
          <p className="hidden print:block text-slate-500 text-xs">
            Periodo: {new Date(startDate).toLocaleDateString()} al {new Date(endDate).toLocaleDateString()}
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={handlePrint}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 font-semibold text-xs rounded-xl text-slate-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Reporte (PDF)
          </button>
          <button
            onClick={handleExportCSV}
            disabled={actionLoading}
            className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition flex items-center gap-1.5 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            {actionLoading ? 'Exportando...' : 'Exportar a Excel (CSV)'}
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Inicio</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500 font-semibold"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Fecha Fin</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500 font-semibold"
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sucursal</label>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:border-indigo-500 font-semibold bg-white"
          >
            <option value="">Todas las Sucursales</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Tarjetas KPI de Rentabilidad */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ingresos Totales</span>
              <p className="text-xl font-black text-slate-800 mt-1">${(summary?.totalRevenue ?? 0).toFixed(2)}</p>
              <span className="text-[10px] text-slate-400">{summary?.salesCount ?? 0} ventas completadas</span>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Costo de Ventas</span>
              <p className="text-xl font-black text-slate-500 mt-1">${(summary?.totalCost ?? 0).toFixed(2)}</p>
              <span className="text-[10px] text-slate-400">Inversión en mercancía</span>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ganancia Neta</span>
              <p className={`text-xl font-black mt-1 ${(summary?.netProfit ?? 0) >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ${(summary?.netProfit ?? 0).toFixed(2)}
              </p>
              <span className="text-[10px] text-slate-400">Margen real de utilidad</span>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket Promedio</span>
              <p className="text-xl font-black text-slate-800 mt-1">${(summary?.ticketAverage ?? 0).toFixed(2)}</p>
              <span className="text-[10px] text-slate-400">Monto medio por ticket</span>
            </div>
          </div>

          {/* Valuación del Inventario */}
          <div className="bg-indigo-50/50 border border-indigo-100 p-5 rounded-xl shadow-sm space-y-4">
            <div>
              <h3 className="font-bold text-indigo-900 text-sm">Valuación Real del Inventario Activo</h3>
              <p className="text-indigo-650 text-xs">Cómputo monetario de los productos actualmente en stock.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Total Artículos</span>
                <p className="text-base font-black text-indigo-900 mt-0.5">{(valuation?.totalItems ?? 0).toFixed(0)} piezas</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Costo Inventario</span>
                <p className="text-base font-black text-indigo-900 mt-0.5">${(valuation?.totalCost ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Valor de Venta</span>
                <p className="text-base font-black text-indigo-900 mt-0.5">${(valuation?.totalSellValue ?? 0).toFixed(2)}</p>
              </div>
              <div>
                <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Ganancia Potencial</span>
                <p className="text-base font-black text-emerald-700 mt-0.5">${(valuation?.potentialProfit ?? 0).toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Gráficos / Listados Analíticos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top Productos */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Top 5 Productos Estrella</h3>
                <p className="text-slate-400 text-xs">Los artículos con mayor volumen de ventas registradas.</p>
              </div>
              <div className="space-y-4">
                {topProducts.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Sin registros en este periodo.</p>
                ) : (
                  topProducts.map((p, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-700">{p.name}</span>
                        <span className="text-slate-500 font-semibold">{p.quantity ?? 0} uds • ${(p.revenue ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${((p.quantity ?? 0) / maxQty) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Distribución de Métodos de Pago */}
            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm space-y-4">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Métodos de Cobro</h3>
                <p className="text-slate-400 text-xs">Desglose de los ingresos por el canal de cobro utilizado.</p>
              </div>
              <div className="space-y-4">
                {paymentMethods.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">Sin movimientos registrados.</p>
                ) : (
                  paymentMethods.map((m, index) => {
                    const pct = (m.totalAmount / totalRevenueMethods) * 100;
                    const color = paymentColors[m.method] || 'bg-slate-500';
                    const label = paymentLabels[m.method] || m.method;

                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-bold text-slate-700">{label}</span>
                          <span className="text-slate-500 font-semibold">{pct.toFixed(1)}% • ${(m.totalAmount ?? 0).toFixed(2)}</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div
                            className={`${color} h-full rounded-full transition-all duration-500`}
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Renderizado de Toast */}
      {toast && (
        <div className={`fixed bottom-5 right-5 px-4.5 py-3 rounded-2xl shadow-lg border text-xs font-bold transition-all duration-300 z-50 flex items-center gap-2 animate-bounce ${
          toast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
