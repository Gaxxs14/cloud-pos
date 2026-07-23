'use client';

import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [creditHistory, setCreditHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // UX states: Toasts y Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Menos por columna de sidebar
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Modals & forms
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Customer Form
  const [name, setName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Credit Config Form
  const [allowCredit, setAllowCredit] = useState(false);
  const [creditLimit, setCreditLimit] = useState(0);

  // Payment Form
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'TRANSFER'>('CASH');
  const [paymentNotes, setPaymentNotes] = useState('');

  const loadCustomers = async (selectId?: string) => {
    try {
      setLoading(true);
      const data = await api.get('/customers');
      setCustomers(data);
      setFilteredCustomers(data);

      if (data.length > 0) {
        let active = data[0];
        if (selectId) {
          active = data.find((c: any) => c.id === selectId) || data[0];
        } else if (selectedCustomer) {
          active = data.find((c: any) => c.id === selectedCustomer.id) || data[0];
        }
        handleSelectCustomer(active);
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.message || 'Error al cargar clientes');
      setLoading(false);
    }
  };

  const handleSelectCustomer = async (customer: any) => {
    setSelectedCustomer(customer);
    setAllowCredit(customer.allowCredit);
    setCreditLimit(parseFloat(customer.creditLimit ?? 0));

    setHistoryLoading(true);
    try {
      const history = await api.get(`/customers/${customer.id}/credit-history`);
      setCreditHistory(history);
    } catch (err) {
      setCreditHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, customers]);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const newCustomer = await api.post('/customers', {
        name,
        taxId: taxId || undefined,
        phone: phone || undefined,
        email: email || undefined,
      });

      // Clear
      setName('');
      setTaxId('');
      setPhone('');
      setEmail('');
      setIsCustomerModalOpen(false);
      await loadCustomers(newCustomer.id);
      showToast('Cliente registrado exitosamente');
    } catch (err: any) {
      showToast(err.message || 'Error al crear cliente', 'error');
    }
  };

  const handleSaveCreditConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    try {
      const updated = await api.put(`/customers/${selectedCustomer.id}`, {
        name: selectedCustomer.name,
        taxId: selectedCustomer.taxId || undefined,
        phone: selectedCustomer.phone || undefined,
        email: selectedCustomer.email || undefined,
        allowCredit,
        creditLimit: Number(creditLimit),
      });
      showToast('Configuración de crédito guardada');
      await loadCustomers(updated.id);
    } catch (err: any) {
      showToast(err.message || 'Error al guardar configuración de crédito', 'error');
    }
  };

  const handleRegisterPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !paymentAmount || Number(paymentAmount) <= 0) return;

    try {
      await api.post(`/customers/${selectedCustomer.id}/pay-credit`, {
        amount: Number(paymentAmount),
        paymentMethod,
        notes: paymentNotes || undefined,
      });

      // Clear
      setPaymentAmount('');
      setPaymentNotes('');
      setPaymentMethod('CASH');
      setIsPaymentModalOpen(false);
      await loadCustomers(selectedCustomer.id);
      showToast('Abono registrado con éxito');
    } catch (err: any) {
      showToast(err.message || 'Error al registrar el abono. Verifica si hay una caja abierta.', 'error');
    }
  };

  const handleDeleteCustomer = async () => {
    if (!selectedCustomer) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este cliente?')) return;

    try {
      await api.delete(`/customers/${selectedCustomer.id}`);
      setSelectedCustomer(null);
      await loadCustomers();
      showToast('Cliente eliminado exitosamente');
    } catch (err: any) {
      showToast(err.message || 'No se puede eliminar el cliente. Verifica si tiene saldo pendiente.', 'error');
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
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Créditos y Clientes</h1>
          <p className="text-slate-400 text-xs">Administra las cuentas de crédito (fiados), límites de deuda y abonos de clientes.</p>
        </div>
        <button
          onClick={() => setIsCustomerModalOpen(true)}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold text-xs rounded-xl hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Cliente
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl font-semibold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left: Customers List */}
        <div className="md:col-span-1 bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Cartera de Clientes</span>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar cliente..."
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-600 focus:outline-none rounded-xl text-xs text-slate-900 transition"
              />
            </div>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {filteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                No hay clientes registrados.
              </div>
            ) : (
              filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((c) => {
                const hasDebt = parseFloat(c.currentDebt ?? 0) > 0;
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectCustomer(c)}
                    className={`p-4 cursor-pointer transition flex items-center justify-between ${
                      selectedCustomer?.id === c.id
                        ? 'bg-indigo-50/60 border-l-4 border-indigo-600 pl-3'
                        : 'hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-800 text-xs">{c.name}</div>
                      <div className="text-[11px] text-slate-400">{c.phone || c.email || 'Sin contacto'}</div>
                    </div>
                    {hasDebt ? (
                      <span className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] font-bold rounded">
                        Debe ${parseFloat(c.currentDebt ?? 0).toFixed(2)}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded">
                        Al corriente
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          {/* Paginación */}
          {filteredCustomers.length > itemsPerPage && (
            <div className="bg-white border-t border-slate-100 p-3.5 flex items-center justify-between text-[11px] font-bold text-slate-500">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-2 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Prev
              </button>
              <span>
                {currentPage} / {Math.ceil(filteredCustomers.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, Math.ceil(filteredCustomers.length / itemsPerPage)))}
                disabled={currentPage === Math.ceil(filteredCustomers.length / itemsPerPage)}
                className="px-2 py-1 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Sig
              </button>
            </div>
          )}
        </div>

        {/* Right: Customer Profile and Credit Detail */}
        <div className="md:col-span-2 space-y-6">
          {selectedCustomer ? (
            <>
              {/* Profile Card */}
              <div className="bg-white border border-slate-200/80 p-6 rounded-xl shadow-sm space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-base font-extrabold text-slate-800">{selectedCustomer.name}</h2>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2 mt-3 text-xs text-slate-500">
                      <div><span className="font-semibold text-slate-400">RFC/ID:</span> {selectedCustomer.taxId || '-'}</div>
                      <div><span className="font-semibold text-slate-400">Teléfono:</span> {selectedCustomer.phone || '-'}</div>
                      <div><span className="font-semibold text-slate-400">Correo:</span> {selectedCustomer.email || '-'}</div>
                      <div><span className="font-semibold text-slate-400">Deuda actual:</span> <span className={parseFloat(selectedCustomer.currentDebt ?? 0) > 0 ? "font-bold text-rose-600" : "font-bold text-slate-700"}>${parseFloat(selectedCustomer.currentDebt ?? 0).toFixed(2)}</span></div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsPaymentModalOpen(true)}
                      className="px-3.5 py-1.5 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition shadow-sm"
                    >
                      Registrar Abono
                    </button>
                    <button
                      onClick={handleDeleteCustomer}
                      className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-xl transition"
                      title="Eliminar Cliente"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Credit limit settings */}
              <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm space-y-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Parámetros de Crédito</span>
                <form onSubmit={handleSaveCreditConfig} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Habilitar Crédito</label>
                    <select
                      value={allowCredit ? 'true' : 'false'}
                      onChange={(e) => setAllowCredit(e.target.value === 'true')}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:border-indigo-650 text-xs focus:outline-none bg-white transition"
                    >
                      <option value="false">Desactivado (Solo Contado)</option>
                      <option value="true">Activo (Permite Fiado)</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Límite de Crédito ($)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      required
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(Number(e.target.value))}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-xl focus:border-indigo-650 text-xs focus:outline-none transition"
                      disabled={!allowCredit}
                    />
                  </div>
                  <div>
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition shadow-sm"
                    >
                      Guardar Cambios
                    </button>
                  </div>
                </form>
              </div>

              {/* Credit history / Estado de cuenta */}
              <div className="bg-white border border-slate-200/80 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Estado de Cuenta / Movimientos</span>
                </div>
                <div className="overflow-x-auto max-h-[300px]">
                  {historyLoading ? (
                    <div className="p-8 text-center text-slate-400 text-xs">Cargando movimientos...</div>
                  ) : creditHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">Sin transacciones de crédito registradas.</div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          <th className="p-3 pl-4">Fecha</th>
                          <th className="p-3">Concepto</th>
                          <th className="p-3 text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs text-slate-600 font-medium">
                        {creditHistory.map((log) => {
                          const isAbono = log.type === 'PAYMENT';
                          return (
                            <tr key={log.id} className="hover:bg-slate-50/40">
                              <td className="p-3 pl-4 text-slate-450">{new Date(log.createdAt).toLocaleDateString()} {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                              <td className="p-3">
                                {log.notes}
                              </td>
                              <td className={`p-3 text-right font-bold ${isAbono ? 'text-emerald-600' : 'text-rose-600'}`}>
                                {isAbono ? '' : '+'}${Math.abs(parseFloat(log.amount)).toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200/80 p-8 rounded-xl shadow-sm text-center text-slate-400">
              Selecciona un cliente para configurar sus límites o realizar cobros de deudas.
            </div>
          )}
        </div>
      </div>

      {/* Modal: New Customer */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">Crear Nuevo Cliente</h3>
              <button onClick={() => setIsCustomerModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleCreateCustomer} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="ej. Juan Pérez"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Identificación Fiscal / RFC (Opcional)</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="ej. PEJU800101XYZ"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Teléfono</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="55-1234-5678"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Correo Electrónico</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="juan@correo.com"
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCustomerModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white font-bold text-xs rounded-xl hover:bg-indigo-700 transition"
                >
                  Registrar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Register Payment (Abono) */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-base">Registrar Abono a Deuda</h3>
              <button onClick={() => setIsPaymentModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleRegisterPayment} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Monto a Abonar ($) *</label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Monto"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs font-bold transition"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Método de Pago Recibido *</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs bg-white transition"
                >
                  <option value="CASH">Efectivo</option>
                  <option value="CARD">Tarjeta de Crédito/Débito</option>
                  <option value="TRANSFER">Transferencia SPEI</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Notas / Concepto (Opcional)</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="ej. Abono de quincena"
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl focus:border-indigo-650 focus:outline-none text-xs transition"
                />
              </div>
              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 font-semibold text-xs rounded-xl hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl hover:bg-emerald-700 transition"
                >
                  Registrar Abono
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
