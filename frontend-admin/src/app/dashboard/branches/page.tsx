'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals / forms states
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);

  // Form states
  const [branchName, setBranchName] = useState('');
  const [branchAddress, setBranchAddress] = useState('');
  const [warehouseName, setWarehouseName] = useState('');

  // Estados de edición y notificaciones
  const [editingBranch, setEditingBranch] = useState<any | null>(null);
  const [editingWarehouse, setEditingWarehouse] = useState<any | null>(null);
  const [isEditBranchModalOpen, setIsEditBranchModalOpen] = useState(false);
  const [isEditWarehouseModalOpen, setIsEditWarehouseModalOpen] = useState(false);
  const [editBranchName, setEditBranchName] = useState('');
  const [editBranchAddress, setEditBranchAddress] = useState('');
  const [editWarehouseName, setEditWarehouseName] = useState('');

  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadBranches = async () => {
    try {
      setLoading(true);
      const data = await api.get('/branches');
      setBranches(data);
      if (data.length > 0 && !selectedBranch) {
        setSelectedBranch(data[0]);
      } else if (selectedBranch) {
        const updated = data.find((b: any) => b.id === selectedBranch.id);
        if (updated) setSelectedBranch(updated);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar sucursales');
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBranches();
  }, []);

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;

    try {
      const newBranch = await api.post('/branches', {
        name: branchName,
        address: branchAddress || undefined,
      });
      setBranchName('');
      setBranchAddress('');
      setIsBranchModalOpen(false);
      await loadBranches();
      setSelectedBranch(newBranch);
      showToast('Sucursal creada exitosamente');
    } catch (err: any) {
      showToast(err.message || 'Error al crear sucursal', 'error');
    }
  };

  const handleUpdateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranchName.trim() || !editingBranch) return;

    try {
      await api.put(`/branches/${editingBranch.id}`, {
        name: editBranchName,
        address: editBranchAddress || undefined,
      });
      setIsEditBranchModalOpen(false);
      setEditingBranch(null);
      await loadBranches();
      showToast('Sucursal actualizada exitosamente');
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar sucursal', 'error');
    }
  };

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!warehouseName.trim() || !selectedBranch) return;

    try {
      await api.post('/warehouses', {
        name: warehouseName,
        branchId: selectedBranch.id,
      });
      setWarehouseName('');
      setIsWarehouseModalOpen(false);
      await loadBranches();
      showToast('Almacén creado exitosamente');
    } catch (err: any) {
      showToast(err.message || 'Error al crear almacén', 'error');
    }
  };

  const handleUpdateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editWarehouseName.trim() || !editingWarehouse) return;

    try {
      await api.put(`/warehouses/${editingWarehouse.id}`, {
        name: editWarehouseName,
      });
      setIsEditWarehouseModalOpen(false);
      setEditingWarehouse(null);
      await loadBranches();
      showToast('Almacén actualizado exitosamente');
    } catch (err: any) {
      showToast(err.message || 'Error al actualizar almacén', 'error');
    }
  };

  const handleDeleteBranch = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas desactivar esta sucursal?')) return;
    try {
      await api.delete(`/branches/${id}`);
      setSelectedBranch(null);
      await loadBranches();
      showToast('Sucursal desactivada exitosamente');
    } catch (err: any) {
      showToast(err.message || 'Error al desactivar sucursal', 'error');
    }
  };

  const handleDeleteWarehouse = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas desactivar este almacén?')) return;
    try {
      await api.delete(`/warehouses/${id}`);
      await loadBranches();
      showToast('Almacén desactivado exitosamente');
    } catch (err: any) {
      showToast(err.message || 'Error al desactivar almacén', 'error');
    }
  };

  const openEditBranchModal = (branch: any) => {
    setEditingBranch(branch);
    setEditBranchName(branch.name);
    setEditBranchAddress(branch.address || '');
    setIsEditBranchModalOpen(true);
  };

  const openEditWarehouseModal = (wh: any) => {
    setEditingWarehouse(wh);
    setEditWarehouseName(wh.name);
    setIsEditWarehouseModalOpen(true);
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Sucursales y Almacenes</h1>
          <p className="text-slate-400 text-xs">Administra los locales físicos y las bodegas/almacenes de tu negocio.</p>
        </div>
        <button
          onClick={() => setIsBranchModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Nueva Sucursal
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Branch List */}
        <div className="md:col-span-1 bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tus Sucursales</span>
          </div>
          <div className="divide-y divide-slate-100">
            {branches.length === 0 ? (
              <div className="p-6 text-center text-slate-400">
                No tienes sucursales registradas.
              </div>
            ) : (
              branches.map((b) => (
                <div
                  key={b.id}
                  onClick={() => setSelectedBranch(b)}
                  className={`p-4 cursor-pointer transition flex items-center justify-between ${
                    selectedBranch?.id === b.id
                      ? 'bg-indigo-50/60 border-l-4 border-indigo-600 pl-3'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-800">{b.name}</div>
                    <div className="text-xs text-slate-400 max-w-[200px] truncate">{b.address || 'Sin dirección'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                      {b.warehouses?.length || 0} Bodegas
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Side: Selected Branch details */}
        <div className="md:col-span-2 space-y-6">
          {selectedBranch ? (
            <>
              {/* Branch Header Details */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{selectedBranch.name}</h2>
                    <p className="text-slate-400 text-xs mt-0.5">{selectedBranch.address || 'Sin dirección registrada'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditBranchModal(selectedBranch)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      title="Editar Sucursal"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteBranch(selectedBranch.id)}
                      className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Desactivar Sucursal"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Warehouses list */}
              <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Almacenes y Bodegas de la Sucursal</span>
                  <button
                    onClick={() => setIsWarehouseModalOpen(true)}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition flex items-center gap-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                    </svg>
                    Agregar Almacén
                  </button>
                </div>
                <div className="p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {!selectedBranch.warehouses || selectedBranch.warehouses.length === 0 ? (
                      <div className="col-span-2 py-8 text-center text-slate-400">
                        Esta sucursal no tiene almacenes creados.
                      </div>
                    ) : (
                      selectedBranch.warehouses.map((w: any) => (
                        <div key={w.id} className="p-4 border border-slate-200 rounded-xl space-y-2 bg-slate-50/30">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700">{w.name}</span>
                            <div className="flex items-center gap-1">
                               <button
                                 onClick={() => openEditWarehouseModal(w)}
                                 className="text-indigo-600 hover:text-indigo-800 font-bold text-xs"
                                 title="Editar"
                               >
                                 Editar
                               </button>
                               <span className="text-slate-300 text-xs">|</span>
                               <button
                                 onClick={() => handleDeleteWarehouse(w.id)}
                                 className="text-rose-600 hover:text-rose-800 font-bold text-xs"
                                 title="Desactivar"
                               >
                                 Desactivar
                               </button>
                             </div>
                          </div>
                          <p className="text-[11px] text-slate-450">Almacén activo</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200/80 p-8 rounded-xl shadow-sm text-center text-slate-400">
              Selecciona una sucursal para ver y administrar sus bodegas.
            </div>
          )}
        </div>
      </div>

      {/* modal sucursal */}
      {isBranchModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">Crear Nueva Sucursal</h3>
              <button onClick={() => setIsBranchModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateBranch} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre de la Sucursal</label>
                <input
                  type="text"
                  required
                  value={branchName}
                  onChange={(e) => setBranchName(e.target.value)}
                  placeholder="ej. Sucursal Centro"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dirección (Opcional)</label>
                <textarea
                  value={branchAddress}
                  onChange={(e) => setBranchAddress(e.target.value)}
                  placeholder="ej. Av. Constitución #456, Col. Centro"
                  rows={3}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none transition resize-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBranchModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
                >
                  Guardar Sucursal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* modal editar sucursal */}
      {isEditBranchModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">Modificar Sucursal</h3>
              <button onClick={() => { setIsEditBranchModalOpen(false); setEditingBranch(null); }} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateBranch} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre de la Sucursal</label>
                <input
                  type="text"
                  required
                  value={editBranchName}
                  onChange={(e) => setEditBranchName(e.target.value)}
                  placeholder="ej. Sucursal Centro"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Dirección (Opcional)</label>
                <textarea
                  value={editBranchAddress}
                  onChange={(e) => setEditBranchAddress(e.target.value)}
                  placeholder="ej. Av. Constitución #456, Col. Centro"
                  rows={3}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none transition resize-none"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditBranchModalOpen(false); setEditingBranch(null); }}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* modal almacén */}
      {isWarehouseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">Agregar Almacén a {selectedBranch?.name}</h3>
              <button onClick={() => setIsWarehouseModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre del Almacén</label>
                <input
                  type="text"
                  required
                  value={warehouseName}
                  onChange={(e) => setWarehouseName(e.target.value)}
                  placeholder="ej. Bodega B o Exhibición Ventas"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none transition"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWarehouseModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
                >
                  Guardar Almacén
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* modal editar almacén */}
      {isEditWarehouseModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">Modificar Almacén</h3>
              <button onClick={() => { setIsEditWarehouseModalOpen(false); setEditingWarehouse(null); }} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleUpdateWarehouse} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre del Almacén</label>
                <input
                  type="text"
                  required
                  value={editWarehouseName}
                  onChange={(e) => setEditWarehouseName(e.target.value)}
                  placeholder="ej. Bodega B o Exhibición Ventas"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-600 focus:outline-none transition"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => { setIsEditWarehouseModalOpen(false); setEditingWarehouse(null); }}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 transition"
                >
                  Guardar Cambios
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
