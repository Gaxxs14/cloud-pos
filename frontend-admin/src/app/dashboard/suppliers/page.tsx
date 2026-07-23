'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form & modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  // Filter & Pagination states
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const data = await api.get('/suppliers');
      setSuppliers(data);
      setFilteredSuppliers(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar proveedores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, suppliers]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSuppliers(suppliers);
    } else {
      const q = searchQuery.toLowerCase();
      const filtered = suppliers.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.taxId && s.taxId.toLowerCase().includes(q)) ||
          (s.email && s.email.toLowerCase().includes(q))
      );
      setFilteredSuppliers(filtered);
    }
  }, [searchQuery, suppliers]);

  const openCreateModal = () => {
    setEditingSupplier(null);
    setName('');
    setTaxId('');
    setPhone('');
    setEmail('');
    setAddress('');
    setIsModalOpen(true);
  };

  const openEditModal = (supplier: any) => {
    setEditingSupplier(supplier);
    setName(supplier.name);
    setTaxId(supplier.taxId || '');
    setPhone(supplier.phone || '');
    setEmail(supplier.email || '');
    setAddress(supplier.address || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const payload = {
      name,
      taxId: taxId || undefined,
      phone: phone || undefined,
      email: email || undefined,
      address: address || undefined,
    };

    try {
      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, payload);
        showToast('Proveedor actualizado con éxito');
      } else {
        await api.post('/suppliers', payload);
        showToast('Proveedor registrado con éxito');
      }
      setIsModalOpen(false);
      await loadSuppliers();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar proveedor', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas desactivar este proveedor?')) return;

    try {
      await api.delete(`/suppliers/${id}`);
      await loadSuppliers();
      showToast('Proveedor desactivado con éxito');
    } catch (err: any) {
      showToast(err.message || 'Error al desactivar proveedor', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
      </div>
    );
  }

  const totalPages = Math.ceil(filteredSuppliers.length / itemsPerPage);
  const paginated = filteredSuppliers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div className="space-y-6 font-sans text-sm text-slate-650">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Directorio de Proveedores</h1>
          <p className="text-slate-400 text-xs">Administra los proveedores mayoristas con los que adquieres mercancía para tus almacenes.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Proveedor
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Bar de búsqueda */}
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
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-600 rounded-xl focus:outline-none text-xs text-slate-900 placeholder-slate-400 transition"
            placeholder="Buscar por nombre o ID fiscal..."
          />
        </div>
        <div className="text-xs font-bold text-slate-400">
          Mostrando {filteredSuppliers.length} proveedores.
        </div>
      </div>

      {/* Grid/Tabla */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">Nombre</th>
                <th className="p-4">ID Fiscal (RFC/RUT)</th>
                <th className="p-4">Contacto</th>
                <th className="p-4">Dirección</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600 text-xs">
              {filteredSuppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No se encontraron proveedores registrados.
                  </td>
                </tr>
              ) : (
                paginated.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6 font-bold text-slate-800">{s.name}</td>
                    <td className="p-4 text-slate-500 font-mono">{s.taxId || '-'}</td>
                    <td className="p-4">
                      <div className="space-y-0.5">
                        <span className="font-semibold block text-slate-700">{s.phone || '-'}</span>
                        <span className="text-[10px] text-slate-400 block">{s.email || '-'}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-450 truncate max-w-[200px]">{s.address || '-'}</td>
                    <td className="p-4 pr-6 text-right space-x-3">
                      <button
                        onClick={() => openEditModal(s)}
                        className="text-indigo-650 hover:text-indigo-855 font-bold hover:underline"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(s.id)}
                        className="text-rose-650 hover:text-rose-800 font-bold hover:underline"
                      >
                        Desactivar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {filteredSuppliers.length > itemsPerPage && (
          <div className="bg-white border-t border-slate-100 p-4 px-6 flex items-center justify-between text-xs font-bold text-slate-500">
            <div>
              Mostrando {Math.min(filteredSuppliers.length, (currentPage - 1) * itemsPerPage + 1)}-{Math.min(filteredSuppliers.length, currentPage * itemsPerPage)} de {filteredSuppliers.length} proveedores
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

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">
                {editingSupplier ? 'Modificar Proveedor' : 'Registrar Nuevo Proveedor'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre / Razón Social *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Distribuidora Polar C.A."
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Identificación Fiscal (Opcional)</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="ej. J-12345678-9"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Teléfono (Opcional)</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ej. +58 412-1234567"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Correo (Opcional)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ej. ventas@polar.com"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dirección Física (Opcional)</label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="ej. Zona Industrial, Galpón #4, Maracaibo"
                  rows={2}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition resize-none"
                />
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
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Proveedor'}
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
