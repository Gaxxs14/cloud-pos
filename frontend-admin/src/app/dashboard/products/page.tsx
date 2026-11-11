'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usdToBs, setUsdToBs] = useState<number>(1.0);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isShelfTagsOpen, setIsShelfTagsOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  
  const [name, setName] = useState('');
  const [skuBarcode, setSkuBarcode] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [description, setDescription] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [sellPrice, setSellPrice] = useState(0);
  const [stock, setStock] = useState(0);
  const [minStock, setMinStock] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isExempt, setIsExempt] = useState(true);
  
  // Mayorista y Lotes / Vencimientos (Retail Venezuela)
  const [wholesalePrice, setWholesalePrice] = useState<number | ''>('');
  const [wholesaleMinQty, setWholesaleMinQty] = useState<number | ''>('');
  const [unitsPerBox, setUnitsPerBox] = useState<number | ''>('');
  const [expirationDate, setExpirationDate] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
  
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // UX states: Toasts y Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadProducts = async () => {
    try {
      const [productsData, categoriesData, rateData] = await Promise.all([
        api.get('/products'),
        api.get('/categories').catch(() => []),
        api.get('/exchange-rates/current').catch(() => ({ usdToBs: 1 })),
      ]);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setCategories(categoriesData);
      if (rateData && rateData.usdToBs) {
        setUsdToBs(parseFloat(rateData.usdToBs) || 1.0);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar productos');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) {
      setFilteredProducts(products);
    } else {
      setFilteredProducts(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.skuBarcode && p.skuBarcode.toLowerCase().includes(q)) ||
            (p.lotNumber && p.lotNumber.toLowerCase().includes(q))
        )
      );
    }
    setCurrentPage(1);
  }, [searchQuery, products]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName('');
    setSkuBarcode('');
    setImageUrl('');
    setDescription('');
    setCostPrice(0);
    setSellPrice(0);
    setStock(0);
    setMinStock(0);
    setIsActive(true);
    setIsExempt(true);
    setWholesalePrice('');
    setWholesaleMinQty('');
    setUnitsPerBox('');
    setExpirationDate('');
    setLotNumber('');
    setCategoryId('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (product: any) => {
    setEditingProduct(product);
    setName(product.name);
    setSkuBarcode(product.skuBarcode || '');
    setImageUrl(product.imageUrl || '');
    setDescription(product.description || '');
    setCostPrice(parseFloat(product.costPrice));
    setSellPrice(parseFloat(product.sellPrice));
    setStock(parseFloat(product.stock));
    setMinStock(parseFloat(product.minStock));
    setIsActive(product.isActive);
    setIsExempt(product.isExempt ?? true);
    setWholesalePrice(product.wholesalePrice ? parseFloat(product.wholesalePrice) : '');
    setWholesaleMinQty(product.wholesaleMinQty ? parseFloat(product.wholesaleMinQty) : '');
    setUnitsPerBox(product.unitsPerBox ? parseFloat(product.unitsPerBox) : '');
    setExpirationDate(product.expirationDate ? product.expirationDate.split('T')[0] : '');
    setLotNumber(product.lotNumber || '');
    setCategoryId(product.categoryId || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormLoading(true);

    const payload = {
      name,
      skuBarcode: skuBarcode || undefined,
      imageUrl: imageUrl || undefined,
      description: description || undefined,
      costPrice,
      sellPrice,
      stock,
      minStock,
      isActive,
      isExempt,
      wholesalePrice: wholesalePrice !== '' ? Number(wholesalePrice) : undefined,
      wholesaleMinQty: wholesaleMinQty !== '' ? Number(wholesaleMinQty) : undefined,
      unitsPerBox: unitsPerBox !== '' ? Number(unitsPerBox) : undefined,
      expirationDate: expirationDate ? new Date(expirationDate).toISOString() : undefined,
      lotNumber: lotNumber || undefined,
      categoryId: categoryId || undefined,
    };

    try {
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        showToast('Producto actualizado con éxito');
      } else {
        await api.post('/products', payload);
        showToast('Producto creado con éxito');
      }
      setIsModalOpen(false);
      loadProducts();
    } catch (err: any) {
      setFormError(err.message || 'Error al guardar el producto');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que deseas desactivar este producto?')) {
      try {
        await api.delete(`/products/${id}`);
        loadProducts();
        showToast('Producto desactivado con éxito');
      } catch (err: any) {
        showToast(err.message || 'Error al desactivar el producto', 'error');
      }
    }
  };

  const getExpirationStatus = (dateStr?: string) => {
    if (!dateStr) return null;
    const exp = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { label: 'Vencido', color: 'bg-rose-100 text-rose-700 border-rose-200' };
    }
    if (diffDays <= 30) {
      return { label: `Vence en ${diffDays}d`, color: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    return null;
  };

  if (loading) {
    return (
      <div className="space-y-5 font-sans animate-pulse">
        <div className="flex flex-col sm:flex-row justify-between gap-4 bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm">
          <div className="h-9 w-64 bg-slate-200 rounded-xl"></div>
          <div className="h-9 w-36 bg-slate-200 rounded-xl"></div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm space-y-4">
          <div className="h-6 w-full bg-slate-100 rounded-lg"></div>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-center justify-between gap-4 py-2 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-200 rounded-xl shrink-0"></div>
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-slate-200 rounded"></div>
                  <div className="h-3 w-24 bg-slate-100 rounded"></div>
                </div>
              </div>
              <div className="h-4 w-20 bg-slate-100 rounded hidden md:block"></div>
              <div className="h-4 w-16 bg-slate-100 rounded"></div>
              <div className="h-4 w-16 bg-slate-200 rounded"></div>
              <div className="h-4 w-12 bg-slate-100 rounded"></div>
              <div className="h-6 w-20 bg-slate-200 rounded-lg"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 font-sans text-sm text-slate-650">
      
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
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-605 rounded-xl focus:outline-none text-sm text-slate-900 placeholder-slate-400 transition"
            placeholder="Buscar por nombre, SKU o lote..."
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={() => setIsShelfTagsOpen(true)}
            className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-xs flex items-center justify-center gap-2 border border-slate-200"
          >
            🏷️ Imprimir Etiquetas de Estante
          </button>
          <button
            onClick={openAddModal}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition shadow-sm text-xs flex items-center justify-center gap-2 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Agregar Producto
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Table grid */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">Nombre del Producto</th>
                <th className="p-4">SKU / Lote</th>
                <th className="p-4 text-right">Costo</th>
                <th className="p-4 text-right">Venta (USD / Bs)</th>
                <th className="p-4 text-right">Stock</th>
                <th className="p-4 text-center">Estado / Alertas</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650 text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-6 text-center text-slate-400">
                    No se encontraron productos.
                  </td>
                </tr>
              ) : (
                filteredProducts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((product) => {
                  const stock = parseFloat(product.stock);
                  const minStock = parseFloat(product.minStock);
                  const isLowStock = stock <= minStock;
                  const expStatus = getExpirationStatus(product.expirationDate);
                  const sellUsd = parseFloat(product.sellPrice);
                  const sellBs = sellUsd * usdToBs;

                  return (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 pl-6">
                        <div className="flex items-center gap-3">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-12 h-12 object-cover rounded-xl border border-slate-200 shadow-sm shrink-0 bg-slate-50"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center justify-center shrink-0">
                              <span className="text-indigo-500 font-extrabold text-base">{product.name.charAt(0)}</span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="font-bold text-slate-800 leading-tight">{product.name}</p>
                              {product.isExempt ? (
                                <span className="text-[9px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded border border-slate-200">
                                  EXENTO
                                </span>
                              ) : (
                                <span className="text-[9px] bg-indigo-50 text-indigo-700 font-bold px-1.5 py-0.5 rounded border border-indigo-200">
                                  IVA 16%
                                </span>
                              )}
                              {product.wholesalePrice && (
                                <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded border border-emerald-200">
                                  MAYOR (${parseFloat(product.wholesalePrice).toFixed(2)})
                                </span>
                              )}
                            </div>
                            {product.description && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-500">
                        <div>{product.skuBarcode || '-'}</div>
                        {product.lotNumber && (
                          <div className="text-[10px] text-slate-400 font-sans">Lote: {product.lotNumber}</div>
                        )}
                      </td>
                      <td className="p-4 text-right text-slate-400">${parseFloat(product.costPrice).toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <div className="font-extrabold text-indigo-650">${sellUsd.toFixed(2)}</div>
                        {usdToBs > 1.0 && (
                          <div className="text-[10px] font-semibold text-slate-400">Bs. {sellBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        )}
                      </td>
                      <td className="p-4 text-right">
                        <div className="group relative inline-block cursor-help">
                          <span className={`font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                            {product.stock}
                          </span>
                          {product.stocks && product.stocks.length > 0 && (
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg shadow-xl z-20 space-y-1 text-left">
                              <div className="font-bold border-b border-slate-700 pb-1 mb-1">Stock por Almacén</div>
                              {product.stocks.map((s: any) => (
                                <div key={s.id} className="flex justify-between gap-2">
                                  <span className="truncate">{s.warehouse?.name || 'Almacén'}</span>
                                  <span className="font-bold">{s.stock} u.</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        {isLowStock && (
                          <span className="text-[9px] bg-rose-50 text-rose-700 px-2 py-0.5 rounded-lg ml-2 font-black uppercase tracking-wider">
                            Bajo
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full ${
                            product.isActive
                              ? 'bg-emerald-50 text-emerald-700'
                              : 'bg-slate-100 text-slate-400'
                          }`}>
                            {product.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                          {expStatus && (
                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${expStatus.color}`}>
                              {expStatus.label}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 pr-6 text-right space-x-3 text-xs">
                        <button
                          onClick={() => openEditModal(product)}
                          className="text-indigo-600 hover:text-indigo-850 font-bold hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="text-rose-600 hover:text-rose-800 font-bold hover:underline"
                        >
                          Desactivar
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
        {filteredProducts.length > itemsPerPage && (
          <div className="bg-white border-t border-slate-100 p-4 px-6 flex items-center justify-between text-xs font-bold text-slate-500">
            <div>
              Mostrando {Math.min(filteredProducts.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredProducts.length, currentPage * itemsPerPage)} de {filteredProducts.length} productos
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
                Pág. {currentPage} de {Math.ceil(filteredProducts.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredProducts.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredProducts.length / itemsPerPage)}
                className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Imprimir Etiquetas de Estante (Góndola) */}
      {isShelfTagsOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full p-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Etiquetas para Góndola / Estante</h3>
                <p className="text-xs text-slate-400">Precios duales en USD y Bolívares oficiales para exhibición al público</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow"
                >
                  🖨️ Imprimir Etiquetas
                </button>
                <button
                  onClick={() => setIsShelfTagsOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto p-4 flex-1">
              {filteredProducts.map((p) => {
                const pUsd = parseFloat(p.sellPrice);
                const pBs = pUsd * usdToBs;
                return (
                  <div key={p.id} className="border-2 border-dashed border-slate-300 rounded-xl p-3 bg-white flex flex-col justify-between shadow-sm">
                    <div>
                      <p className="font-extrabold text-slate-900 text-xs uppercase truncate leading-tight">{p.name}</p>
                      <p className="font-mono text-[9px] text-slate-400 mt-0.5">SKU: {p.skuBarcode || '-'}</p>
                    </div>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400">USD </span>
                        <span className="text-lg font-black text-indigo-650">${pUsd.toFixed(2)}</span>
                      </div>
                      {usdToBs > 1.0 && (
                        <div className="text-right">
                          <span className="text-[8px] font-bold text-slate-400">Bs. </span>
                          <span className="text-xs font-bold text-slate-800">{pBs.toFixed(2)}</span>
                        </div>
                      )}
                    </div>
                    {p.wholesalePrice && (
                      <div className="mt-1 text-[8px] text-emerald-700 font-bold bg-emerald-50 px-1 py-0.5 rounded text-center">
                        Mayor: ${parseFloat(p.wholesalePrice).toFixed(2)} (x{p.wholesaleMinQty || 3})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal Formulario Producto */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 sm:p-8 max-h-[90vh] flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
              <h2 className="text-lg font-black text-slate-900">
                {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 rounded-full p-1 transition"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-slate-650">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  placeholder="Harina PAN 1Kg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-1.5">
                    Código de Barras / SKU
                  </label>
                  <input
                    type="text"
                    value={skuBarcode}
                    onChange={(e) => setSkuBarcode(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                    placeholder="759101100010"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                    Categoría
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  >
                    <option value="">Sin Categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                    Costo ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-655 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                    Precio Venta Detal ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-655 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  />
                </div>
              </div>

              {/* Sección Retail y Ventas al Mayor */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <p className="text-[11px] font-black uppercase text-indigo-700 tracking-wider">Configuración Mayorista y Empaque</p>
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Precio Mayor ($)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={wholesalePrice}
                      onChange={(e) => setWholesalePrice(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="0.00"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Cant. Mínima Mayor
                    </label>
                    <input
                      type="number"
                      value={wholesaleMinQty}
                      onChange={(e) => setWholesaleMinQty(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="Ej: 6"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Unid. por Bulto
                    </label>
                    <input
                      type="number"
                      value={unitsPerBox}
                      onChange={(e) => setUnitsPerBox(e.target.value === '' ? '' : parseFloat(e.target.value))}
                      placeholder="Ej: 24"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>
              </div>

              {/* Sección Control de Vencimientos y Lotes */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                <p className="text-[11px] font-black uppercase text-amber-700 tracking-wider">Control de Caducidad y Lote</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Fecha de Vencimiento
                    </label>
                    <input
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                      Nº de Lote
                    </label>
                    <input
                      type="text"
                      value={lotNumber}
                      onChange={(e) => setLotNumber(e.target.value)}
                      placeholder="LOTE-2026-A"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(parseFloat(e.target.value) || 0)}
                    disabled={!!editingProduct}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 transition disabled:opacity-40 disabled:bg-slate-100 font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-1.5">
                    Stock Mínimo
                  </label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-655 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  />
                </div>
              </div>

              {/* Toggles fiscales y estado */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={isExempt}
                    onChange={(e) => setIsExempt(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-700">Exento de IVA</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600"
                  />
                  <span className="text-xs font-bold text-slate-700">Activo para Venta</span>
                </label>
              </div>

              <div className="sticky bottom-0 bg-white pt-4 pb-1 border-t border-slate-200 flex justify-end gap-3 mt-4 z-10 shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition shadow-sm disabled:opacity-50"
                >
                  {formLoading ? 'Guardando...' : editingProduct ? 'Actualizar Producto' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl border text-xs font-bold flex items-center gap-2 transition-all duration-200 ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <span>{toast.type === 'success' ? '✓' : '✕'}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}
