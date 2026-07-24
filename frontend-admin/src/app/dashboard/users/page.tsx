'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'OWNER' | 'MANAGER' | 'CASHIER'>('CASHIER');
  const [branchId, setBranchId] = useState('');
  const [saving, setSaving] = useState(false);

  // UX states: Toasts
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, branchesData] = await Promise.all([
        api.get('/users'),
        api.get('/branches'),
      ]);
      setUsers(usersData);
      setBranches(branchesData);

      // Get current logged-in user
      const session = api.getSession();
      if (session?.user?.id) {
        setCurrentUserId(session.user.id);
      }
    } catch (err: any) {
      setError(err.message || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreateModal = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setPassword('');
    setRole('CASHIER');
    setBranchId('');
    setIsModalOpen(true);
  };

  const openEditModal = (user: any) => {
    setEditingUser(user);
    setName(user.name);
    setEmail(user.email);
    setPassword('');
    setRole(user.role);
    setBranchId(user.branchId || '');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    if (!editingUser && !password.trim()) {
      showToast('La contraseña es requerida para nuevos usuarios', 'error');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        name,
        email,
        role,
        branchId: branchId || undefined,
      };

      if (password.trim()) {
        payload.password = password;
      }

      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, payload);
        showToast('Usuario actualizado con éxito');
      } else {
        await api.post('/users', payload);
        showToast('Usuario creado con éxito');
      }
      
      setIsModalOpen(false);
      setName('');
      setEmail('');
      setPassword('');
      setRole('CASHIER');
      setBranchId('');
      setEditingUser(null);
      await loadData();
    } catch (err: any) {
      showToast(err.message || 'Error al guardar usuario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (id === currentUserId) {
      showToast('No puedes eliminar tu propia cuenta de usuario administrador.', 'error');
      return;
    }

    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return;
    }

    try {
      await api.delete(`/users/${id}`);
      await loadData();
      showToast('Usuario eliminado con éxito');
    } catch (err: any) {
      showToast(err.message || 'Error al eliminar usuario', 'error');
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
          <h1 className="text-xl font-black text-slate-905 tracking-tight">Cajeros y Usuarios</h1>
          <p className="text-slate-400 text-xs">Administra las cuentas de tus cajeros y administradores de sucursal.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Usuario
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      {/* Lista de Usuarios */}
      <div className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 font-bold uppercase tracking-wider">
                <th className="p-4 pl-6">Nombre</th>
                <th className="p-4">Correo Electrónico</th>
                <th className="p-4">Rol</th>
                <th className="p-4">Sucursal Asignada</th>
                <th className="p-4 pr-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-650 text-sm">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No se han registrado usuarios adicionales en esta tienda.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  let roleBadge = 'bg-slate-100 text-slate-700 border-slate-200';
                  if (u.role === 'OWNER') roleBadge = 'bg-indigo-50 text-indigo-700 border-indigo-200';
                  if (u.role === 'MANAGER') roleBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/50 transition">
                      <td className="p-4 pl-6 font-bold text-slate-800 flex items-center gap-1.5">
                        {u.name}
                        {isSelf && (
                          <span className="px-1.5 py-0.5 bg-indigo-600 text-white text-[8px] font-black rounded uppercase tracking-wider">
                            Tú
                          </span>
                        )}
                      </td>
                      <td className="p-4 font-semibold text-slate-500">{u.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 border rounded text-[10px] font-bold uppercase ${roleBadge}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4 text-slate-600">
                        {u.branch?.name || (
                          <span className="text-slate-400 text-xs italic">Todas (Acceso Global)</span>
                        )}
                      </td>
                      <td className="p-4 pr-6 text-right space-x-2">
                        <button
                          onClick={() => openEditModal(u)}
                          className="text-indigo-650 hover:text-indigo-850 font-bold hover:underline text-xs"
                        >
                          Editar
                        </button>
                        {!isSelf && (
                          <>
                            <span className="text-slate-300">|</span>
                            <button
                              onClick={() => handleDelete(u.id)}
                              className="text-rose-600 hover:text-rose-800 font-bold hover:underline text-xs"
                            >
                              Eliminar
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
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
                {editingUser ? 'Modificar Usuario' : 'Registrar Nuevo Usuario'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Pedro Perez"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition"
                />
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Correo Electrónico</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition"
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Contraseña</label>
                  {editingUser && (
                    <span className="text-[10px] text-slate-400 font-bold italic">Llenar solo si cambia</span>
                  )}
                </div>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={editingUser ? 'Nueva contraseña (opcional)' : 'Mínimo 4 caracteres'}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition"
                />
              </div>

              {/* Rol */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Rol del Sistema</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition"
                >
                  <option value="CASHIER">Cajero (Solo cobrar y operar caja)</option>
                  <option value="MANAGER">Administrador (Gestión operativa)</option>
                  <option value="OWNER">Dueño (Acceso total)</option>
                </select>
              </div>

              {/* Sucursal */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Sucursal Asignada</label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-650 rounded-xl focus:outline-none text-sm text-slate-900 transition"
                >
                  <option value="">Todas las sucursales (Acceso Global)</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className="sticky bottom-0 bg-white pt-4 pb-1 border-t border-slate-200 flex justify-end gap-3 mt-4 z-10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-black text-xs rounded-xl transition shadow-md shadow-indigo-600/20 disabled:opacity-50 cursor-pointer flex items-center gap-2"
                >
                  {saving ? (
                    'Guardando...'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Guardar Usuario</span>
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
