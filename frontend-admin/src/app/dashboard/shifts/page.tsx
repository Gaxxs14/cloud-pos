'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<any[]>([]);
  const [filteredShifts, setFilteredShifts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShift, setSelectedShift] = useState<any | null>(null);
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

  const loadShifts = async () => {
    try {
      const data = await api.get('/shifts/history');
      setShifts(data);
      setFilteredShifts(data);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar historial de turnos');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, shifts]);

  const openDetailModal = async (id: string) => {
    setSelectedShift(null); // limpiar datos anteriores
    setDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const data = await api.get(`/shifts/${id}`);
      setSelectedShift(data);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar detalle del turno', 'error');
      setIsDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-4 border-indigo-605 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-sm text-slate-700">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Control de Cajas y Turnos</h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">Supervisa aperturas, cierres de caja, arqueos y diferencias en efectivo de tus cajeros.</p>
        </div>
      </div>
      <p className="text-slate-400 font-semibold text-xs">Monitorea y audita los turnos de caja de los cajeros en tiempo real, controlando fondos y detectando faltantes de dinero.</p>

      {/* Filter panel */}
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
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-905 placeholder-slate-450 transition"
            placeholder="Buscar por cajero..."
          />
        </div>
        <div className="text-xs font-bold text-slate-400">
          Mostrando {filteredShifts.length} turnos registrados.
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Shifts Grid list */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">Cajero</th>
                <th className="p-4">Apertura</th>
                <th className="p-4">Cierre</th>
                <th className="p-4 text-right">Inicial</th>
                <th className="p-4 text-right">Declarado</th>
                <th className="p-4 text-right">Diferencia</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650 text-sm">
              {filteredShifts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    No se han registrado turnos de caja en esta tienda.
                  </td>
                </tr>
              ) : (
                filteredShifts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((shift) => {
                  const isOpened = shift.status === 'OPEN';
                  const opening = parseFloat(shift.openingBalance);
                  const declared = shift.declaredBalance ? parseFloat(shift.declaredBalance) : null;
                  const difference = shift.difference ? parseFloat(shift.difference) : 0;
                  
                  let badgeClass = 'bg-blue-50 text-blue-700';
                  let badgeText = 'Abierto';
                  if (!isOpened) {
                    if (difference === 0) {
                      badgeClass = 'bg-emerald-50 text-emerald-700';
                      badgeText = 'Cuadrado';
                    } else if (difference < 0) {
                      badgeClass = 'bg-rose-50 text-rose-700';
                      badgeText = `Faltante ($${Math.abs(difference).toFixed(2)})`;
                    } else {
                      badgeClass = 'bg-amber-50 text-amber-700';
                      badgeText = `Sobrante ($${difference.toFixed(2)})`;
                    }
                  }

                  return (
                    <tr key={shift.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 pl-6 font-bold text-slate-800">{shift.user?.name ?? 'Sin usuario'}</td>
                      <td className="p-4 font-medium text-slate-550">{new Date(shift.openedAt).toLocaleString()}</td>
                      <td className="p-4 font-medium text-slate-550">
                        {shift.closedAt ? new Date(shift.closedAt).toLocaleString() : '-'}
                      </td>
                      <td className="p-4 text-right text-slate-500 font-bold">${opening.toFixed(2)}</td>
                      <td className="p-4 text-right font-bold text-slate-800">
                        {declared !== null ? `$${declared.toFixed(2)}` : '-'}
                      </td>
                      <td className={`p-4 text-right font-bold ${
                        difference < 0 ? 'text-rose-600' : (difference > 0 ? 'text-amber-600' : 'text-slate-450')
                      }`}>
                        {!isOpened ? `$${difference.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${badgeClass}`}>
                          {badgeText}
                        </span>
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <button
                          onClick={() => openDetailModal(shift.id)}
                          className="text-indigo-650 hover:text-indigo-805 font-bold hover:underline text-xs"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredShifts.length > itemsPerPage && (
          <div className="bg-white border-t border-slate-100 p-4 px-6 flex items-center justify-between text-xs font-bold text-slate-500">
            <div>
              Mostrando {Math.min(filteredShifts.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredShifts.length, currentPage * itemsPerPage)} de {filteredShifts.length} turnos
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
                Pág. {currentPage} de {Math.ceil(filteredShifts.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredShifts.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredShifts.length / itemsPerPage)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>



      {/* Shift Auditor detail dialog */}
      {isDetailOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition duration-150">
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-lg w-full max-w-2xl p-8 flex flex-col max-h-[90vh]">
            
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-base font-extrabold text-slate-900">Auditoría de Turno de Caja</h3>
              <button
                onClick={() => setIsDetailOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center justify-center py-12">
                <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
              </div>
            ) : selectedShift ? (
              <div className="space-y-6 overflow-y-auto pr-2 flex-1 text-xs text-slate-650">
                
                {/* Meta details grid */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Cajero</div>
                    <div className="font-bold text-slate-800 mt-0.5">{selectedShift.user?.name ?? 'Sin usuario'}</div>
                    <div className="text-[10px] text-slate-400">{selectedShift.user?.email ?? ''}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Apertura</div>
                    <div className="font-semibold text-slate-600 mt-0.5">{new Date(selectedShift.openedAt).toLocaleString()}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Cierre</div>
                    <div className="font-semibold text-slate-600 mt-0.5">
                      {selectedShift.closedAt ? new Date(selectedShift.closedAt).toLocaleString() : 'Activo (En progreso)'}
                    </div>
                  </div>
                </div>

                {/* Audit breakdown tables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Left: Financial summary */}
                  <div className="space-y-3">
                    <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Flujo de Dinero Teórico</div>
                    <div className="border border-slate-100 rounded-xl p-3.5 space-y-2 bg-slate-50/20">
                      <div className="flex justify-between">
                        <span>Fondo de Caja inicial:</span>
                        <span className="font-bold text-slate-700">${parseFloat(selectedShift.openingBalance).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ventas en Efectivo (+):</span>
                        <span className="font-bold text-slate-700">${parseFloat(selectedShift.cashSales ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Entradas manuales (+):</span>
                        <span className="font-bold text-slate-700">${parseFloat(selectedShift.cashIn ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-rose-600">
                        <span>Salidas manuales (-):</span>
                        <span className="font-bold">${parseFloat(selectedShift.cashOut ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-slate-150 pt-2 flex justify-between font-black text-slate-900">
                        <span>Efectivo Teórico:</span>
                        <span>{selectedShift.status === 'CLOSED' ? `$${parseFloat(selectedShift.closingBalance ?? 0).toFixed(2)}` : 'Turno en curso'}</span>
                      </div>
                      <div className="flex justify-between font-black text-slate-900">
                        <span>Efectivo Declarado:</span>
                        <span>
                          {selectedShift.declaredBalance ? `$${parseFloat(selectedShift.declaredBalance).toFixed(2)}` : '-'}
                        </span>
                      </div>
                      {selectedShift.declaredBalanceUsd !== null && selectedShift.declaredBalanceUsd !== undefined && (
                        <div className="flex justify-between pl-4 text-[11px] text-slate-500">
                          <span>• Efectivo Dólares ($):</span>
                          <span>${parseFloat(selectedShift.declaredBalanceUsd).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedShift.declaredBalanceBs !== null && selectedShift.declaredBalanceBs !== undefined && (
                        <div className="flex justify-between pl-4 text-[11px] text-slate-500">
                          <span>• Efectivo Bolívares (Bs.):</span>
                          <span>Bs. {parseFloat(selectedShift.declaredBalanceBs).toFixed(2)}</span>
                        </div>
                      )}
                      {selectedShift.status === 'CLOSED' && (
                        <div className={`border-t border-dashed pt-2 flex justify-between font-black ${
                          parseFloat(selectedShift.difference) < 0 ? 'text-rose-650' : (parseFloat(selectedShift.difference) > 0 ? 'text-amber-600' : 'text-emerald-700')
                        }`}>
                          <span>Diferencia:</span>
                          <span>${parseFloat(selectedShift.difference).toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Electronic payment metrics */}
                  <div className="space-y-3">
                    <div className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">Otros Métodos (Bancos)</div>
                    <div className="border border-slate-100 rounded-xl p-3.5 space-y-3 bg-slate-50/20">
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-slate-400" />
                          Ventas Tarjeta:
                        </span>
                        <span className="font-bold text-slate-700">${parseFloat(selectedShift.cardSales ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-400" />
                          Ventas Transferencia:
                        </span>
                        <span className="font-bold text-slate-700">${parseFloat(selectedShift.transferSales ?? 0).toFixed(2)}</span>
                      </div>
                      <div className="border-t border-slate-150 pt-2.5 flex justify-between font-black text-indigo-600">
                        <span>Cobros Digitales Totales:</span>
                        <span>${(parseFloat(selectedShift.cardSales ?? 0) + parseFloat(selectedShift.transferSales ?? 0)).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Bottom section: manual cash movements list */}
                <div className="space-y-3">
                  <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Movimientos Manuales de Efectivo</div>
                  {selectedShift.cashTransactions?.length === 0 ? (
                    <div className="text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                      No se registraron movimientos manuales durante este turno.
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                            <th className="p-2.5 pl-4">Hora</th>
                            <th className="p-2.5">Tipo</th>
                            <th className="p-2.5">Concepto</th>
                            <th className="p-2.5 pr-4 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-600">
                          {selectedShift.cashTransactions?.map((tx: any) => (
                            <tr key={tx.id} className="hover:bg-slate-50/25">
                              <td className="p-2.5 pl-4">{new Date(tx.createdAt).toLocaleTimeString()}</td>
                              <td className="p-2.5 font-bold">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                  tx.type === 'IN' ? 'bg-indigo-50 text-indigo-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  {tx.type === 'IN' ? 'Ingreso' : 'Retiro'}
                                </span>
                              </td>
                              <td className="p-2.5 font-medium">{tx.description}</td>
                              <td className={`p-2.5 pr-4 text-right font-bold ${tx.type === 'IN' ? 'text-indigo-650' : 'text-rose-600'}`}>
                                {tx.type === 'IN' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Bottom section 2: Sales executed in the shift */}
                <div className="space-y-3">
                  <div className="text-[10px] text-slate-450 font-bold uppercase tracking-wider">Tickets Cobrados ({selectedShift.sales?.length})</div>
                  {selectedShift.sales?.length === 0 ? (
                    <div className="text-slate-400 text-center py-4 bg-slate-50 rounded-xl border border-slate-100">
                      No se cobraron tickets durante este turno.
                    </div>
                  ) : (
                    <div className="border border-slate-100 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 font-bold text-slate-500">
                            <th className="p-2.5 pl-4">Hora</th>
                            <th className="p-2.5">Cliente</th>
                            <th className="p-2.5">Método</th>
                            <th className="p-2.5 pr-4 text-right">Monto</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-650">
                          {selectedShift.sales?.map((sale: any) => (
                            <tr key={sale.id} className="hover:bg-slate-50/25">
                              <td className="p-2.5 pl-4">{new Date(sale.createdAt).toLocaleTimeString()}</td>
                              <td className="p-2.5">{sale.customer?.name || 'Cliente Genérico'}</td>
                              <td className="p-2.5">
                                <span className="px-1.5 py-0.5 bg-slate-100 text-[9px] rounded font-black uppercase text-slate-500">
                                  {sale.paymentMethod}
                                </span>
                              </td>
                              <td className="p-2.5 pr-4 text-right font-extrabold text-slate-800">
                                ${parseFloat(sale.totalAmount).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="text-center py-8 text-slate-400">Error al cargar datos.</div>
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
