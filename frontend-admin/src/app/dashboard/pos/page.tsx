'use client';

import React, { useEffect, useState, useRef } from 'react';
import api from '../../services/api';

interface Product {
  id: string;
  name: string;
  skuBarcode?: string;
  code?: string;
  imageUrl?: string;
  sellPrice: number;
  costPrice?: number;
  stock: number;
  minStock?: number;
  isExempt?: boolean;
  taxRate?: number;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  unitsPerBox?: number | null;
  expirationDate?: string | null;
  lotNumber?: string | null;
  category?: {
    id: string;
    name: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface HeldSale {
  id: string;
  time: string;
  customer: any | null;
  items: CartItem[];
  total: number;
}

export default function NativeWebPosPage() {
  // Estado general
  const [loading, setLoading] = useState(true);
  const [shift, setShift] = useState<any | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [usdToBs, setUsdToBs] = useState<number>(1.0);

  // Apertura de turno
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [selectedWarehouseId, setSelectedWarehouseId] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');

  // Filtros y catálogo
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isTableView, setIsTableView] = useState(false);
  const [mobileTab, setMobileTab] = useState<'CATALOG' | 'TICKET'>('CATALOG');

  // Carrito de compras
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [heldSales, setHeldSales] = useState<HeldSale[]>([]);

  // Modales (controlados para evitar duplicación con atajos)
  const [activeModal, setActiveModal] = useState<
    'HELP' | 'CUSTOMER' | 'CASH_TX' | 'SHIFT_MENU' | 'CHECKOUT' | 'HELD_SALES' | 'CLEAR_CONFIRM' | 'PIN_AUTH' | 'RECEIPT' | null
  >(null);

  // Estados de formularios dentro de modales
  const [txType, setTxType] = useState<'IN' | 'OUT'>('IN');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [supervisorPin, setSupervisorPin] = useState('');
  const [pinPendingAction, setPinPendingAction] = useState<(() => void) | null>(null);

  // Estados de Checkout
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'CARD' | 'PAGO_MOVIL' | 'SPLIT'>('CASH');
  const [receivedUsd, setReceivedUsd] = useState('');
  const [splitCashUsd, setSplitCashUsd] = useState('');
  const [splitCardBs, setSplitCardBs] = useState('');
  const [splitMobilePayBs, setSplitMobilePayBs] = useState('');
  const [splitMobilePayRef, setSplitMobilePayRef] = useState('');
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [lastSaleReceipt, setLastSaleReceipt] = useState<any | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Cargar datos iniciales
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [rateData, branchesData, custData] = await Promise.all([
        api.get('/exchange-rates/current').catch(() => ({ usdToBs: 1 })),
        api.get('/branches').catch(() => []),
        api.get('/customers').catch(() => []),
      ]);

      if (rateData && rateData.usdToBs) {
        setUsdToBs(parseFloat(rateData.usdToBs) || 1.0);
      }
      setBranches(branchesData);
      setCustomers(custData);

      // Verificar turno activo
      try {
        const activeShiftData = await api.get('/shifts/active');
        setShift(activeShiftData);
        if (activeShiftData) {
          await loadProducts(activeShiftData.warehouseId);
        }
      } catch (_) {
        setShift(null);
      }

      setLoading(false);
    } catch (e: any) {
      console.error(e);
      setLoading(false);
    }
  };

  const loadProducts = async (warehouseId?: string) => {
    try {
      if (warehouseId) {
        const stockData = await api.get(`/warehouses/${warehouseId}/stock`);
        const prods = stockData.map((item: any) => ({
          ...item.product,
          stock: parseFloat(item.stock) || 0,
          sellPrice: parseFloat(item.product.sellPrice) || 0,
          wholesalePrice: item.product.wholesalePrice ? parseFloat(item.product.wholesalePrice) : null,
          wholesaleMinQty: item.product.wholesaleMinQty ? parseFloat(item.product.wholesaleMinQty) : null,
        }));
        setProducts(prods);
      } else {
        const prodData = await api.get('/products');
        const prods = prodData.map((p: any) => ({
          ...p,
          stock: parseFloat(p.stock) || 0,
          sellPrice: parseFloat(p.sellPrice) || 0,
          wholesalePrice: p.wholesalePrice ? parseFloat(p.wholesalePrice) : null,
          wholesaleMinQty: p.wholesaleMinQty ? parseFloat(p.wholesaleMinQty) : null,
        }));
        setProducts(prods);
      }
    } catch (e) {
      console.error('Error al cargar productos:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Manejador Global de Atajos Físicos de Teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Si hay un modal abierto, permitir únicamente Escape para cerrarlo
      if (activeModal !== null) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setActiveModal(null);
        }
        return;
      }

      if (e.key === 'F1') {
        e.preventDefault();
        setActiveModal('HELP');
      } else if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (e.key === 'F3') {
        e.preventDefault();
        setActiveModal('CUSTOMER');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setTxType('IN');
        setActiveModal('CASH_TX');
      } else if (e.key === 'F5') {
        e.preventDefault();
        loadInitialData();
      } else if (e.key === 'F6') {
        e.preventDefault();
        setActiveModal('HELD_SALES');
      } else if (e.key === 'F7') {
        e.preventDefault();
        setActiveModal('SHIFT_MENU');
      } else if (e.key === 'F9') {
        e.preventDefault();
        if (cart.length > 0) {
          setActiveModal('CLEAR_CONFIRM');
        }
      } else if (e.key === 'F12') {
        e.preventDefault();
        if (cart.length > 0) {
          setReceivedUsd(totalUsd.toFixed(2));
          setActiveModal('CHECKOUT');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModal, cart, shift]);

  // Cálculos del Carrito
  const getItemUnitPrice = (item: CartItem) => {
    const { product, quantity } = item;
    if (
      product.wholesalePrice &&
      product.wholesaleMinQty &&
      quantity >= product.wholesaleMinQty &&
      product.wholesalePrice > 0
    ) {
      return product.wholesalePrice;
    }
    return product.sellPrice;
  };

  const getItemSubtotal = (item: CartItem) => {
    return getItemUnitPrice(item) * item.quantity;
  };

  const subtotalUsd = cart.reduce((sum, item) => sum + getItemSubtotal(item), 0);
  const totalUsd = subtotalUsd;
  const totalBs = totalUsd * usdToBs;

  // Acciones del Carrito
  const addToCart = (product: Product, customQty?: number) => {
    const qty = customQty ?? 1;
    setCart((prevCart) => {
      const idx = prevCart.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const updated = [...prevCart];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + qty };
        return updated;
      } else {
        return [...prevCart, { product, quantity: qty }];
      }
    });
  };

  const removeOneFromCart = (productId: string) => {
    const item = cart.find((i) => i.product.id === productId);
    if (!item) return;

    if (item.quantity <= 1) {
      // Solicitar PIN de supervisor para anular último ítem
      setPinPendingAction(() => () => {
        setCart((prev) => prev.filter((i) => i.product.id !== productId));
      });
      setActiveModal('PIN_AUTH');
      return;
    }

    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: i.quantity - 1 } : i))
    );
  };

  const deleteItemFromCart = (productId: string) => {
    setPinPendingAction(() => () => {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    });
    setActiveModal('PIN_AUTH');
  };

  // Filtrado de Productos
  const categoriesList = Array.from(
    new Set(products.map((p) => p.category?.name).filter(Boolean))
  ) as string[];

  const filteredProducts = products.filter((p) => {
    if (selectedCategory && p.category?.name !== selectedCategory) return false;

    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;

    const name = (p.name || '').toLowerCase();
    const barcode = (p.skuBarcode || p.code || '').toLowerCase();
    const queryNoZeros = query.replace(/^0+/, '');
    const barcodeNoZeros = barcode.replace(/^0+/, '');

    return (
      name.includes(query) ||
      barcode.includes(query) ||
      (queryNoZeros.length > 0 && barcodeNoZeros.includes(queryNoZeros))
    );
  });

  // Procesar código de barras al presionar Enter en el buscador
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;

    // Buscar coincidencia exacta por código de barras o SKU
    const match = products.find(
      (p) =>
        (p.skuBarcode && p.skuBarcode.toLowerCase() === q.toLowerCase()) ||
        (p.code && p.code.toLowerCase() === q.toLowerCase()) ||
        p.name.toLowerCase() === q.toLowerCase()
    );

    if (match) {
      addToCart(match);
      setSearchQuery('');
    } else {
      alert(`Código o producto "${q}" no encontrado en catálogo.`);
    }
  };

  // Apertura de Turno
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const bal = parseFloat(openingBalance) || 0;
    try {
      const newShift = await api.post('/shifts/open', {
        openingBalance: bal,
        branchId: selectedBranchId || undefined,
      });
      setShift(newShift);
      await loadProducts(selectedWarehouseId || undefined);
    } catch (err: any) {
      alert(err.message || 'Error al abrir caja');
    }
  };

  // Movimiento de Caja (Ingreso / Egreso)
  const handleCashTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0) return alert('Ingresa un monto válido');

    try {
      await api.post('/shifts/transaction', {
        amount: amt,
        type: txType,
        description: txDescription || (txType === 'IN' ? 'Ingreso de fondo' : 'Retiro de efectivo'),
      });
      setActiveModal(null);
      setTxAmount('');
      setTxDescription('');
      alert('Movimiento de caja registrado exitosamente');
    } catch (err: any) {
      alert(err.message || 'Error al registrar movimiento');
    }
  };

  // Cobrar Venta (Checkout)
  const handleCheckoutSubmit = async () => {
    if (cart.length === 0) return;
    setIsProcessingSale(true);

    try {
      const itemsPayload = cart.map((i) => ({
        productId: i.product.id,
        quantity: i.quantity,
        unitPrice: getItemUnitPrice(i),
      }));

      const payload: any = {
        paymentMethod,
        customerId: selectedCustomer?.id || undefined,
        warehouseId: shift?.warehouseId || undefined,
        totalAmount: totalUsd,
        items: itemsPayload,
      };

      if (paymentMethod === 'SPLIT') {
        payload.splitDetails = {
          cashUsd: parseFloat(splitCashUsd) || 0,
          cardBs: parseFloat(splitCardBs) || 0,
          mobilePayBs: parseFloat(splitMobilePayBs) || 0,
          mobilePayRef: splitMobilePayRef || undefined,
        };
      }

      const saleResponse = await api.post('/sales', payload);
      setLastSaleReceipt({
        sale: saleResponse,
        items: cart,
        totalUsd,
        totalBs,
        usdToBs,
        customer: selectedCustomer,
        paymentMethod,
        receivedUsd: parseFloat(receivedUsd) || totalUsd,
      });

      // Limpiar venta
      setCart([]);
      setSelectedCustomer(null);
      setIsProcessingSale(false);
      setActiveModal('RECEIPT');
    } catch (err: any) {
      setIsProcessingSale(false);
      alert(err.message || 'Error al procesar cobro');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center">
        <span className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></span>
        <p className="mt-4 text-xs font-black text-slate-500 uppercase tracking-widest">
          Cargando terminal de caja...
        </p>
      </div>
    );
  }

  // ─── PANTALLA: APERTURA DE CAJA (SI NO HAY TURNO) ───
  if (!shift) {
    return (
      <div className="flex-1 flex items-center justify-center p-3 sm:p-6 w-full">
        <div className="max-w-xl w-full my-auto p-5 sm:p-8 bg-white rounded-2xl border border-slate-200 shadow-xl font-sans">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black text-slate-900">Apertura de Caja & Turno</h1>
            <p className="text-xs text-slate-500 font-medium">Inicia tu jornada de ventas ingresando el fondo de caja inicial.</p>
          </div>
        </div>

        <form onSubmit={handleOpenShift} className="space-y-4">
          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Sucursal de Trabajo
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => {
                setSelectedBranchId(e.target.value);
                const b = branches.find((br) => br.id === e.target.value);
                if (b && b.warehouses && b.warehouses.length > 0) {
                  setSelectedWarehouseId(b.warehouses[0].id);
                }
              }}
              required
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
            >
              <option value="">Selecciona una sucursal</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1">
              Fondo Inicial de Caja (Efectivo $)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-black text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                required
                placeholder="0.00"
                className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full mt-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
          >
            Abrir Turno de Caja
          </button>
        </form>
      </div>
    </div>
    );
  }

  // ─── ESTACIÓN DE TRABAJO POS COMPLETA ───
  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] w-full font-sans text-slate-800 overflow-hidden bg-slate-100 relative">
      {/* 1. Barra Superior de Atajos Físicos de Teclado y Estado */}
      <div className="bg-slate-950 text-slate-300 px-3 sm:px-4 py-2 border-b border-slate-800 flex items-center justify-between shrink-0 overflow-x-auto gap-2 scrollbar-none">
        <div className="flex items-center gap-2 text-xs font-bold shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-white font-black text-[11px] sm:text-xs">CAJA ACTIVA</span>
          <span className="text-slate-600">|</span>
          <span className="text-indigo-400 text-[11px] sm:text-xs font-mono">Tasa: Bs. {usdToBs.toFixed(2)}</span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setActiveModal('HELP')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-black text-slate-300 flex items-center gap-1.5 transition"
          >
            <span className="bg-slate-800 text-indigo-400 px-1 rounded">F1</span> Atajos
          </button>
          <button
            onClick={() => {
              searchInputRef.current?.focus();
              searchInputRef.current?.select();
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-black text-slate-300 flex items-center gap-1.5 transition"
          >
            <span className="bg-slate-800 text-indigo-400 px-1 rounded">F2</span> Buscar
          </button>
          <button
            onClick={() => setActiveModal('CUSTOMER')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-black text-slate-300 flex items-center gap-1.5 transition"
          >
            <span className="bg-slate-800 text-indigo-400 px-1 rounded">F3</span> Cliente
          </button>
          <button
            onClick={() => {
              setTxType('IN');
              setActiveModal('CASH_TX');
            }}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-black text-slate-300 flex items-center gap-1.5 transition"
          >
            <span className="bg-slate-800 text-indigo-400 px-1 rounded">F4</span> Mov. Caja
          </button>
          <button
            onClick={() => loadInitialData()}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-black text-slate-300 flex items-center gap-1.5 transition"
          >
            <span className="bg-slate-800 text-indigo-400 px-1 rounded">F5</span> Sincronizar
          </button>
          <button
            onClick={() => setActiveModal('HELD_SALES')}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-black flex items-center gap-1.5 transition ${
              heldSales.length > 0
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-900 text-slate-300 border-slate-800'
            }`}
          >
            <span className="bg-slate-800 text-amber-400 px-1 rounded">F6</span> En Espera ({heldSales.length})
          </button>
          <button
            onClick={() => setActiveModal('SHIFT_MENU')}
            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-black text-slate-300 flex items-center gap-1.5 transition"
          >
            <span className="bg-slate-800 text-indigo-400 px-1 rounded">F7</span> Turno / Arqueo
          </button>
          <button
            onClick={() => cart.length > 0 && setActiveModal('CLEAR_CONFIRM')}
            disabled={cart.length === 0}
            className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-[11px] font-black text-rose-300 flex items-center gap-1.5 transition disabled:opacity-40"
          >
            <span className="bg-rose-950 text-rose-300 px-1 rounded">F9</span> Cancelar
          </button>
          <button
            onClick={() => {
              if (cart.length > 0) {
                setReceivedUsd(totalUsd.toFixed(2));
                setActiveModal('CHECKOUT');
              }
            }}
            disabled={cart.length === 0}
            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-[11px] font-black text-white flex items-center gap-1.5 transition shadow-md shadow-emerald-600/30 disabled:opacity-40"
          >
            <span className="bg-emerald-700 text-white px-1 rounded">F12</span> Cobrar (${totalUsd.toFixed(2)})
          </button>
        </div>
      </div>

      {/* 2. Selector de Pestañas en Móvil (Visible solo en pantallas < lg) */}
      <div className="lg:hidden flex bg-white border-b border-slate-200 p-1 shrink-0 z-10 shadow-xs">
        <button
          onClick={() => setMobileTab('CATALOG')}
          className={`flex-1 py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'CATALOG'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Catálogo ({filteredProducts.length})
        </button>
        <button
          onClick={() => setMobileTab('TICKET')}
          className={`flex-1 py-2 rounded-lg text-xs font-black transition flex items-center justify-center gap-1.5 ${
            mobileTab === 'TICKET'
              ? 'bg-indigo-600 text-white shadow-sm'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Ticket ({cart.length})
          {cart.length > 0 && (
            <span className="bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black ml-1">
              ${totalUsd.toFixed(2)}
            </span>
          )}
        </button>
      </div>

      {/* 3. Cuerpo Principal: Catálogo (Izquierda) + Ticket (Derecha en Desktop / Pestaña en Móvil) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* COLUMNA IZQUIERDA: Catálogo de Productos */}
        <div
          className={`flex-1 flex flex-col p-2.5 sm:p-4 border-r border-slate-200/80 bg-slate-50/50 overflow-hidden ${
            mobileTab === 'CATALOG' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Barra de Búsqueda y Switcher de Vista */}
          <div className="flex items-center gap-2 mb-3 shrink-0">
            <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Escanear código de barras o buscar por nombre / SKU... [F2]"
                className="w-full pl-10 pr-20 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-600 shadow-xs"
              />
              <span className="absolute right-3 top-2.5 text-[10px] font-black bg-slate-100 text-slate-400 px-2 py-0.5 rounded border border-slate-200">
                ENTER
              </span>
            </form>

            <button
              onClick={() => setIsTableView(!isTableView)}
              title={isTableView ? 'Ver Cuadrícula' : 'Ver Tabla de Supermercado'}
              className="p-2.5 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-slate-600 shadow-xs transition"
            >
              {isTableView ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          {/* Barra de Filtros por Categoría */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 shrink-0 scrollbar-none">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1 rounded-lg text-xs font-black transition shrink-0 ${
                selectedCategory === null
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Todas ({products.length})
            </button>
            {categoriesList.map((cat) => {
              const count = products.filter((p) => p.category?.name === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition shrink-0 ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Lista / Cuadrícula de Artículos */}
          <div className="flex-1 overflow-y-auto mt-2">
            {filteredProducts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <svg className="w-12 h-12 mb-2 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-xs font-black">No se encontraron artículos</p>
              </div>
            ) : isTableView ? (
              // ─── VISTA TABLA DE SUPERMERCADO (ALTA DENSIDAD) ───
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-black uppercase text-[10px]">
                    <tr>
                      <th className="p-2.5">Código / SKU</th>
                      <th className="p-2.5">Producto & Categoría</th>
                      <th className="p-2.5 text-center">Stock</th>
                      <th className="p-2.5 text-right">Precio USD</th>
                      <th className="p-2.5 text-right">Precio Bs.</th>
                      <th className="p-2.5 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredProducts.map((p) => {
                      const hasStock = p.stock > 0;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => hasStock && addToCart(p)}
                          className={`hover:bg-slate-50 transition cursor-pointer ${
                            !hasStock ? 'opacity-50 bg-slate-50/50' : ''
                          }`}
                        >
                          <td className="p-2.5 font-mono font-bold text-slate-500">
                            {p.skuBarcode || p.code || 'S/C'}
                          </td>
                          <td className="p-2.5">
                            <div className="font-black text-slate-900">{p.name}</div>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {p.category && (
                                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 rounded">
                                  {p.category.name}
                                </span>
                              )}
                              {p.wholesalePrice && (
                                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-1.5 rounded">
                                  Mayor: ${p.wholesalePrice.toFixed(2)} ({p.wholesaleMinQty}+)
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-2.5 text-center font-bold">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] ${
                                !hasStock
                                  ? 'bg-rose-100 text-rose-700'
                                  : p.stock <= (p.minStock || 5)
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {p.stock}
                            </span>
                          </td>
                          <td className="p-2.5 text-right font-black text-indigo-600">
                            ${p.sellPrice.toFixed(2)}
                          </td>
                          <td className="p-2.5 text-right font-bold text-slate-500">
                            Bs. {(p.sellPrice * usdToBs).toFixed(2)}
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              disabled={!hasStock}
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(p);
                              }}
                              className="px-2.5 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[10px] disabled:bg-slate-300"
                            >
                              + Add
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              // ─── VISTA CUADRÍCULA ENRIQUECIDA ───
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredProducts.map((p) => {
                  const hasStock = p.stock > 0;
                  return (
                    <div
                      key={p.id}
                      onClick={() => hasStock && addToCart(p)}
                      className={`bg-white rounded-xl border border-slate-200 p-3 shadow-xs hover:border-indigo-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between ${
                        !hasStock ? 'opacity-60 bg-slate-50' : ''
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-[10px] mb-1.5">
                          <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded truncate max-w-[100px]">
                            {p.category?.name || 'General'}
                          </span>
                          <span
                            className={`font-black px-1.5 py-0.5 rounded ${
                              !hasStock
                                ? 'bg-rose-100 text-rose-700'
                                : p.stock <= (p.minStock || 5)
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            {!hasStock ? 'Agotado' : `Stock: ${p.stock}`}
                          </span>
                        </div>

                        {p.skuBarcode && (
                          <div className="text-[10px] font-mono text-slate-400 mb-1 truncate">
                            SKU: {p.skuBarcode}
                          </div>
                        )}

                        <h3 className="font-extrabold text-xs text-slate-900 line-clamp-2 leading-snug">
                          {p.name}
                        </h3>

                        {p.wholesalePrice && (
                          <div className="mt-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            Mayor: ${p.wholesalePrice.toFixed(2)} (min. {p.wholesaleMinQty} un.)
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-end justify-between">
                        <div>
                          <div className="text-sm font-black text-indigo-600">
                            ${p.sellPrice.toFixed(2)}
                          </div>
                          <div className="text-[10px] font-bold text-slate-400">
                            Bs. {(p.sellPrice * usdToBs).toFixed(2)}
                          </div>
                        </div>

                        <button
                          disabled={!hasStock}
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(p);
                          }}
                          className="w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center font-bold text-sm shadow-xs disabled:bg-slate-300"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: Cinta de Registro de Caja (POS Tape) */}
        <div
          className={`w-full lg:w-80 xl:w-96 flex flex-col bg-white border-l border-slate-200 shrink-0 ${
            mobileTab === 'TICKET' ? 'flex flex-1 lg:flex-initial' : 'hidden lg:flex'
          }`}
        >
          {/* Cabecera del Ticket */}
          <div className="p-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Ticket de Venta #{cart.length}
              </div>
              <div className="text-[11px] text-slate-500 font-bold truncate mt-0.5">
                {selectedCustomer ? selectedCustomer.name : 'Cliente General (Público)'}
              </div>
            </div>

            <button
              onClick={() => setActiveModal('CUSTOMER')}
              className="px-2.5 py-1 bg-white border border-slate-200 hover:border-indigo-400 rounded-lg text-xs font-black text-indigo-600 shadow-2xs transition"
            >
              [F3] Cliente
            </button>
          </div>

          {/* Lista de Ítems del Ticket */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                <svg className="w-10 h-10 mb-2 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-xs font-bold">Carrito vacío</p>
                <p className="text-[10px] text-slate-400">Escanea o haz clic en un producto</p>
              </div>
            ) : (
              cart.map((item) => {
                const unitPrice = getItemUnitPrice(item);
                const subtotal = getItemSubtotal(item);
                const isWholesale = item.product.wholesalePrice && item.quantity >= (item.product.wholesaleMinQty || 9999);

                return (
                  <div
                    key={item.product.id}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col gap-1.5"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 pr-2">
                        <div className="font-extrabold text-xs text-slate-900 leading-tight">
                          {item.product.name}
                        </div>
                        {item.product.skuBarcode && (
                          <div className="text-[9px] font-mono text-slate-400">
                            {item.product.skuBarcode}
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="font-black text-xs text-slate-900">
                          ${subtotal.toFixed(2)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400">
                          Bs. {(subtotal * usdToBs).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50">
                      <div className="text-[11px] font-bold text-slate-500">
                        ${unitPrice.toFixed(2)} c/u
                        {isWholesale && (
                          <span className="ml-1 text-[9px] font-black text-emerald-700 bg-emerald-100 px-1 py-0.2 rounded">
                            MAYOR
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => removeOneFromCart(item.product.id)}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-black"
                        >
                          -
                        </button>
                        <span className="font-black text-xs min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => addToCart(item.product, 1)}
                          className="w-6 h-6 rounded-md bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 flex items-center justify-center font-black"
                        >
                          +
                        </button>
                        <button
                          onClick={() => deleteItemFromCart(item.product.id)}
                          className="text-rose-500 hover:text-rose-700 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Totalizador & Botón de Cobro F12 */}
          <div className="p-3.5 border-t border-slate-200 bg-slate-900 text-white">
            <div className="space-y-1 text-xs mb-3">
              <div className="flex justify-between text-slate-400 font-bold">
                <span>Subtotal ({cart.length} artículos):</span>
                <span>${subtotalUsd.toFixed(2)} USD</span>
              </div>
              <div className="flex justify-between text-slate-400 font-bold">
                <span>Equivalente BCV:</span>
                <span className="text-cyan-300">Bs. {totalBs.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
                <span className="font-black text-sm uppercase tracking-wider text-slate-300">
                  Total a Cobrar:
                </span>
                <span className="text-xl font-black text-emerald-400">
                  ${totalUsd.toFixed(2)}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                if (cart.length > 0) {
                  setReceivedUsd(totalUsd.toFixed(2));
                  setActiveModal('CHECKOUT');
                }
              }}
              disabled={cart.length === 0}
              className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-500/25 transition disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              COBRAR VENTA [F12]
            </button>
          </div>
        </div>

        {/* Barra Flotante de Resumen Móvil cuando se está en el Catálogo */}
        {mobileTab === 'CATALOG' && cart.length > 0 && (
          <div className="lg:hidden absolute bottom-3 left-3 right-3 z-30">
            <button
              onClick={() => setMobileTab('TICKET')}
              className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white p-3 rounded-2xl shadow-2xl shadow-emerald-950/50 flex items-center justify-between border border-emerald-400/40 transition active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">
                  {cart.reduce((s, i) => s + i.quantity, 0)}
                </div>
                <div className="text-left">
                  <div className="text-xs font-black leading-tight">Ver Ticket ({cart.length})</div>
                  <div className="text-[10px] text-emerald-100 font-mono">
                    Bs. {(totalUsd * usdToBs).toFixed(2)}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black">${totalUsd.toFixed(2)}</span>
                <span className="bg-white/20 px-2.5 py-1 rounded-lg text-xs font-black flex items-center gap-1">
                  Cobrar →
                </span>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* ─── MODALES DEL POS (CON APERTURA SEGURA) ─── */}

      {/* 1. Modal de Ayuda de Atajos [F1] */}
      {activeModal === 'HELP' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                ⌨️ Atajos de Teclado POS
              </h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { k: 'F1', d: 'Guía de atajos de teclado' },
                { k: 'F2', d: 'Enfocar buscador / escáner de barras' },
                { k: 'F3', d: 'Seleccionar o cambiar cliente' },
                { k: 'F4', d: 'Movimiento de caja (Entrada / Salida)' },
                { k: 'F5', d: 'Sincronizar catálogo y tasa BCV oficial' },
                { k: 'F6', d: 'Tickets en espera (Pausar o recuperar venta)' },
                { k: 'F7', d: 'Control de Turno / Arqueo / Cierre' },
                { k: 'F9', d: 'Cancelar venta y vaciar carrito' },
                { k: 'F12', d: 'Cobrar venta (Pasarela de pagos)' },
                { k: 'Esc', d: 'Cerrar cualquier ventana o modal activo' },
                { k: 'Enter', d: 'Agregar código escaneado al instante' },
              ].map((s) => (
                <div key={s.k} className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="font-black bg-slate-900 text-white px-2 py-0.5 rounded text-[11px]">
                    {s.k}
                  </span>
                  <span className="font-semibold text-slate-600">{s.d}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full mt-5 py-2.5 bg-indigo-600 text-white font-black text-xs rounded-xl"
            >
              Entendido [Esc]
            </button>
          </div>
        </div>
      )}

      {/* 2. Modal de Selección de Cliente [F3] */}
      {activeModal === 'CUSTOMER' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-black text-slate-900">Seleccionar Cliente [F3]</h3>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto mb-4">
              <div
                onClick={() => {
                  setSelectedCustomer(null);
                  setActiveModal(null);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition ${
                  selectedCustomer === null
                    ? 'bg-indigo-50 border-indigo-300'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="font-black text-xs text-slate-900">Cliente General (Público)</div>
                <div className="text-[10px] text-slate-500">Venta rápida sin datos fiscales</div>
              </div>

              {customers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => {
                    setSelectedCustomer(c);
                    setActiveModal(null);
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedCustomer?.id === c.id
                      ? 'bg-indigo-50 border-indigo-300'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-black text-xs text-slate-900">{c.name}</div>
                  <div className="text-[10px] text-slate-500">
                    Doc: {c.documentNumber || c.dni || 'S/D'} • Tel: {c.phone || 'S/T'}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl"
            >
              Cerrar [Esc]
            </button>
          </div>
        </div>
      )}

      {/* 3. Modal de Movimiento de Caja [F4] */}
      {activeModal === 'CASH_TX' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900 mb-4">Movimiento de Caja [F4]</h3>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                type="button"
                onClick={() => setTxType('IN')}
                className={`py-2 rounded-xl text-xs font-black transition ${
                  txType === 'IN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                + Entrada de Efectivo
              </button>
              <button
                type="button"
                onClick={() => setTxType('OUT')}
                className={`py-2 rounded-xl text-xs font-black transition ${
                  txType === 'OUT'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                - Salida de Efectivo
              </button>
            </div>

            <form onSubmit={handleCashTransaction} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Monto ($ USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Motivo / Descripción</label>
                <input
                  type="text"
                  required
                  value={txDescription}
                  onChange={(e) => setTxDescription(e.target.value)}
                  placeholder="Ej. Cambio de billete, pago de flete..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl"
                >
                  Cancelar [Esc]
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-xs"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. Modal de Tickets en Espera [F6] */}
      {activeModal === 'HELD_SALES' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900 mb-3">Tickets en Espera [F6]</h3>

            {cart.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-center justify-between">
                <div>
                  <div className="font-black text-xs text-amber-900">Venta Actual en Curso</div>
                  <div className="text-[11px] text-amber-700">{cart.length} artículos • ${totalUsd.toFixed(2)}</div>
                </div>
                <button
                  onClick={() => {
                    const newHeld: HeldSale = {
                      id: Date.now().toString(),
                      time: new Date().toLocaleTimeString(),
                      customer: selectedCustomer,
                      items: [...cart],
                      total: totalUsd,
                    };
                    setHeldSales([...heldSales, newHeld]);
                    setCart([]);
                    setSelectedCustomer(null);
                    setActiveModal(null);
                  }}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-black text-xs rounded-lg"
                >
                  Pausar Ticket
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {heldSales.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-bold">
                  No hay tickets en espera guardados
                </div>
              ) : (
                heldSales.map((h, i) => (
                  <div
                    key={h.id}
                    className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-black text-xs text-slate-900">
                        Ticket #{i + 1} ({h.time})
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {h.customer ? h.customer.name : 'Cliente General'} • {h.items.length} ítems • ${h.total.toFixed(2)}
                      </div>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => {
                          setHeldSales(heldSales.filter((_, idx) => idx !== i));
                        }}
                        className="px-2 py-1 bg-rose-50 text-rose-600 rounded text-xs font-bold"
                      >
                        Descartar
                      </button>
                      <button
                        onClick={() => {
                          setCart(h.items);
                          setSelectedCustomer(h.customer);
                          setHeldSales(heldSales.filter((_, idx) => idx !== i));
                          setActiveModal(null);
                        }}
                        className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-black"
                      >
                        Recuperar
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl"
            >
              Cerrar [Esc]
            </button>
          </div>
        </div>
      )}

      {/* 5. Modal de Gestión de Turno [F7] */}
      {activeModal === 'SHIFT_MENU' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900 mb-1">Gestión de Turno & Caja [F7]</h3>
            <p className="text-xs text-slate-500 mb-4">Arqueo y control de gaveta de dinero.</p>

            <div className="space-y-2 mb-4">
              <button
                onClick={async () => {
                  try {
                    const activeShiftData = await api.get('/shifts/active');
                    alert(`Arqueo Teórico en vivo:\nEfectivo Esperado: $${activeShiftData.cashInRegister?.toFixed(2) || '0.00'}`);
                  } catch (e: any) {
                    alert(e.message);
                  }
                }}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left flex items-center justify-between"
              >
                <div>
                  <div className="font-black text-xs text-slate-900">Arqueo Teórico (Corte Parcial X)</div>
                  <div className="text-[10px] text-slate-500">Ver acumulados en efectivo sin cerrar la caja</div>
                </div>
                <span className="text-slate-400">➔</span>
              </button>

              <button
                onClick={() => {
                  setActiveModal(null);
                  setTxType('IN');
                  setActiveModal('CASH_TX');
                }}
                className="w-full p-3 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left flex items-center justify-between"
              >
                <div>
                  <div className="font-black text-xs text-slate-900">Ingreso / Retiro de Efectivo</div>
                  <div className="text-[10px] text-slate-500">Registrar entradas extras o pagos menores</div>
                </div>
                <span className="text-slate-400">➔</span>
              </button>

              <button
                onClick={async () => {
                  const declared = prompt('Ingresa el dinero en efectivo contado en gaveta ($):');
                  if (declared !== null) {
                    try {
                      await api.post('/shifts/close', {
                        declaredBalance: parseFloat(declared) || 0,
                      });
                      alert('Turno de caja cerrado exitosamente.');
                      setShift(null);
                      setActiveModal(null);
                    } catch (e: any) {
                      alert(e.message);
                    }
                  }
                }}
                className="w-full p-3 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 text-left flex items-center justify-between text-rose-700"
              >
                <div>
                  <div className="font-black text-xs">Cerrar Caja (Corte Final Z)</div>
                  <div className="text-[10px] text-rose-500">Finalizar turno y declarar efectivo</div>
                </div>
                <span>➔</span>
              </button>
            </div>

            <button
              onClick={() => setActiveModal(null)}
              className="w-full py-2 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl"
            >
              Cerrar [Esc]
            </button>
          </div>
        </div>
      )}

      {/* 6. Modal de Confirmación de Cancelar Venta [F9] */}
      {activeModal === 'CLEAR_CONFIRM' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900 mb-2">¿Cancelar Venta Actual? [F9]</h3>
            <p className="text-xs text-slate-500 mb-5">
              Se vaciarán los {cart.length} artículos del carrito. Esta acción no se puede deshacer.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl"
              >
                No, mantener
              </button>
              <button
                onClick={() => {
                  setCart([]);
                  setSelectedCustomer(null);
                  setActiveModal(null);
                }}
                className="flex-1 py-2.5 bg-rose-600 text-white font-black text-xs rounded-xl shadow-xs"
              >
                Sí, Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Modal de Cobro / Pasarela de Pago [F12] */}
      {activeModal === 'CHECKOUT' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-black text-slate-900">Pasarela de Cobro [F12]</h3>
                <p className="text-xs text-slate-500">
                  Total: <span className="font-black text-indigo-600">${totalUsd.toFixed(2)} USD</span> •{' '}
                  <span className="font-bold text-slate-700">Bs. {totalBs.toFixed(2)}</span>
                </p>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            {/* Selector de Método de Pago */}
            <div className="grid grid-cols-4 gap-1.5 mb-4 text-xs font-bold">
              {[
                { id: 'CASH', label: 'Efectivo $' },
                { id: 'CARD', label: 'Punto Bs.' },
                { id: 'PAGO_MOVIL', label: 'Pago Móvil' },
                { id: 'SPLIT', label: 'Mixto / Split' },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setPaymentMethod(m.id as any)}
                  className={`py-2 px-1 rounded-xl text-center transition ${
                    paymentMethod === m.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* Contenido según método */}
            {paymentMethod === 'CASH' && (
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Monto Recibido ($ USD):
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={receivedUsd}
                    onChange={(e) => setReceivedUsd(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm font-black text-slate-900 focus:outline-none"
                  />
                </div>

                {/* Cálculo de Vuelto */}
                {parseFloat(receivedUsd) >= totalUsd && (
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center text-xs">
                    <span className="font-black text-emerald-800">Vuelto a Entregar:</span>
                    <div className="text-right">
                      <div className="font-black text-emerald-700">
                        ${(parseFloat(receivedUsd) - totalUsd).toFixed(2)} USD
                      </div>
                      <div className="text-[10px] text-emerald-600 font-bold">
                        o Bs. {((parseFloat(receivedUsd) - totalUsd) * usdToBs).toFixed(2)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {paymentMethod === 'CARD' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs font-bold text-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span>Monto a pasar en el punto:</span>
                  <span className="font-black text-slate-900">Bs. {totalBs.toFixed(2)}</span>
                </div>
              </div>
            )}

            {paymentMethod === 'PAGO_MOVIL' && (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs font-bold text-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span>Monto exacto Pago Móvil:</span>
                  <span className="font-black text-slate-900">Bs. {totalBs.toFixed(2)}</span>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 mb-1">Número de Referencia (4 dígitos):</label>
                  <input
                    type="text"
                    placeholder="Ej. 9842"
                    value={splitMobilePayRef}
                    onChange={(e) => setSplitMobilePayRef(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {paymentMethod === 'SPLIT' && (
              <div className="space-y-2 p-3 bg-slate-50 rounded-xl border border-slate-200 mb-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Efectivo ($ USD):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={splitCashUsd}
                    onChange={(e) => setSplitCashUsd(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Punto de Venta (Bs.):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={splitCardBs}
                    onChange={(e) => setSplitCardBs(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-0.5">Pago Móvil (Bs.):</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={splitMobilePayBs}
                    onChange={(e) => setSplitMobilePayBs(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg font-bold"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl"
              >
                Cancelar [Esc]
              </button>
              <button
                type="button"
                disabled={isProcessingSale}
                onClick={handleCheckoutSubmit}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/30 transition disabled:opacity-50"
              >
                {isProcessingSale ? 'Procesando...' : 'Confirmar Cobro'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 8. Modal de PIN de Supervisor para Anulaciones */}
      {activeModal === 'PIN_AUTH' && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto">
            <h3 className="text-base font-black text-slate-900 mb-1">Autorización de Supervisor</h3>
            <p className="text-xs text-slate-500 mb-4">
              Ingresa el PIN de seguridad para anular o remover este artículo de la venta.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                // Validar PIN (por defecto 1234 o admin123)
                if (supervisorPin === '1234' || supervisorPin === 'admin123') {
                  if (pinPendingAction) pinPendingAction();
                  setSupervisorPin('');
                  setPinPendingAction(null);
                  setActiveModal(null);
                } else {
                  alert('PIN de supervisor incorrecto');
                }
              }}
              className="space-y-3"
            >
              <input
                type="password"
                autoFocus
                required
                maxLength={8}
                value={supervisorPin}
                onChange={(e) => setSupervisorPin(e.target.value)}
                placeholder="PIN (ej. 1234)"
                className="w-full px-3 py-2 text-center text-lg tracking-widest bg-slate-50 border border-slate-200 rounded-xl font-black focus:outline-none focus:border-indigo-600"
              />

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setSupervisorPin('');
                    setPinPendingAction(null);
                    setActiveModal(null);
                  }}
                  className="flex-1 py-2.5 bg-slate-100 text-slate-600 font-bold text-xs rounded-xl"
                >
                  Cancelar [Esc]
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 text-white font-black text-xs rounded-xl shadow-xs"
                >
                  Autorizar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. Modal de Recibo Térmico al Completar Venta */}
      {activeModal === 'RECEIPT' && lastSaleReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-4 sm:p-6 shadow-2xl max-h-[92dvh] overflow-y-auto font-mono text-xs printable-receipt">
            <div className="text-center mb-3">
              <h2 className="font-black text-sm uppercase">COMPROBANTE DE VENTA</h2>
              <p className="text-[10px] text-slate-500">Cloud POS Terminal</p>
              <p className="text-[10px] text-slate-400">{new Date().toLocaleString()}</p>
            </div>

            <div className="border-t border-b border-dashed border-slate-300 py-2 space-y-1 my-2">
              {lastSaleReceipt.items.map((it: any, i: number) => (
                <div key={i} className="flex justify-between">
                  <span className="truncate pr-2">
                    {it.quantity}x {it.product.name}
                  </span>
                  <span>${getItemSubtotal(it).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="space-y-1 mb-4 text-slate-700">
              <div className="flex justify-between font-bold">
                <span>TOTAL USD:</span>
                <span>${lastSaleReceipt.totalUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-bold">
                <span>TOTAL BS:</span>
                <span>Bs. {lastSaleReceipt.totalBs.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>MÉTODO:</span>
                <span>{lastSaleReceipt.paymentMethod}</span>
              </div>
            </div>

            <div className="flex gap-2 print:hidden">
              <button
                onClick={() => window.print()}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-lg"
              >
                🖨️ Imprimir
              </button>
              <button
                onClick={() => setActiveModal(null)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-lg"
              >
                Listo [Esc]
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
