'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function TransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fromWarehouseId, setFromWarehouseId] = useState('');
  const [toWarehouseId, setToWarehouseId] = useState('');
  const [transferItems, setTransferItems] = useState<any[]>([{ productId: '', quantity: 1 }]);

  // Detail Modal state
  const [selectedTransfer, setSelectedTransfer] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // UX states: Toasts
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [transfersData, warehousesData, productsData] = await Promise.all([
        api.get('/transfers'),
        api.get('/warehouses'),
        api.get('/products'),
      ]);
      setTransfers(transfersData);
      setWarehouses(warehousesData);
      setProducts(productsData);
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar información de traspasos');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddRow = () => {
    setTransferItems([...transferItems, { productId: '', quantity: 1 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (transferItems.length === 1) return;
    const updated = [...transferItems];
    updated.splice(index, 1);
    setTransferItems(updated);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...transferItems];
    updated[index][field] = value;
    setTransferItems(updated);
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromWarehouseId || !toWarehouseId) {
      showToast('Debes seleccionar almacén de origen y destino.', 'error');
      return;
    }

    // Filtrar renglones incompletos
    const items = transferItems
      .filter((item) => item.productId && item.quantity > 0)
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
      }));

    if (items.length === 0) {
      showToast('Debes agregar al menos un producto válido.', 'error');
      return;
    }

    if (fromWarehouseId === toWarehouseId) {
      showToast('La bodega de origen y destino no pueden ser la misma.', 'error');
      return;
    }

    try {
      await api.post('/transfers', {
        fromWarehouseId,
        toWarehouseId,
        items,
      });

      // Reset
      setFromWarehouseId('');
      setToWarehouseId('');
      setTransferItems([{ productId: '', quantity: 1 }]);
      setIsModalOpen(false);
      await loadData();
      showToast('Traspaso de inventario completado con éxito');
    } catch (err: any) {
      showToast(err.message || 'Error al procesar el traspaso.', 'error');
    }
  };

  const openDetail = async (id: string) => {
    try {
      const data = await api.get(`/transfers/${id}`);
      setSelectedTransfer(data);
      setIsDetailOpen(true);
    } catch (err: any) {
      alert(err.message || 'Error al cargar detalles de la transferencia.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans text-sm text-slate-650">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Traspasos de Inventario</h1>
          <p className="text-slate-400 text-xs">Mueve stock entre diferentes bodegas de forma segura y auditada.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          Nuevo Traspaso
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Transfers history list */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historial de Traspasos</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-150 text-slate-400 font-bold text-[11px] uppercase tracking-wider">
                <th className="p-4">Fecha</th>
                <th className="p-4">Origen</th>
                <th className="p-4">Destino</th>
                <th className="p-4">Registrado Por</th>
                <th className="p-4 text-center">Estado</th>
                <th className="p-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {transfers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No hay transferencias de mercancía registradas.
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/50">
                    <td className="p-4">{new Date(t.createdAt).toLocaleDateString()} {new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="p-4 text-slate-900 font-semibold">{t.fromWarehouse?.name ?? 'Bodega eliminada'}</td>
                    <td className="p-4 text-indigo-650 font-semibold">{t.toWarehouse?.name ?? 'Bodega eliminada'}</td>
                    <td className="p-4 text-slate-500">{t.user?.name ?? 'Sin usuario'}</td>
                    <td className="p-4 text-center">
                      <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded">
                        {t.status}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => openDetail(t.id)}
                        className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-xs font-semibold transition"
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
      </div>

      {/* Modal: New Transfer */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">Registrar Traspaso de Inventario</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateTransfer} className="p-5 space-y-5">
              {/* Select Warehouses */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bodega de Origen</label>
                  <select
                    required
                    value={fromWarehouseId}
                    onChange={(e) => setFromWarehouseId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none bg-white transition"
                  >
                    <option value="">Selecciona origen...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.branch?.name ?? 'Sin sucursal'} - {w.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bodega de Destino</label>
                  <select
                    required
                    value={toWarehouseId}
                    onChange={(e) => setToWarehouseId(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none bg-white transition"
                  >
                    <option value="">Selecciona destino...</option>
                    {warehouses
                      .filter((w) => w.id !== fromWarehouseId)
                      .map((w) => (
                        <option key={w.id} value={w.id}>{w.branch?.name ?? 'Sin sucursal'} - {w.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Productos a Transferir</span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    + Agregar Fila
                  </button>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {transferItems.map((item, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex-1">
                        <select
                          required
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none bg-white text-xs transition"
                        >
                          <option value="">Selecciona producto...</option>
                          {products.map((p) => {
                            const whStockObj = p.stocks?.find((s: any) => s.warehouseId === fromWarehouseId);
                            const availStock = whStockObj ? Number(whStockObj.stock) : Number(p.stock || 0);
                            return (
                              <option key={p.id} value={p.id}>
                                {p.name} — Disponibles en origen: {availStock} u. (SKU: {p.skuBarcode || 'N/A'})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          required
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none text-xs transition text-center"
                          placeholder="Cant."
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
                >
                  Completar Traspaso
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Transfer details */}
      {isDetailOpen && selectedTransfer && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Detalle del Traspaso</h3>
                <p className="text-[11px] text-slate-400">ID: {selectedTransfer.id}</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Route cards */}
              <div className="grid grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bodega Origen</span>
                  <span className="font-bold text-slate-800 text-xs block mt-1">{selectedTransfer.fromWarehouse.name}</span>
                  <span className="text-[10px] text-slate-450 block mt-0.5">{selectedTransfer.fromWarehouse.branch?.name}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Bodega Destino</span>
                  <span className="font-bold text-slate-800 text-xs block mt-1">{selectedTransfer.toWarehouse.name}</span>
                  <span className="text-[10px] text-slate-450 block mt-0.5">{selectedTransfer.toWarehouse.branch?.name}</span>
                </div>
              </div>

              {/* Renglones */}
              <div>
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Artículos Transferidos</span>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {selectedTransfer.items?.map((item: any) => (
                    <div key={item.id} className="p-3 flex items-center justify-between text-xs font-medium">
                      <div className="space-y-0.5">
                        <span className="text-slate-800 font-bold">{item.product?.name ?? 'Producto eliminado'}</span>
                        <span className="text-slate-400 block">SKU: {item.product?.skuBarcode || 'N/A'}</span>
                      </div>
                      <span className="font-bold text-indigo-650 bg-indigo-50 px-2.5 py-1 rounded-lg">
                        {Number(item.quantity)} u.
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer info */}
              <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-100">
                <div>Registrado por: <span className="font-semibold text-slate-600">{selectedTransfer.user?.name ?? 'Sin usuario'} ({selectedTransfer.user?.email ?? ''})</span></div>
                <div>Fecha de traspaso: <span className="font-semibold text-slate-600">{new Date(selectedTransfer.createdAt).toLocaleString()}</span></div>
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
