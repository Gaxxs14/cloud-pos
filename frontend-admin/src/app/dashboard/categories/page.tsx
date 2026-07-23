'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  // UX states: Toasts
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await api.get('/categories');
      setCategories(data);
    } catch (err: any) {
      setError(err.message || 'Error al cargar categorías');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setIsModalOpen(true);
  };

  const openEditModal = (category: any) => {
    setEditingCategory(category);
    setName(category.name);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    try {
      if (editingCategory) {
        await api.put(`/categories/${editingCategory.id}`, { name });
        showToast('Categoría actualizada con éxito');
      } else {
        await api.post('/categories', { name });
        showToast('Categoría creada con éxito');
      }
      setIsModalOpen(false);
      setName('');
      setEditingCategory(null);
      await loadCategories();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar categoría', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría? Los productos asociados quedarán sin categoría.')) {
      return;
    }

    try {
      await api.delete(`/categories/${id}`);
      await loadCategories();
      showToast('Categoría eliminada con éxito');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar categoría', 'error');
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
    <div className="space-y-6 font-sans text-sm text-slate-650">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-905 tracking-tight">Categorías de Productos</h1>
          <p className="text-slate-400 text-xs">Clasifica tus productos para organizar tu catálogo de ventas en la sucursal.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Categoría
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Grid de Categorías */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm max-w-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">Nombre de la Categoría</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650 text-sm">
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-8 text-center text-slate-400">
                    No se han registrado categorías aún. Crea una para organizar tus productos.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition">
                    <td className="p-4 pl-6 font-bold text-slate-800">{c.name}</td>
                    <td className="p-4 pr-6 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(c)}
                        className="text-indigo-650 hover:text-indigo-850 font-bold hover:underline text-xs"
                      >
                        Editar
                      </button>
                      <span className="text-slate-300">|</span>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="text-rose-600 hover:text-rose-800 font-bold hover:underline text-xs"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition duration-150">
          <div className="relative bg-white border border-slate-200 rounded-2xl shadow-lg w-full max-w-md p-6 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-900">
                {editingCategory ? 'Modificar Categoría' : 'Crear Nueva Categoría'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Alimentos, Bebidas, Ferretería"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold text-xs rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-indigo-650 hover:bg-indigo-755 text-white font-semibold text-xs rounded-xl transition disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar'}
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
