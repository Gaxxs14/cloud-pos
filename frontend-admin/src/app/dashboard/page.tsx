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
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-4 border-indigo-605 border-t-transparent rounded-full animate-spin"></span>
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
    (p) => parseFloat(p.stock) <= parseFloat(p.minStock)
  );

  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const simulatedSales = [120.0, 240.5, 190.0, 480.0, 310.0, 650.0, totalSales > 0 ? totalSales : 400.0];
  const maxSimulated = Math.max(...simulatedSales);
  const chartHeight = 120;
  const chartWidth = 500;
  
  const points = simulatedSales.map((val, idx) => {
    const x = (idx / (daysOfWeek.length - 1)) * (chartWidth - 40) + 20;
    const y = chartHeight - ((val / maxSimulated) * (chartHeight - 35) + 15);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, '');

  return (
    <div className="space-y-6 font-sans text-sm text-slate-650">
      
      {/* Title */}
      <div className="flex justify-between items-center pb-1">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vista General</h1>
          <p className="text-slate-400 font-semibold text-xs mt-0.5">Indicadores clave de ingresos, transacciones y alertas de inventario.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="px-3.5 py-2 bg-white border border-slate-205 text-slate-700 font-bold rounded-xl transition text-xs flex items-center gap-1.5 shadow-sm">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Exportar XLS
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Total Sales */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-extrabold uppercase tracking-wider block">Venta Total</span>
            <span className="text-2xl font-black text-slate-900 block group-hover:text-indigo-600 transition-colors">${totalSales.toFixed(2)}</span>
            <span className="text-[10px] text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded-full inline-block mt-1">+14.8% hoy</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M12 16V15" />
            </svg>
          </div>
        </div>

        {/* Card 2: Transactions */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-extrabold uppercase tracking-wider block">Transacciones</span>
            <span className="text-2xl font-black text-slate-900 block group-hover:text-indigo-600 transition-colors">{totalTransactions}</span>
            <span className="text-[10px] text-indigo-600 font-extrabold bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1">Cajeros activos</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
          </div>
        </div>

        {/* Card 3: Average Ticket */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-extrabold uppercase tracking-wider block">Ticket Promedio</span>
            <span className="text-2xl font-black text-slate-900 block group-hover:text-indigo-600 transition-colors">${averageTicket.toFixed(2)}</span>
            <span className="text-[10px] text-blue-600 font-extrabold bg-blue-50 px-2 py-0.5 rounded-full inline-block mt-1">Por cliente</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
            </svg>
          </div>
        </div>

        {/* Card 4: Low Stock Alert */}
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 flex items-center justify-between group">
          <div className="space-y-1">
            <span className="text-slate-400 text-xs font-extrabold uppercase tracking-wider block">Bajo Stock</span>
            <span className="text-2xl font-black text-rose-600 block">{lowStockProducts.length}</span>
            <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded-full inline-block mt-1">Reponer pronto</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:scale-110 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
        </div>
      </div>

      {/* SVG Chart Section */}
      <div className="bg-white border border-slate-200/80 p-6 rounded-2xl shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse" />
            Tendencia Semanal de Ingresos
          </h3>
          <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Últimos 7 días
          </span>
        </div>

        <div className="w-full overflow-hidden flex flex-col items-center">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full max-w-[800px] h-[130px]">
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            
            <line x1="20" y1="15" x2={chartWidth - 20} y2="15" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="20" y1="55" x2={chartWidth - 20} y2="55" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
            <line x1="20" y1="95" x2={chartWidth - 20} y2="95" stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />

            <path d={`${pathD} L ${points[points.length - 1].x} 115 L ${points[0].x} 115 Z`} fill="url(#chartGradient)" />
            <path d={pathD} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Circles */}
            {points.map((p, idx) => (
              <g key={idx}>
                <circle cx={p.x} cy={p.y} r="5" fill="#ffffff" stroke="#4f46e5" strokeWidth="2.5" className="hover:r-7 transition-all cursor-pointer" />
                <text x={p.x} y={p.y - 10} textAnchor="middle" className="text-[9px] font-black fill-slate-800">
                  ${p.val.toFixed(0)}
                </text>
              </g>
            ))}
          </svg>

          {/* Days */}
          <div className="flex justify-between w-full max-w-[800px] px-6 mt-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {daysOfWeek.map((day, idx) => (
              <span key={idx} className="hover:text-indigo-600 transition-colors cursor-pointer">{day}</span>
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
