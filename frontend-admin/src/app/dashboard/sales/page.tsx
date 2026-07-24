'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [filteredSales, setFilteredSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedSale, setSelectedSale] = useState<any | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // UX states: Toasts y Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSales = async () => {
    try {
      const data = await api.get('/sales');
      setSales(data);
      setFilteredSales(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar historial de ventas');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSales();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sales]);

  const openDetailModal = async (id: string) => {
    setSelectedSale(null); // limpiar datos anteriores
    setDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const data = await api.get(`/sales/${id}`);
      setSelectedSale(data);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar detalle de venta', 'error');
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-sm text-slate-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Historial de Ventas</h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">Revisa el historial detallado de todas las transacciones realizadas en las cajas de cobro.</p>
        </div>
      </div>

      {/* Search & Actions bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 placeholder-slate-450 transition"
            placeholder="Buscar cajero o método..."
          />
        </div>
        <div className="text-xs font-bold text-slate-400">
          Mostrando {filteredSales.length} transacciones registradas.
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Sales Table Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-550 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">Fecha / Hora</th>
                <th className="p-4">Cajero</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Método de Pago</th>
                <th className="p-4 text-right">Monto Total</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 text-sm">
              {filteredSales.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-450">
                    No se han registrado transacciones aún.
                  </td>
                </tr>
              ) : (
                filteredSales.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6 font-semibold text-slate-800">
                      {new Date(sale.createdAt).toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-700 font-bold">{sale.user?.name ?? 'Sin usuario'}</td>
                    <td className="p-4 text-slate-500">{sale.customer?.name || 'Cliente Genérico'}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-[10px] font-black rounded-lg uppercase tracking-wider text-slate-500">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-indigo-600">${parseFloat(sale.totalAmount).toFixed(2)}</td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => openDetailModal(sale.id)}
                        className="text-indigo-650 hover:text-indigo-805 font-bold hover:underline text-xs"
                      >
                        Ver Detalle
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredSales.length > itemsPerPage && (
          <div className="bg-white border-t border-slate-100 p-4 px-6 flex items-center justify-between text-xs font-bold text-slate-500">
            <div>
              Mostrando {Math.min(filteredSales.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredSales.length, currentPage * itemsPerPage)} de {filteredSales.length} ventas
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Anterior
              </button>
              <span className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800">
                Pág. {currentPage} de {Math.ceil(filteredSales.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredSales.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredSales.length / itemsPerPage)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Ticket Details Modal Dialog */}
      {isDetailOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition duration-150">
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-lg w-full max-w-md p-8 flex flex-col max-h-[85vh]">
            
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-black text-slate-900">Detalle de Ticket</h3>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-10">
                <span className="w-6 h-6 border-2 border-indigo-605 border-t-transparent rounded-full animate-spin"></span>
              </div>
            ) : selectedSale ? (
              <div className="space-y-5 overflow-y-auto pr-1 flex-1 text-sm text-slate-650">
                {/* Meta details grid */}
                <div className="grid grid-cols-2 gap-3.5 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cajero</div>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedSale.user?.name ?? 'Sin usuario'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Fecha</div>
                    <div className="font-semibold text-slate-600 mt-0.5">{new Date(selectedSale.createdAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cliente</div>
                    <div className="font-semibold text-slate-600 mt-0.5">{selectedSale.customer?.name || 'Cliente Genérico'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Método Pago</div>
                    <div className="font-bold text-indigo-600 mt-0.5 uppercase tracking-wide text-xs">
                      {selectedSale.paymentMethod}
                    </div>
                  </div>
                </div>

                {/* Items sold detail list */}
                <div>
                  <div className="text-[10px] text-slate-450 font-bold uppercase tracking-widest mb-3.5">Artículos Vendidos</div>
                  
                  {/* Dashed receipt boundary */}
                  <div className="border-t border-b border-dashed border-slate-200 py-3 space-y-3">
                    {selectedSale.saleItems?.map((item: any) => (
                      <div key={item.id} className="flex justify-between items-center text-sm">
                        <div>
                          <div className="font-bold text-slate-800">{item.product?.name ?? 'Producto eliminado'}</div>
                          <div className="text-xs text-slate-400 mt-0.5 font-medium">
                            ${parseFloat(item.unitPrice).toFixed(2)} x {parseInt(item.quantity)}
                          </div>
                        </div>
                        <div className="font-bold text-slate-800">
                          ${parseFloat(item.subtotal).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total breakdowns */}
                  <div className="flex justify-between font-black text-lg text-slate-900 pt-2.5 border-t border-slate-200">
                    <span>Total:</span>
                    <span className="text-indigo-650">${parseFloat(selectedSale.totalAmount).toFixed(2)}</span>
                  </div>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">Error al cargar datos.</div>
            )}
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
