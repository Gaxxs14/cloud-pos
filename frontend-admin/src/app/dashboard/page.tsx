'use client';

import React, { useEffect, useState } from 'react';
import api from '../services/api';

export default function DashboardPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [salesData, productsData] = await Promise.all([
          api.get('/sales'),
          api.get('/products'),
        ]);
        setSales(salesData);
        setProducts(productsData);
        setLoading(false);
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos');
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 font-sans animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm space-y-3">
              <div className="h-4 w-24 bg-slate-200 rounded"></div>
              <div className="h-7 w-32 bg-slate-300 rounded"></div>
              <div className="h-3 w-40 bg-slate-100 rounded"></div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="h-5 w-40 bg-slate-200 rounded"></div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 w-full bg-slate-100 rounded-lg"></div>
            ))}
          </div>
          <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-sm space-y-4">
            <div className="h-5 w-40 bg-slate-200 rounded"></div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-12 w-full bg-slate-100 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-rose-50 border border-rose-100 text-rose-750 rounded-xl text-sm font-semibold">
        {error}
      </div>
    );
  }

  const totalSales = sales.reduce((sum, sale) => sum + parseFloat(sale.totalAmount), 0);
  const totalTransactions = sales.length;
  const averageTicket = totalTransactions > 0 ? totalSales / totalTransactions : 0;
  
  const lowStockProducts = products.filter(
    (p) => parseFloat(p.stock) <= parseFloat(p.minStock || 5)
  );

  // Calcular ventas reales de los últimos 7 días
  const last7Days: { label: string; dateStr: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const label = dayNames[d.getDay()];
    const dayTotal = sales
      .filter((s) => s.createdAt && s.createdAt.startsWith(dateStr))
      .reduce((sum, s) => sum + parseFloat(s.totalAmount || 0), 0);
    last7Days.push({ label, dateStr, total: dayTotal });
  }

  const maxVal = Math.max(...last7Days.map((d) => d.total), 10);
  const chartHeight = 120;
  const chartWidth = 500;
  const points = last7Days.map((d, idx) => {
    const x = (idx / (last7Days.length - 1)) * (chartWidth - 50) + 25;
    const y = chartHeight - ((d.total / maxVal) * (chartHeight - 40) + 20);
    return { x, y, val: d.total, label: d.label };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  return (
    <div className="space-y-6 font-sans text-sm text-slate-700">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Vista General del Negocio</h1>
          <p className="text-slate-500 font-medium text-xs mt-0.5">Indicadores clave de ingresos, transacciones y alertas de inventario en tiempo real.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl transition text-xs flex items-center gap-1.5 shadow-2xs"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Imprimir Reporte
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Total Sales */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition duration-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Venta Total</span>
            <span className="text-2xl font-black text-slate-900 block">${totalSales.toFixed(2)}</span>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md inline-block">
              Ingresos acumulados
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/60 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V15" />
            </svg>
          </div>
        </div>

        {/* Card 2: Transactions */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition duration-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Transacciones</span>
            <span className="text-2xl font-black text-slate-900 block">{totalTransactions}</span>
            <span className="text-[11px] text-indigo-700 font-bold bg-indigo-50 px-2 py-0.5 rounded-md inline-block">
              Ventas procesadas
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-200/60 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        </div>

        {/* Card 3: Average Ticket */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition duration-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Ticket Promedio</span>
            <span className="text-2xl font-black text-slate-900 block">${averageTicket.toFixed(2)}</span>
            <span className="text-[11px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md inline-block">
              Por compra
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-200/60 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        </div>

        {/* Card 4: Low Stock Alert */}
        <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-2xs hover:shadow-xs transition duration-200 flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-slate-500 text-xs font-bold uppercase tracking-wider block">Bajo Stock</span>
            <span className="text-2xl font-black text-rose-600 block">{lowStockProducts.length}</span>
            <span className="text-[11px] text-rose-700 font-bold bg-rose-50 px-2 py-0.5 rounded-md inline-block">
              {lowStockProducts.length > 0 ? 'Requiere reposición' : 'Stock óptimo'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 ring-1 ring-rose-200/60 flex items-center justify-center shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
      </div>

      {/* SVG Chart Section */}
      <div className="bg-white border border-slate-200/90 p-5 sm:p-6 rounded-2xl shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight">
              Ingresos de los Últimos 7 Días
            </h3>
            <p className="text-xs text-slate-500 font-medium">Comportamiento diario de las ventas registradas</p>
          </div>
          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/60 px-2.5 py-1 rounded-lg">
            Semana en curso
          </span>
        </div>

        <div className="w-full overflow-hidden flex flex-col items-center pt-2">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-[800px] h-[130px]">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.2" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            <line x1="20" y1="20" x2={chartWidth - 20} y2="20" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="20" y1="60" x2={chartWidth - 20} y2="60" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4" />
            <line x1="20" y1="100" x2={chartWidth - 20} y2="100" stroke="#f1f5f9" strokeWidth="1" />

            <path d={`${pathD} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`} fill="url(#chartGradient)" />
            <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

            {/* Circles */}
            {points.map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r="4.5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2" className="transition-all hover:r-6" />
                <text x={p.x} y={p.y - 8} textAnchor="middle" className="text-[9px] font-bold fill-slate-700">
                  ${p.val.toFixed(0)}
                </text>
              </g>
            ))}
          </svg>

          {/* Days */}
          <div className="flex justify-between w-full max-w-[800px] px-6 mt-2 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            {last7Days.map((d, idx) => (
              <span key={idx}>{d.label}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Grid splits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Recent Sales */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
            Ventas Recientes
          </h3>
          {sales.length === 0 ? (
            <div className="text-slate-450 text-sm flex-1 flex items-center justify-center py-12">
              No hay ventas registradas aún.
            </div>
          ) : (
            <div className="space-y-3">
              {sales.slice(0, 4).map((sale) => (
                <div key={sale.id} className="flex justify-between items-center p-3.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition duration-150">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {(sale.user?.name ?? 'Cajero').substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-800 text-sm">Cajero: {sale.user?.name ?? 'Sin usuario'}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-medium">{new Date(sale.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 text-sm">${parseFloat(sale.totalAmount).toFixed(2)}</div>
                    <span className="inline-block px-2.5 py-0.5 bg-slate-200/60 text-[9px] font-bold rounded text-slate-550 uppercase mt-1">
                      {sale.paymentMethod}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Warnings */}
        <div className="bg-white border border-slate-200/80 p-6 rounded-2xl flex flex-col">
          <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            Alertas de Inventario
          </h3>
          {lowStockProducts.length === 0 ? (
            <div className="text-emerald-700 text-sm font-bold flex-1 flex items-center justify-center py-12 bg-emerald-50/40 border border-emerald-100 rounded-2xl">
              ✓ Todo el stock está en niveles óptimos.
            </div>
          ) : (
            <div className="space-y-4">
              {lowStockProducts.slice(0, 4).map((product) => {
                const stock = parseFloat(product.stock);
                const minStock = parseFloat(product.minStock);
                const percentage = Math.min(100, Math.max(0, (stock / (minStock || 10)) * 100));
                return (
                  <div key={product.id} className="p-3.5 bg-white border border-slate-100 rounded-xl space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-bold text-slate-850 text-sm">{product.name}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5 font-semibold">SKU: {product.skuBarcode || '-'}</div>
                      </div>
                      <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-700 text-[10px] font-bold rounded-md">
                        Quedan: {parseInt(product.stock)} / {parseInt(product.minStock)}
                      </span>
                    </div>
                    {/* Linear Progress Bar */}
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-rose-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
