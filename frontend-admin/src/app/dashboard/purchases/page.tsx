'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [purchaseItems, setPurchaseItems] = useState<any[]>([{ productId: '', quantity: 1, costPrice: 0 }]);
  const [saving, setSaving] = useState(false);

  // Detail Modal state
  const [selectedPurchase, setSelectedPurchase] = useState<any | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [purchasesData, suppliersData, warehousesData, productsData] = await Promise.all([
        api.get('/purchases'),
        api.get('/suppliers'),
        api.get('/warehouses'),
        api.get('/products'),
      ]);
      setPurchases(purchasesData);
      setSuppliers(suppliersData);
      setWarehouses(warehousesData);
      setProducts(productsData.filter((p: any) => p.isActive));
    } catch (err: any) {
      setError(err.message || 'Error al cargar información de abastecimientos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAddRow = () => {
    setPurchaseItems([...purchaseItems, { productId: '', quantity: 1, costPrice: 0 }]);
  };

  const handleRemoveRow = (index: number) => {
    if (purchaseItems.length === 1) return;
    const updated = [...purchaseItems];
    updated.splice(index, 1);
    setPurchaseItems(updated);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...purchaseItems];
    updated[index][field] = value;
    
    // Auto-completar costo sugerido de la lista de productos si se cambia de producto
    if (field === 'productId') {
      const selectedProd = products.find((p) => p.id === value);
      if (selectedProd) {
        updated[index]['costPrice'] = parseFloat(selectedProd.costPrice);
      }
    }

    setPurchaseItems(updated);
  };

  const calculateTotal = () => {
    return purchaseItems.reduce((acc, item) => {
      const q = parseFloat(item.quantity) || 0;
      const c = parseFloat(item.costPrice) || 0;
      return acc + (q * c);
    }, 0);
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !warehouseId) {
      showToast('Debes seleccionar proveedor y bodega de ingreso.', 'error');
      return;
    }

    // Filtrar renglones incompletos
    const items = purchaseItems
      .filter((item) => item.productId && parseFloat(item.quantity) > 0 && parseFloat(item.costPrice) >= 0)
      .map((item) => ({
        productId: item.productId,
        quantity: parseFloat(item.quantity),
        costPrice: parseFloat(item.costPrice),
      }));

    if (items.length === 0) {
      showToast('Debes agregar al menos un producto válido.', 'error');
      return;
    }

    setSaving(true);
    try {
      await api.post('/purchases', {
        supplierId,
        warehouseId,
        invoiceNumber: invoiceNumber || undefined,
        notes: notes || undefined,
        items,
      });

      // Reset
      setSupplierId('');
      setWarehouseId('');
      setInvoiceNumber('');
      setNotes('');
      setPurchaseItems([{ productId: '', quantity: 1, costPrice: 0 }]);
      setIsModalOpen(false);
      await loadData();
      showToast('Factura de compra registrada con éxito');
    } catch (err: any) {
      showToast(err.message || 'Error al procesar la compra.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const openDetailModal = async (id: string) => {
    setSelectedPurchase(null);
    setDetailLoading(true);
    setIsDetailOpen(true);
    try {
      const data = await api.get(`/purchases/${id}`);
      setSelectedPurchase(data);
    } catch (err: any) {
      showToast(err.message || 'Error al cargar detalle de compra.', 'error');
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

  const totalPages = Math.ceil(purchases.length / itemsPerPage);
  const paginated = purchases.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 font-sans text-sm text-slate-650">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Compras y Abastecimiento</h1>
          <p className="text-slate-500 text-xs mt-1 font-medium">Registra facturas de compras para ingresar inventario directamente en bodegas y actualizar costos.</p>
        </div>
        <button
          onClick={() => {
            setSupplierId('');
            setWarehouseId('');
            setInvoiceNumber('');
            setNotes('');
            setPurchaseItems([{ productId: '', quantity: 1, costPrice: 0 }]);
            setIsModalOpen(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Registrar Compra
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Historial de Compras */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Historial de Facturas de Compra</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">Fecha</th>
                <th className="p-4">Proveedor</th>
                <th className="p-4">Factura N°</th>
                <th className="p-4">Bodega de Destino</th>
                <th className="p-4 text-right">Monto Total</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650 text-xs">
              {purchases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400">
                    No se han registrado facturas de compra en este tenant.
                  </td>
                </tr>
              ) : (
                paginated.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6 font-semibold text-slate-800">
                      {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="p-4 font-bold text-slate-800">{p.supplier?.name || 'Eliminado'}</td>
                    <td className="p-4 font-mono text-slate-500">{p.invoiceNumber || '-'}</td>
                    <td className="p-4 text-slate-600">{p.warehouse?.name || 'Eliminado'}</td>
                    <td className="p-4 text-right font-black text-indigo-650">${parseFloat(p.totalAmount).toFixed(2)}</td>
                    <td className="p-4 pr-6 text-right">
                      <button
                        onClick={() => openDetailModal(p.id)}
                        className="text-indigo-600 hover:text-indigo-850 font-bold hover:underline"
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
        {purchases.length > itemsPerPage && (
          <div className="bg-white border-t border-slate-100 p-4 px-6 flex items-center justify-between text-xs font-bold text-slate-500">
            <div>
              Mostrando {Math.min(purchases.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(purchases.length, currentPage * itemsPerPage)} de {purchases.length} compras
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
                Pág. {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Registrar Compra */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-3xl overflow-hidden my-8">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-base">Registrar Compra / Factura Proveedor</h3>
                <p className="text-slate-400 text-[10px]">Ingresa los productos recibidos para aumentar su stock automáticamente.</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreatePurchase} className="p-5 space-y-6">
              
              {/* Header Fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Proveedor *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs bg-white transition"
                  >
                    <option value="">Selecciona Proveedor...</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Bodega de Ingreso *</label>
                  <select
                    required
                    value={warehouseId}
                    onChange={(e) => setWarehouseId(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs bg-white transition"
                  >
                    <option value="">Selecciona Bodega...</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} ({w.branch?.name})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">N° Factura (Opcional)</label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="ej. FACT-2026-987"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                  <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Productos de la Factura</span>
                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="text-xs font-bold text-indigo-650 hover:text-indigo-805 transition flex items-center gap-1"
                  >
                    + Agregar Renglón
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {purchaseItems.map((item, index) => (
                    <div key={index} className="flex gap-3 items-end bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                      <div className="flex-1 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Producto *</label>
                        <select
                          required
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs bg-white"
                        >
                          <option value="">Selecciona Producto...</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name} {p.skuBarcode ? `(${p.skuBarcode})` : ''}</option>
                          ))}
                        </select>
                      </div>
                      <div className="w-24 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Cantidad *</label>
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold"
                        />
                      </div>
                      <div className="w-28 space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Costo Unit. ($) *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={item.costPrice}
                          onChange={(e) => handleItemChange(index, 'costPrice', e.target.value)}
                          className="w-full px-2 py-1.5 border border-slate-200 rounded-lg text-xs font-bold text-indigo-650 bg-indigo-50/30"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(index)}
                        disabled={purchaseItems.length === 1}
                        className="p-2.5 text-rose-600 hover:bg-rose-50 rounded-lg disabled:opacity-40"
                        title="Quitar"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes & Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end pt-4 border-t border-slate-100">
                <div className="md:col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notas / Observaciones</label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="ej. Mercancía recibida en buen estado. Pago a 30 días."
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                  />
                </div>
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-center items-end shadow-inner">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total a Registrar</span>
                  <span className="text-xl font-black text-indigo-650">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {saving ? 'Procesando...' : 'Completar Compra'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle de Compra */}
      {isDetailOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden max-h-[85vh] flex flex-col">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 text-base">Detalle de Factura de Compra</h3>
              <button onClick={() => setIsDetailOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {detailLoading ? (
              <div className="flex items-center justify-center p-12">
                <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
              </div>
            ) : selectedPurchase ? (
              <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
                
                {/* Routing / Metadata */}
                <div className="grid grid-cols-2 gap-4 border border-slate-100 p-4 rounded-xl bg-slate-50/50">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Proveedor</span>
                    <span className="font-bold text-slate-800 block mt-1">{selectedPurchase.supplier?.name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">ID: {selectedPurchase.supplier?.taxId || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Almacén de Ingreso</span>
                    <span className="font-bold text-slate-800 block mt-1">{selectedPurchase.warehouse?.name}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{selectedPurchase.warehouse?.branch?.name}</span>
                  </div>
                </div>

                {/* Items */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Artículos Ingresados</span>
                  <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                    {selectedPurchase.items?.map((item: any) => (
                      <div key={item.id} className="p-3 flex items-center justify-between font-medium">
                        <div className="space-y-0.5">
                          <span className="text-slate-800 font-bold block">{item.product?.name ?? 'Producto Eliminado'}</span>
                          <span className="text-slate-400 text-[10px] block">SKU: {item.product?.skuBarcode || 'N/A'} • Costo Unit: ${parseFloat(item.costPrice).toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-indigo-650 bg-indigo-50 px-2 py-0.5 rounded text-[10px] block">
                            {Number(item.quantity)} u.
                          </span>
                          <span className="font-black text-slate-800 block mt-1">${parseFloat(item.subtotal).toFixed(2)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Invoice Footer Details */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase">Monto Total de Compra:</span>
                  <span className="text-base font-black text-indigo-650">${parseFloat(selectedPurchase.totalAmount).toFixed(2)}</span>
                </div>

                {selectedPurchase.notes && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Notas</span>
                    <p className="p-3 border border-slate-100 rounded-xl bg-slate-50/20 italic text-slate-600">{selectedPurchase.notes}</p>
                  </div>
                )}

                <div className="text-[10px] text-slate-400 space-y-0.5 pt-2 border-t border-slate-100">
                  <div>Registrado por: <span className="font-semibold text-slate-600">{selectedPurchase.user?.name ?? 'N/A'}</span></div>
                  <div>Fecha de registro: <span className="font-semibold text-slate-600">{new Date(selectedPurchase.createdAt).toLocaleString()}</span></div>
                  {selectedPurchase.invoiceNumber && <div>Número de Factura: <span className="font-semibold text-slate-600">{selectedPurchase.invoiceNumber}</span></div>}
                </div>

              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">Error al cargar información.</div>
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
