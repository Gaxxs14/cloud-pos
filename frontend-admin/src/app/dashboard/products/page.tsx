'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      const [productsData, categoriesData] = await Promise.all([
        api.get('/products'),
        api.get('/categories').catch(() => []), // fallback si falla
      ]);
      setProducts(productsData);
      setFilteredProducts(productsData);
      setCategories(categoriesData);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
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
            placeholder="Buscar producto..."
          />
        </div>

        <button
          onClick={openAddModal}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-2.5 rounded-xl transition text-xs flex items-center gap-1.5 shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Agregar Producto
        </button>
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
                <th className="p-4">SKU / Cód. Barras</th>
                <th className="p-4 text-right">Costo</th>
                <th className="p-4 text-right">Venta</th>
                <th className="p-4 text-right">Stock</th>
                <th className="p-4 text-center">Estado</th>
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
                            <p className="font-bold text-slate-800 leading-tight">{product.name}</p>
                            {product.description && (
                              <p className="text-[10px] text-slate-400 truncate max-w-[180px]">{product.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-xs text-slate-400">{product.skuBarcode || '-'}</td>
                      <td className="p-4 text-right text-slate-400">${parseFloat(product.costPrice).toFixed(2)}</td>
                      <td className="p-4 text-right font-bold text-indigo-650">${parseFloat(product.sellPrice).toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <div className="group relative inline-block cursor-help">
                          <span className={`font-bold ${isLowStock ? 'text-rose-600' : 'text-slate-800'}`}>
                            {parseInt(product.stock)}
                          </span>
                          {product.stocks && product.stocks.length > 0 && (
                            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg shadow-xl z-20 space-y-1 text-left">
                              <div className="font-bold border-b border-slate-700 pb-1 mb-1">Stock por Almacén</div>
                              {product.stocks.map((s: any) => (
                                <div key={s.id} className="flex justify-between gap-2">
                                  <span className="truncate">{s.warehouse?.name || 'Almacén'}</span>
                                  <span className="font-bold">{parseInt(s.stock)} u.</span>
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
                        <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                          product.isActive
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-400'
                        }`}>
                          {product.isActive ? 'Activo' : 'Inactivo'}
                        </span>
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

      {/* Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition duration-150">
          <div className="relative bg-white border border-slate-200 rounded-3xl shadow-lg w-full max-w-lg p-8 flex flex-col max-h-[85vh]">
            
            <h3 className="text-lg font-black text-slate-900 mb-5">
              {editingProduct ? 'Editar Producto' : 'Crear Producto'}
            </h3>

            {formError && (
              <div className="mb-5 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-700 text-sm font-semibold">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto pr-1 flex-1 text-slate-650">
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  placeholder="Coca Cola 600ml"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">
                    Código de Barras / SKU
                  </label>
                  <input
                    type="text"
                    value={skuBarcode}
                    onChange={(e) => setSkuBarcode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                    placeholder="7501055300010"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-2">
                    Categoría
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  >
                    <option value="">Sin Categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-2">
                    Costo ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-655 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-2">
                    Precio de Venta ($) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellPrice}
                    onChange={(e) => setSellPrice(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-655 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-2">
                    Stock Inicial
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(parseFloat(e.target.value) || 0)}
                    disabled={!!editingProduct}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 transition disabled:opacity-30 disabled:bg-slate-100 font-medium text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-455 uppercase tracking-wider mb-2">
                    Stock Mínimo Alerta
                  </label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(parseFloat(e.target.value) || 0)}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-655 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">
                  URL de Imagen del Producto
                </label>
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
                {imageUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-sm"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-[11px] text-slate-400">Vista previa de imagen</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">
                  Descripción
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition font-medium resize-none"
                  placeholder="Descripción breve del producto (opcional)"
                />
              </div>

              <div className="flex items-center gap-3 py-1.5">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600/10"
                />
                <label htmlFor="isActive" className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                  Disponible para cobros
                </label>
              </div>

              <div className="sticky bottom-0 bg-white pt-4 pb-1 border-t border-slate-200 flex justify-end gap-3 mt-4 z-10 shadow-sm">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-3 border border-slate-300 text-slate-700 font-bold rounded-xl hover:bg-slate-100 transition text-sm cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black rounded-xl transition shadow-md shadow-indigo-600/20 text-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {formLoading ? (
                    <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Guardar Producto</span>
                    </>
                  )}
                </button>
              </div>
            </form>
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
