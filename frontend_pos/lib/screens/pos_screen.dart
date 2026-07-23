import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/cart_provider.dart';
import '../providers/auth_provider.dart';
import '../providers/shift_provider.dart';
import '../services/api_service.dart';
import '../widgets/barcode_scanner_dialog.dart';

class PosScreen extends StatefulWidget {
  const PosScreen({super.key});

  @override
  State<PosScreen> createState() => _PosScreenState();
}

class _PosScreenState extends State<PosScreen> {
  final _searchController = TextEditingController();
  final _openingBalanceController = TextEditingController();
  final _declaredBalanceController = TextEditingController();
  final _declaredUsdController = TextEditingController();
  final _declaredBsController = TextEditingController();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();

  String _searchQuery = '';
  int _currentMobileTab = 0; // 0 for Catalog, 1 for Cart

  List<dynamic> _branches = [];
  List<dynamic> _warehouses = [];
  String? _tempBranchId;
  String? _tempWarehouseId;

  // Tasa de cambio USD → Bs para mostrar precios en bolívares
  double _usdToBs = 1.0;

  Future<void> _loadBranches() async {
    setState(() {
      _loadingBranches = true;
    });
    try {
      final response = await ApiService.get('/branches');
      final list = jsonDecode(response.body) as List;
      setState(() {
        _branches = list;
        _loadingBranches = false;
        
        final shiftProv = Provider.of<ShiftProvider>(context, listen: false);
        if (shiftProv.selectedBranchId != null) {
          _tempBranchId = shiftProv.selectedBranchId;
          final match = _branches.firstWhere((b) => b['id'] == _tempBranchId, orElse: () => null);
          if (match != null) {
            _warehouses = match['warehouses'] ?? [];
            if (shiftProv.selectedWarehouseId != null) {
              final whMatch = _warehouses.firstWhere((w) => w['id'] == shiftProv.selectedWarehouseId, orElse: () => null);
              if (whMatch != null) {
                _tempWarehouseId = shiftProv.selectedWarehouseId;
              }
            }
          }
        }
      });
    } catch (e) {
      setState(() {
        _loadingBranches = false;
      });
    }
  }

  List<dynamic> _customers = [];
  dynamic _selectedCustomer;
  bool _hasPaymentError = false;

  Future<void> _loadCustomers() async {
    try {
      final response = await ApiService.get('/customers');
      if (response.statusCode == 200) {
        final list = jsonDecode(response.body) as List;
        setState(() {
          _customers = list;
        });
      }
    } catch (e) {
      // Ignorar errores silenciosamente al cargar
    }
  }

  @override
  void initState() {
    super.initState();
    Future.microtask(() async {
      final shiftProv = Provider.of<ShiftProvider>(context, listen: false);
      final cartProv = Provider.of<CartProvider>(context, listen: false);
      
      await cartProv.loadOfflineSalesCount();

      try {
        await shiftProv.checkActiveShift();
        
        // Cargar tasa de cambio
        final rate = await ApiService.getExchangeRate();
        if (mounted) setState(() => _usdToBs = rate);
        
        if (shiftProv.isOpen) {
          await cartProv.fetchProducts(shiftProv.selectedWarehouseId);
          await _loadCustomers();
        } else {
          await _loadBranches();
          await cartProv.fetchProducts(shiftProv.selectedWarehouseId);
          await _loadCustomers();
        }
      } on PaymentRequiredException catch (_) {
        setState(() {
          _hasPaymentError = true;
        });
      } catch (_) {
        // Ignorar otros errores de red iniciales
      }
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    _openingBalanceController.dispose();
    _declaredBalanceController.dispose();
    _declaredUsdController.dispose();
    _declaredBsController.dispose();
    _amountController.dispose();
    _descriptionController.dispose();
    super.dispose();
  }

  double _parseDecimal(dynamic val) {
    if (val == null) return 0.0;
    return double.parse(val.toString());
  }

  // Diálogo para Cobrar Venta
  void _showCheckoutDialog(BuildContext context, CartProvider cartProvider) {
    final shiftProvider = Provider.of<ShiftProvider>(context, listen: false);
    String selectedPaymentMethod = 'CASH';

    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            Widget buildPaymentCard(String method, String label, IconData icon) {
              final isSelected = selectedPaymentMethod == method;
              return Expanded(
                child: GestureDetector(
                  onTap: () {
                    setModalState(() {
                      selectedPaymentMethod = method;
                    });
                  },
                  child: Container(
                    padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 8),
                    decoration: BoxDecoration(
                      color: isSelected ? const Color(0xFFEEF2FF) : Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: isSelected ? const Color(0xFF4F46E5) : const Color(0xFFE2E8F0),
                        width: isSelected ? 2 : 1,
                      ),
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Icon(
                          icon,
                          color: isSelected ? const Color(0xFF4F46E5) : const Color(0xFF64748B),
                          size: 24,
                        ),
                        const SizedBox(height: 8),
                        Text(
                          label,
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? const Color(0xFF4F46E5) : const Color(0xFF475569),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            }

            return Dialog(
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(24),
              ),
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'Completar Transacción',
                      style: TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF0F172A),
                        letterSpacing: -0.2,
                      ),
                    ),
                    const SizedBox(height: 16),
                    
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'TOTAL A COBRAR',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w800,
                              color: Color(0xFF64748B),
                              letterSpacing: 0.6,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '\$${cartProvider.totalAmount.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontSize: 28,
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF4F46E5),
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    const Text(
                      'SELECCIONAR MÉTODO DE PAGO',
                      style: TextStyle(
                        fontSize: 9,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF64748B),
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 10),

                    Row(
                      children: [
                        buildPaymentCard('CASH', 'Efectivo', Icons.payments_outlined),
                        const SizedBox(width: 8),
                        buildPaymentCard('CARD', 'Tarjeta', Icons.credit_card_outlined),
                        const SizedBox(width: 8),
                        buildPaymentCard('TRANSFER', 'Transf.', Icons.account_balance_outlined),
                        if (_selectedCustomer != null && _selectedCustomer['allowCredit'] == true) ...[
                          const SizedBox(width: 8),
                          buildPaymentCard('CREDIT', 'Fiado', Icons.money_off_csred_outlined),
                        ],
                      ],
                    ),
                    Builder(
                      builder: (context) {
                        final hasLimitError = selectedPaymentMethod == 'CREDIT' &&
                            _selectedCustomer != null &&
                            cartProvider.totalAmount > ((double.tryParse(_selectedCustomer['creditLimit']?.toString() ?? '') ?? 0.0) - (double.tryParse(_selectedCustomer['currentDebt']?.toString() ?? '') ?? 0.0));
                        
                        if (hasLimitError) {
                          return Padding(
                            padding: const EdgeInsets.only(top: 16),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: const Color(0xFFFDF2F2),
                                borderRadius: BorderRadius.circular(12),
                                border: Border.all(color: const Color(0xFFFDE8E8)),
                              ),
                              child: const Row(
                                children: [
                                  Icon(Icons.error_outline, color: Color(0xFFEF4444), size: 16),
                                  SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Límite de crédito insuficiente para fiar al cliente.',
                                      style: TextStyle(color: Color(0xFF9B1C1C), fontSize: 11, fontWeight: FontWeight.bold),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }
                        return const SizedBox.shrink();
                      },
                    ),
                    const SizedBox(height: 24),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => Navigator.of(ctx).pop(),
                          style: TextButton.styleFrom(
                            foregroundColor: const Color(0xFF64748B),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          ),
                          child: const Text('Cancelar', style: TextStyle(fontWeight: FontWeight.bold)),
                        ),
                        const SizedBox(width: 8),
                        Builder(
                          builder: (context) {
                            final hasLimitError = selectedPaymentMethod == 'CREDIT' &&
                                _selectedCustomer != null &&
                                cartProvider.totalAmount > ((double.tryParse(_selectedCustomer['creditLimit']?.toString() ?? '') ?? 0.0) - (double.tryParse(_selectedCustomer['currentDebt']?.toString() ?? '') ?? 0.0));
                            
                            return ElevatedButton(
                              onPressed: (cartProvider.isLoading || hasLimitError)
                                  ? null
                                  : () async {
                                      try {
                                        await cartProvider.checkout(selectedPaymentMethod, _selectedCustomer?['id'], shiftProvider.selectedWarehouseId);
                                        await _loadCustomers();
                                        if (context.mounted) {
                                          Navigator.of(ctx).pop();
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(
                                              content: const Text(
                                                'Venta registrada con éxito',
                                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                              ),
                                              backgroundColor: const Color(0xFF10B981),
                                              behavior: SnackBarBehavior.floating,
                                              shape: RoundedRectangleBorder(
                                                borderRadius: BorderRadius.circular(12),
                                              ),
                                              margin: const EdgeInsets.all(15),
                                            ),
                                          );
                                          setState(() {
                                            _selectedCustomer = null;
                                            _currentMobileTab = 0;
                                          });
                                        }
                                      } catch (e) {
                                        final errStr = e.toString();
                                        if (errStr.contains('offline_saved')) {
                                          if (context.mounted) {
                                            Navigator.of(ctx).pop();
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: const Text(
                                                  '⚠️ Sin Internet: Venta guardada localmente para sincronización posterior',
                                                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                                ),
                                                backgroundColor: const Color(0xFFF59E0B), // Amber color
                                                behavior: SnackBarBehavior.floating,
                                                shape: RoundedRectangleBorder(
                                                  borderRadius: BorderRadius.circular(12),
                                                ),
                                                margin: const EdgeInsets.all(15),
                                              ),
                                            );
                                            setState(() {
                                              _selectedCustomer = null;
                                              _currentMobileTab = 0;
                                            });
                                          }
                                        } else {
                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text(errStr.replaceAll('Exception: ', '')),
                                                backgroundColor: Colors.redAccent.shade700,
                                              ),
                                            );
                                          }
                                        }
                                      }
                                    },
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF4F46E5),
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(12),
                                ),
                              ),
                              child: cartProvider.isLoading
                                  ? const SizedBox(
                                      width: 18,
                                      height: 18,
                                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                                    )
                                  : const Text('Confirmar Cobro', style: TextStyle(fontWeight: FontWeight.bold)),
                            );
                          }
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  // Menú de Caja (Bottom Sheet)
  void _showShiftMenuBottomSheet(BuildContext context, ShiftProvider shiftProvider) {
    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Acciones de Caja',
                style: TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.w900,
                  color: Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 16),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFFEEF2FF), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.add_moderator, color: Color(0xFF4F46E5)),
                ),
                title: const Text('Ingresar Efectivo (Fondo)', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Ingresa dinero extra para cambio'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showAddTransactionDialog(context, shiftProvider, 'IN');
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFFFDF2F2), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.remove_moderator, color: Color(0xFFEF4444)),
                ),
                title: const Text('Retirar Efectivo (Salida)', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Registra retiros de caja o pago a proveedores'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showAddTransactionDialog(context, shiftProvider, 'OUT');
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFFECFDF5), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.analytics_outlined, color: Color(0xFF10B981)),
                ),
                title: const Text('Arqueo Teórico (Corte Parcial)', style: TextStyle(fontWeight: FontWeight.bold)),
                subtitle: const Text('Ver acumulados actuales de dinero'),
                onTap: () async {
                  Navigator.pop(ctx);
                  try {
                    await shiftProvider.checkActiveShift();
                    if (context.mounted && shiftProvider.activeShift != null) {
                      _showPartialCutDialog(context, shiftProvider.activeShift!);
                    }
                  } catch (e) {
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text('Error al refrescar balance de caja: $e'), backgroundColor: Colors.redAccent),
                      );
                    }
                  }
                },
              ),
              const Divider(height: 1),
              ListTile(
                leading: Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(color: const Color(0xFFFFF7ED), borderRadius: BorderRadius.circular(10)),
                  child: const Icon(Icons.power_settings_new, color: Color(0xFFF97316)),
                ),
                title: const Text('Cerrar Caja (Corte de Turno)', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFFF97316))),
                subtitle: const Text('Finalizar labores y contar efectivo'),
                onTap: () {
                  Navigator.pop(ctx);
                  _showCloseShiftDialog(context, shiftProvider);
                },
              ),
            ],
          ),
        );
      },
    );
  }

  // Modal para agregar una Transacción de Caja (Entrada / Salida)
  void _showAddTransactionDialog(BuildContext context, ShiftProvider shiftProvider, String type) {
    _amountController.clear();
    _descriptionController.clear();
    final isInput = type == 'IN';

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Text(isInput ? 'Ingresar Efectivo' : 'Retirar Efectivo', style: const TextStyle(fontWeight: FontWeight.w900)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextFormField(
                controller: _amountController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                style: const TextStyle(fontWeight: FontWeight.bold),
                decoration: const InputDecoration(
                  labelText: 'Monto (\$) *',
                  prefixIcon: Icon(Icons.payments_outlined),
                ),
              ),
              const SizedBox(height: 15),
              TextFormField(
                controller: _descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Concepto / Motivo *',
                  prefixIcon: Icon(Icons.description_outlined),
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cancelar', style: TextStyle(color: Color(0xFF64748B))),
            ),
            ElevatedButton(
              onPressed: () async {
                final amount = double.tryParse(_amountController.text) ?? 0.0;
                final desc = _descriptionController.text.trim();

                if (amount <= 0 || desc.isEmpty) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Por favor completa todos los campos correctamente')),
                  );
                  return;
                }

                try {
                  await shiftProvider.addTransaction(amount, type, desc);
                  if (context.mounted) {
                    Navigator.pop(ctx);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(isInput ? 'Ingreso registrado' : 'Retiro registrado'),
                        backgroundColor: const Color(0xFF10B981),
                      ),
                    );
                  }
                } catch (e) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(e.toString()), backgroundColor: Colors.redAccent),
                    );
                  }
                }
              },
              style: ElevatedButton.styleFrom(
                backgroundColor: isInput ? const Color(0xFF4F46E5) : const Color(0xFFEF4444),
                foregroundColor: Colors.white,
              ),
              child: const Text('Registrar'),
            ),
          ],
        );
      },
    );
  }

  // Modal de Corte Parcial
  void _showPartialCutDialog(BuildContext context, Map<String, dynamic> shift) {
    final opening = _parseDecimal(shift['openingBalance']);
    final cashSales = _parseDecimal(shift['cashSales']);
    final cardSales = _parseDecimal(shift['cardSales']);
    final transferSales = _parseDecimal(shift['transferSales']);
    final cashIn = _parseDecimal(shift['cashIn']);
    final cashOut = _parseDecimal(shift['cashOut']);
    final theoreticalCash = opening + cashSales + cashIn - cashOut;

    showDialog(
      context: context,
      builder: (ctx) {
        return AlertDialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
          title: const Text('Arqueo Teórico (Corte Parcial)', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              _buildCutRow('Fondo Inicial (Efectivo):', opening),
              _buildCutRow('Ventas en Efectivo (+):', cashSales),
              _buildCutRow('Entradas Manuales (+):', cashIn),
              _buildCutRow('Salidas Manuales (-):', cashOut),
              const Divider(height: 20),
              _buildCutRow('Saldo de Efectivo Teórico:', theoreticalCash, isTotal: true),
              const Divider(height: 24),
              _buildCutRow('Ventas en Tarjeta (Bancos):', cardSales, isAlt: true),
              _buildCutRow('Ventas en Transferencia:', transferSales, isAlt: true),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: const Text('Cerrar'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildCutRow(String label, double val, {bool isTotal = false, bool isAlt = false}) {
    final usdStr = '\$${val.toStringAsFixed(2)}';
    final bsStr = _usdToBs > 1.0 ? ' / Bs. ${(val * _usdToBs).toStringAsFixed(2)}' : '';

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontWeight: isTotal ? FontWeight.w900 : FontWeight.w600,
              fontSize: isTotal ? 13 : 12,
              color: isAlt ? const Color(0xFF64748B) : const Color(0xFF0F172A),
            ),
          ),
          Text(
            '$usdStr$bsStr',
            style: TextStyle(
              fontWeight: isTotal ? FontWeight.w900 : FontWeight.bold,
              fontSize: isTotal ? 13 : 12,
              color: isTotal
                  ? const Color(0xFF4F46E5)
                  : (isAlt ? const Color(0xFF475569) : const Color(0xFF0F172A)),
            ),
          ),
        ],
      ),
    );
  }

  // Modal para Cierre de Caja
  void _showCloseShiftDialog(BuildContext context, ShiftProvider shiftProvider) {
    _declaredUsdController.text = '';
    _declaredBsController.text = '';
    
    showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            final usdCount = double.tryParse(_declaredUsdController.text) ?? 0.0;
            final bsCount = double.tryParse(_declaredBsController.text) ?? 0.0;
            final totalCalculated = usdCount + (bsCount / (_usdToBs > 0 ? _usdToBs : 1.0));

            return AlertDialog(
              backgroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              title: const Text(
                'Arqueo y Cierre de Caja',
                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF0F172A)),
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Ingresa por separado el efectivo físico contado de tu caja:',
                    style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
                  ),
                  const SizedBox(height: 16),
                  
                  // Campo USD
                  TextFormField(
                    controller: _declaredUsdController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    decoration: const InputDecoration(
                      labelText: 'Efectivo en Dólares (\$)',
                      prefixIcon: Icon(Icons.attach_money_rounded, color: Colors.green),
                      isDense: true,
                    ),
                    onChanged: (_) => setModalState(() {}),
                  ),
                  const SizedBox(height: 14),

                  // Campo Bs
                  TextFormField(
                    controller: _declaredBsController,
                    keyboardType: const TextInputType.numberWithOptions(decimal: true),
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                    decoration: const InputDecoration(
                      labelText: 'Efectivo en Bolívares (Bs.)',
                      prefixIcon: Icon(Icons.payments_rounded, color: Colors.blueAccent),
                      isDense: true,
                    ),
                    onChanged: (_) => setModalState(() {}),
                  ),
                  const SizedBox(height: 16),

                  // Total visual
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.end,
                      children: [
                        const Text(
                          'TOTAL CONVERTIDO A USD',
                          style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          '\$${totalCalculated.toStringAsFixed(2)}',
                          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF4F46E5)),
                        ),
                        if (_usdToBs > 1.0)
                          Padding(
                            padding: const EdgeInsets.only(top: 2),
                            child: Text(
                              'Usando tasa de cambio actual: \$1 = Bs. ${_usdToBs.toStringAsFixed(2)}',
                              style: const TextStyle(fontSize: 9, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancelar', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                ),
                ElevatedButton(
                  onPressed: () async {
                    try {
                      Navigator.pop(ctx); // Cerrar este diálogo
                      final closedDetails = await shiftProvider.closeShift(
                        totalCalculated,
                        usd: usdCount,
                        bs: bsCount,
                      );
                      if (context.mounted) {
                        _showReceiptDialog(context, closedDetails);
                      }
                    } catch (e) {
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text(e.toString()), backgroundColor: Colors.redAccent),
                        );
                      }
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  ),
                  child: const Text('Confirmar Cierre', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // Simulación de Ticket Térmico de Cierre de Caja
  void _showReceiptDialog(BuildContext context, Map<String, dynamic> closedDetails) {
    final openedAt = DateTime.parse(closedDetails['openedAt']);
    final closedAt = DateTime.parse(closedDetails['closedAt']);
    
    final opening = _parseDecimal(closedDetails['openingBalance']);
    final cashSales = _parseDecimal(closedDetails['cashSales']);
    final cardSales = _parseDecimal(closedDetails['cardSales']);
    final transferSales = _parseDecimal(closedDetails['transferSales']);
    final cashIn = _parseDecimal(closedDetails['cashIn']);
    final cashOut = _parseDecimal(closedDetails['cashOut']);
    final declared = _parseDecimal(closedDetails['declaredBalance']);
    final theoretical = _parseDecimal(closedDetails['closingBalance']);
    final diff = _parseDecimal(closedDetails['difference']);
    final cashierName = closedDetails['user']?['name'] ?? 'Cajero';

    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (ctx) {
        return Dialog(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(Icons.check_circle_outline_rounded, color: Colors.green, size: 40),
                const SizedBox(height: 10),
                const Text(
                  'Caja Cerrada Exitosamente',
                  style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Color(0xFF0F172A)),
                ),
                const SizedBox(height: 16),
                
                // Simulación de Ticket Térmico
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Center(
                        child: Text(
                          '*** RESUMEN DE CORTE DE CAJA ***',
                          style: TextStyle(fontFamily: 'Courier', fontWeight: FontWeight.bold, fontSize: 11),
                        ),
                      ),
                      const SizedBox(height: 10),
                      Text('CAJERO: $cashierName', style: const TextStyle(fontFamily: 'Courier', fontSize: 10)),
                      Text('APERTURA: ${openedAt.toString().substring(0, 19)}', style: const TextStyle(fontFamily: 'Courier', fontSize: 10)),
                      Text('CIERRE:   ${closedAt.toString().substring(0, 19)}', style: const TextStyle(fontFamily: 'Courier', fontSize: 10)),
                      const Text('--------------------------------', style: TextStyle(fontFamily: 'Courier', fontSize: 10)),
                      _buildReceiptRow('FONDO INICIAL:', opening),
                      _buildReceiptRow('VENTAS EFECTIVO:', cashSales),
                      _buildReceiptRow('ENTRADAS CAJA:', cashIn),
                      _buildReceiptRow('SALIDAS CAJA:', cashOut),
                      const Text('--------------------------------', style: TextStyle(fontFamily: 'Courier', fontSize: 10)),
                      _buildReceiptRow('EFECTIVO TEÓRICO:', theoretical),
                      _buildReceiptRow('EFECTIVO REAL:', declared),
                      if (closedDetails['declaredBalanceUsd'] != null)
                        _buildReceiptRow(' (EFECTIVO USD):', _parseDecimal(closedDetails['declaredBalanceUsd'])),
                      if (closedDetails['declaredBalanceBs'] != null)
                        _buildReceiptRow(' (EFECTIVO BS):', _parseDecimal(closedDetails['declaredBalanceBs']), isBs: true),
                      const Text('--------------------------------', style: TextStyle(fontFamily: 'Courier', fontSize: 10)),
                      _buildReceiptRow(
                        diff < 0 ? 'FALTANTE:' : (diff > 0 ? 'SOBRANTE:' : 'DIFERENCIA:'),
                        diff,
                        isHighlight: true,
                      ),
                      const Text('================================', style: TextStyle(fontFamily: 'Courier', fontSize: 10)),
                      _buildReceiptRow('VENTAS TARJETA:', cardSales),
                      _buildReceiptRow('VENTAS TRANSF.:', transferSales),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 45,
                  child: ElevatedButton(
                    onPressed: () {
                      Navigator.pop(ctx);
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('Aceptar y Finalizar'),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildReceiptRow(String label, double val, {bool isHighlight = false, bool isBs = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: TextStyle(
              fontFamily: 'Courier',
              fontSize: 10,
              fontWeight: isHighlight ? FontWeight.bold : FontWeight.normal,
              color: isHighlight ? (val < 0 ? Colors.red : (val > 0 ? Colors.orange : Colors.black)) : Colors.black,
            ),
          ),
          Text(
            isBs ? 'Bs. ${val.abs().toStringAsFixed(2)}' : '\$${val.abs().toStringAsFixed(2)}',
            style: TextStyle(
              fontFamily: 'Courier',
              fontSize: 10,
              fontWeight: isHighlight ? FontWeight.bold : FontWeight.normal,
              color: isHighlight ? (val < 0 ? Colors.red : (val > 0 ? Colors.orange : Colors.black)) : Colors.black,
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final cartProvider = Provider.of<CartProvider>(context);
    final shiftProvider = Provider.of<ShiftProvider>(context);

    final size = MediaQuery.of(context).size;
    final isDesktop = size.width > 750;

    final filteredProducts = cartProvider.products.where((p) {
      final name = p['name'].toString().toLowerCase();
      final sku = p['skuBarcode']?.toString().toLowerCase() ?? '';
      final query = _searchQuery.toLowerCase();
      return name.contains(query) || sku.contains(query);
    }).toList();

    // 0. Mostrar pantalla de Bloqueo por Suscripción Vencida (Pago Requerido)
    if (_hasPaymentError) {
      return Scaffold(
        backgroundColor: const Color(0xFFFEF2F2),
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Container(
              constraints: const BoxConstraints(maxWidth: 400),
              padding: const EdgeInsets.all(32),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: const Color(0xFFFDE8E8)),
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF0F172A).withOpacity(0.06),
                    blurRadius: 20,
                    offset: const Offset(0, 8),
                  )
                ],
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.payment_rounded, color: Colors.redAccent, size: 56),
                  const SizedBox(height: 20),
                  const Text(
                    'Suscripción Vencida',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: Color(0xFF9B1C1C), letterSpacing: -0.5),
                  ),
                  const SizedBox(height: 12),
                  const Text(
                    'Tu cuenta de Cloud POS ha sido suspendida temporalmente por falta de pago o plan expirado.\n\nPor favor, ingresa al panel web administrativo para renovar tu suscripción.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 13, color: Color(0xFF7F1D1D), height: 1.4, fontWeight: FontWeight.w500),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      child: const Text('Cerrar Sesión', style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF475569))),
                      onPressed: () async {
                        await authProvider.logout();
                        if (context.mounted) {
                          Navigator.of(context).pushReplacementNamed('/login');
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      );
    }

    // 1. Mostrar pantalla de Carga Inicial
    if (shiftProvider.isLoading && shiftProvider.activeShift == null) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(color: Color(0xFF4F46E5)),
        ),
      );
    }

    // 2. Pantalla de Apertura de Caja si no hay turno abierto
    if (!shiftProvider.isOpen) {
      return Scaffold(
        backgroundColor: const Color(0xFFF8FAFC),
        body: Center(
          child: SingleChildScrollView(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Container(
                width: size.width > 450 ? 400 : double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(
                      color: const Color(0xFF0F172A).withOpacity(0.02),
                      blurRadius: 15,
                      offset: const Offset(0, 8),
                    )
                  ],
                ),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Center(
                      child: Container(
                        width: 56,
                        height: 56,
                        decoration: BoxDecoration(
                          color: const Color(0xFFEEF2FF),
                          borderRadius: BorderRadius.circular(16),
                        ),
                        child: const Icon(
                          Icons.calculate_rounded,
                          size: 28,
                          color: Color(0xFF4F46E5),
                        ),
                      ),
                    ),
                    const SizedBox(height: 20),
                    const Center(
                      child: Text(
                        'Abrir Caja',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.w900,
                          color: Color(0xFF0F172A),
                          letterSpacing: -0.5,
                        ),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Selecciona tu sucursal y almacén de trabajo, e ingresa el fondo de caja inicial para comenzar.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 12, color: Color(0xFF64748B), height: 1.4),
                    ),
                    const SizedBox(height: 24),
                    
                    const Text(
                      'SUCURSAL',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF64748B),
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _tempBranchId,
                      hint: const Text('Seleccionar sucursal', style: TextStyle(fontSize: 14)),
                      dropdownColor: Colors.white,
                      items: _branches.map<DropdownMenuItem<String>>((b) {
                        return DropdownMenuItem<String>(
                          value: b['id'],
                          child: Text(b['name'], style: const TextStyle(fontSize: 14)),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setState(() {
                          _tempBranchId = val;
                          _tempWarehouseId = null;
                          final selectedBranch = _branches.firstWhere((b) => b['id'] == val);
                          _warehouses = selectedBranch['warehouses'] ?? [];
                        });
                      },
                      decoration: InputDecoration(
                        fillColor: const Color(0xFFF8FAFC),
                        filled: true,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    const Text(
                      'ALMACÉN / BODEGA DE TRABAJO',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF64748B),
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 8),
                    DropdownButtonFormField<String>(
                      value: _tempWarehouseId,
                      hint: const Text('Seleccionar almacén', style: TextStyle(fontSize: 14)),
                      dropdownColor: Colors.white,
                      items: _warehouses.map<DropdownMenuItem<String>>((w) {
                        return DropdownMenuItem<String>(
                          value: w['id'],
                          child: Text(w['name'], style: const TextStyle(fontSize: 14)),
                        );
                      }).toList(),
                      onChanged: _tempBranchId == null
                          ? null
                          : (val) {
                              setState(() {
                                _tempWarehouseId = val;
                              });
                            },
                      decoration: InputDecoration(
                        fillColor: const Color(0xFFF8FAFC),
                        filled: true,
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),

                    const Text(
                      'EFECTIVO INICIAL (FONDO)',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.w800,
                        color: Color(0xFF64748B),
                        letterSpacing: 0.6,
                      ),
                    ),
                    const SizedBox(height: 8),
                    TextFormField(
                      controller: _openingBalanceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      enabled: _tempWarehouseId != null,
                      decoration: InputDecoration(
                        hintText: '0.00',
                        prefixIcon: const Icon(Icons.payments_outlined, color: Color(0xFF94A3B8)),
                        filled: true,
                        fillColor: const Color(0xFFF8FAFC),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(14),
                          borderSide: const BorderSide(color: Color(0xFF4F46E5), width: 2),
                        ),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 50,
                      child: ElevatedButton(
                        onPressed: shiftProvider.isLoading || _tempWarehouseId == null
                            ? null
                            : () async {
                                final balance = double.tryParse(_openingBalanceController.text) ?? 0.0;
                                if (_tempBranchId == null || _tempWarehouseId == null) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Selecciona una sucursal y un almacén')),
                                  );
                                  return;
                                }
                                if (balance < 0) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('Ingresa un saldo inicial válido')),
                                  );
                                  return;
                                }

                                try {
                                  final selectedBranch = _branches.firstWhere(
                                    (b) => b['id'] == _tempBranchId,
                                    orElse: () => null,
                                  );
                                  final selectedWarehouse = _warehouses.firstWhere(
                                    (w) => w['id'] == _tempWarehouseId,
                                    orElse: () => null,
                                  );

                                  if (selectedBranch == null || selectedWarehouse == null) {
                                    if (context.mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(content: Text('Sucursal o almacén no encontrado. Recarga la lista.')),
                                      );
                                    }
                                    return;
                                  }

                                  await shiftProvider.selectBranchAndWarehouse(
                                    _tempBranchId!,
                                    selectedBranch['name'],
                                    _tempWarehouseId!,
                                    selectedWarehouse['name'],
                                  );

                                  await shiftProvider.openShift(balance);
                                  await cartProvider.fetchProducts(_tempWarehouseId);

                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Turno de caja abierto correctamente'),
                                        backgroundColor: Color(0xFF10B981),
                                      ),
                                    );
                                  }
                                } catch (e) {
                                  if (context.mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(e.toString()), backgroundColor: Colors.redAccent),
                                    );
                                  }
                                }
                              },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF4F46E5),
                          foregroundColor: Colors.white,
                          elevation: 0,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        child: shiftProvider.isLoading
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text('Abrir Turno de Caja', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }

    // 3. Diseño normal de POS si hay un turno abierto
    Widget catalogPane = Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _searchController,
                  style: const TextStyle(fontSize: 13, color: Color(0xFF0F172A), fontWeight: FontWeight.w600),
                  decoration: InputDecoration(
                    hintText: 'Buscar por nombre o barras...',
                    hintStyle: const TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.normal),
                    prefixIcon: const Icon(Icons.search_rounded, size: 20, color: Color(0xFF94A3B8)),
                    suffixIcon: _searchQuery.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear_rounded, size: 18, color: Color(0xFF94A3B8)),
                            onPressed: () {
                              setState(() {
                                _searchController.clear();
                                _searchQuery = '';
                              });
                            },
                          )
                        : null,
                    filled: true,
                    fillColor: const Color(0xFFF1F5F9),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val;
                    });
                  },
                  onSubmitted: (val) {
                    final query = val.trim();
                    if (query.isEmpty) return;

                    final product = cartProvider.products.cast<Map<String, dynamic>?>().firstWhere(
                      (p) {
                        if (p == null) return false;
                        final barcode = p['barcode']?.toString().trim() ?? '';
                        final sku = p['sku']?.toString().trim() ?? '';
                        final name = p['name']?.toString().toLowerCase().trim() ?? '';
                        return barcode == query || sku == query || name == query.toLowerCase();
                      },
                      orElse: () => null,
                    );

                    if (product != null) {
                      final stock = double.tryParse(product['stock']?.toString() ?? '') ?? 0.0;
                      if (stock > 0) {
                        cartProvider.addToCart(product);
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('⚡ Producto agregado por escáner: ${product['name']}'),
                            duration: const Duration(milliseconds: 900),
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            margin: const EdgeInsets.all(15),
                          ),
                        );
                        _searchController.clear();
                        setState(() {
                          _searchQuery = '';
                        });
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('⚠️ El producto "${product['name']}" está agotado en inventario'),
                            backgroundColor: Colors.amber[800],
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                            margin: const EdgeInsets.all(15),
                          ),
                        );
                      }
                    }
                  },
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: IconButton(
                  tooltip: 'Escanear Código de Barras con Cámara',
                  icon: const Icon(Icons.qr_code_scanner_rounded, color: Color(0xFF10B981)),
                  onPressed: () async {
                    final code = await Navigator.of(context).push<String>(
                      MaterialPageRoute(builder: (_) => const BarcodeScannerDialog()),
                    );
                    if (code != null && code.isNotEmpty) {
                      final product = cartProvider.products.cast<Map<String, dynamic>?>().firstWhere(
                        (p) {
                          if (p == null) return false;
                          final barcode = p['skuBarcode']?.toString().trim() ?? '';
                          final sku = p['sku']?.toString().trim() ?? '';
                          return barcode == code.trim() || sku == code.trim();
                        },
                        orElse: () => null,
                      );
                      if (product != null) {
                        cartProvider.addToCart(product);
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('⚡ Producto agregado: ${product['name']}'),
                              backgroundColor: const Color(0xFF10B981),
                              duration: const Duration(seconds: 1),
                            ),
                          );
                        }
                      } else {
                        setState(() {
                          _searchController.text = code;
                          _searchQuery = code;
                        });
                      }
                    }
                  },
                ),
              ),
              const SizedBox(width: 8),
              Container(
                decoration: BoxDecoration(
                  color: const Color(0xFFEEF2FF),
                  borderRadius: BorderRadius.circular(14),
                ),
                child: IconButton(
                  tooltip: 'Actualizar catálogo e imágenes',
                  icon: cartProvider.isLoading
                      ? const SizedBox(
                          width: 18,
                          height: 18,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFF4F46E5)),
                        )
                      : const Icon(Icons.refresh_rounded, color: Color(0xFF4F46E5)),
                  onPressed: () async {
                    await cartProvider.fetchProducts(shiftProvider.selectedWarehouseId);
                    if (context.mounted) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(
                          content: Text('Catálogo de productos e imágenes actualizado'),
                          duration: Duration(seconds: 2),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                    }
                  },
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          Expanded(
            child: cartProvider.isLoading && cartProvider.products.isEmpty
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF4F46E5)))
                : filteredProducts.isEmpty
                    ? const Center(child: Text('No se encontraron productos', style: TextStyle(color: Color(0xFF64748B))))
                    : GridView.builder(
                        gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: isDesktop ? (MediaQuery.of(context).size.width > 1200 ? 4 : 3) : 2,
                          childAspectRatio: isDesktop ? 0.95 : 0.82,
                          crossAxisSpacing: 14,
                          mainAxisSpacing: 14,
                        ),
                        itemCount: filteredProducts.length,
                        itemBuilder: (ctx, i) {
                          final product = filteredProducts[i];
                          final stock = double.tryParse(product['stock']?.toString() ?? '') ?? 0.0;
                          final price = double.tryParse(product['sellPrice']?.toString() ?? '') ?? 0.0;
                          final hasStock = stock > 0;
                          final imageUrl = product['imageUrl'] as String?;

                          return Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              boxShadow: [
                                BoxShadow(
                                  color: const Color(0xFF0F172A).withOpacity(0.04),
                                  blurRadius: 10,
                                  offset: const Offset(0, 3),
                                )
                              ],
                            ),
                            child: Material(
                              color: Colors.transparent,
                              child: InkWell(
                                onTap: hasStock ? () {
                                  cartProvider.addToCart(product);
                                  if (!isDesktop) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(
                                        content: Text(
                                          'Agregado: ${product['name']}',
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                        duration: const Duration(milliseconds: 700),
                                        behavior: SnackBarBehavior.floating,
                                        shape: RoundedRectangleBorder(
                                          borderRadius: BorderRadius.circular(12),
                                        ),
                                        margin: const EdgeInsets.all(15),
                                        action: SnackBarAction(
                                          textColor: Colors.amberAccent,
                                          label: 'Ver Carrito',
                                          onPressed: () {
                                            setState(() {
                                              _currentMobileTab = 1;
                                            });
                                          },
                                        ),
                                      ),
                                    );
                                  }
                                } : null,
                                borderRadius: BorderRadius.circular(16),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    // Imagen del producto llenando todo el espacio superior de la tarjeta sin recortes
                                    Expanded(
                                      child: Container(
                                        width: double.infinity,
                                        padding: const EdgeInsets.all(6),
                                        decoration: const BoxDecoration(
                                          color: Color(0xFFF8FAFC),
                                          borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
                                        ),
                                        child: ClipRRect(
                                          borderRadius: const BorderRadius.vertical(top: Radius.circular(12)),
                                          child: imageUrl != null && imageUrl.isNotEmpty
                                              ? Image.network(
                                                  imageUrl,
                                                  width: double.infinity,
                                                  height: double.infinity,
                                                  fit: BoxFit.contain,
                                                  errorBuilder: (ctx, err, st) => Container(
                                                    color: const Color(0xFFEEF2FF),
                                                    child: const Center(
                                                      child: Icon(Icons.image_not_supported_outlined, color: Color(0xFF4F46E5), size: 32),
                                                    ),
                                                  ),
                                                )
                                              : Container(
                                                  color: const Color(0xFFEEF2FF),
                                                  child: const Center(
                                                    child: Icon(Icons.shopping_bag_outlined, color: Color(0xFF4F46E5), size: 32),
                                                  ),
                                                ),
                                        ),
                                      ),
                                    ),
                                    
                                    // Información del producto en la parte inferior
                                    Padding(
                                      padding: const EdgeInsets.all(10),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            product['name'] ?? 'Producto',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: const TextStyle(
                                              fontWeight: FontWeight.w800,
                                              fontSize: 12,
                                              color: Color(0xFF0F172A),
                                              letterSpacing: -0.2,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Row(
                                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                            crossAxisAlignment: CrossAxisAlignment.end,
                                            children: [
                                              Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                                    decoration: BoxDecoration(
                                                      color: const Color(0xFFEEF2FF),
                                                      borderRadius: BorderRadius.circular(8),
                                                    ),
                                                    child: Text(
                                                      '\$${price.toStringAsFixed(2)}',
                                                      style: const TextStyle(
                                                        color: Color(0xFF4F46E5),
                                                        fontWeight: FontWeight.w900,
                                                        fontSize: 12,
                                                      ),
                                                    ),
                                                  ),
                                                  if (_usdToBs > 1.0)
                                                    Padding(
                                                      padding: const EdgeInsets.only(top: 2, left: 2),
                                                      child: Text(
                                                        'Bs. ${(price * _usdToBs).toStringAsFixed(2)}',
                                                        style: const TextStyle(
                                                          color: Color(0xFF64748B),
                                                          fontWeight: FontWeight.w600,
                                                          fontSize: 10,
                                                        ),
                                                      ),
                                                    ),
                                                ],
                                              ),
                                              Row(
                                                children: [
                                                  Container(
                                                    width: 6,
                                                    height: 6,
                                                    decoration: BoxDecoration(
                                                      shape: BoxShape.circle,
                                                      color: hasStock ? Colors.green : Colors.red,
                                                    ),
                                                  ),
                                                  const SizedBox(width: 4),
                                                  Text(
                                                    'Stock: ${stock.toInt()}',
                                                    style: TextStyle(
                                                      fontSize: 10,
                                                      fontWeight: FontWeight.bold,
                                                      color: hasStock ? const Color(0xFF10B981) : const Color(0xFFEF4444),
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );

    Widget cartPane = Container(
      color: const Color(0xFFF8FAFC),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Detalle de la Compra',
            style: TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w800,
              color: Color(0xFF0F172A),
              letterSpacing: -0.2,
            ),
          ),
          const SizedBox(height: 8),
          const Divider(color: Color(0xFFE2E8F0)),
          const SizedBox(height: 8),
           DropdownButtonFormField<dynamic>(
            isExpanded: true,
            value: _selectedCustomer,
            hint: const Text(
              'Cliente General (Venta Pública)',
              style: TextStyle(fontSize: 12),
              overflow: TextOverflow.ellipsis,
            ),
            decoration: InputDecoration(
              isDense: true,
              contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
              prefixIcon: const Icon(Icons.person_outline, size: 16),
            ),
            dropdownColor: Colors.white,
            items: [
              const DropdownMenuItem<dynamic>(
                value: null,
                child: Text(
                  'Cliente General (Público)',
                  style: TextStyle(fontSize: 12),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
              ..._customers.map((c) {
                return DropdownMenuItem<dynamic>(
                  value: c,
                  child: Text(
                    c['name'],
                    style: const TextStyle(fontSize: 12),
                    overflow: TextOverflow.ellipsis,
                  ),
                );
              }),
            ],
            onChanged: (val) {
              setState(() {
                _selectedCustomer = val;
              });
            },
          ),
          if (_selectedCustomer != null) ...[
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Deuda: \$${(double.tryParse(_selectedCustomer['currentDebt']?.toString() ?? '') ?? 0.0).toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 11, color: Colors.redAccent, fontWeight: FontWeight.bold),
                ),
                Text(
                  'Crédito Disp: \$${((double.tryParse(_selectedCustomer['creditLimit']?.toString() ?? '') ?? 0.0) - (double.tryParse(_selectedCustomer['currentDebt']?.toString() ?? '') ?? 0.0)).toStringAsFixed(2)}',
                  style: const TextStyle(fontSize: 11, color: Colors.teal, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ],
          const SizedBox(height: 12),
          const Divider(color: Color(0xFFE2E8F0)),
          const SizedBox(height: 8),
          Expanded(
            child: cartProvider.items.isEmpty
                ? const Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.shopping_bag_outlined, size: 48, color: Color(0xFF94A3B8)),
                        SizedBox(height: 12),
                        Text(
                          'El carrito está vacío',
                          style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.w600, fontSize: 13),
                        ),
                      ],
                    ),
                  )
                : ListView.builder(
                    itemCount: cartProvider.items.length,
                    itemBuilder: (ctx, i) {
                      final item = cartProvider.items[i];
                      return Container(
                        margin: const EdgeInsets.symmetric(vertical: 4),
                        padding: const EdgeInsets.all(10),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item.name,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: Color(0xFF1E293B),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                  const SizedBox(height: 3),
                                  Text(
                                    '\$${item.unitPrice.toStringAsFixed(2)} x ${item.quantity}',
                                    style: const TextStyle(color: Color(0xFF64748B), fontSize: 11, fontWeight: FontWeight.w600),
                                  ),
                                ],
                              ),
                            ),
                            Row(
                              children: [
                                InkWell(
                                  onTap: () => cartProvider.removeOne(item.productId),
                                  child: Container(
                                    width: 28,
                                    height: 28,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Color(0xFFF1F5F9),
                                    ),
                                    child: const Icon(Icons.remove, size: 14, color: Color(0xFF475569)),
                                  ),
                                ),
                                const SizedBox(width: 10),
                                Text(
                                  '${item.quantity}',
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                                ),
                                const SizedBox(width: 10),
                                InkWell(
                                  onTap: () {
                                    final prod = cartProvider.products.firstWhere((p) => p['id'] == item.productId);
                                    if (double.parse(prod['stock']) > item.quantity) {
                                      cartProvider.addToCart(prod);
                                    } else {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('No hay más stock disponible'),
                                          duration: Duration(seconds: 1),
                                        ),
                                      );
                                    }
                                  },
                                  child: Container(
                                    width: 28,
                                    height: 28,
                                    decoration: const BoxDecoration(
                                      shape: BoxShape.circle,
                                      color: Color(0xFFF1F5F9),
                                    ),
                                    child: const Icon(Icons.add, size: 14, color: Color(0xFF475569)),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
          const SizedBox(height: 8),
          const Divider(color: Color(0xFFE2E8F0)),
          const SizedBox(height: 8),
          Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE2E8F0)),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Total a Cobrar:', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600, fontSize: 12)),
                    Text('\$${cartProvider.totalAmount.toStringAsFixed(2)}', style: const TextStyle(color: Color(0xFF4F46E5), fontWeight: FontWeight.w900, fontSize: 14)),
                  ],
                ),
                if (_usdToBs > 1.0) ...[ 
                  const SizedBox(height: 4),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Equivalente Bs:', style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.w600, fontSize: 11)),
                      Text('Bs. ${(cartProvider.totalAmount * _usdToBs).toStringAsFixed(2)}', style: const TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w700, fontSize: 12)),
                    ],
                  ),
                ],
                const SizedBox(height: 12),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    onPressed: cartProvider.items.isEmpty
                        ? null
                        : () => _showCheckoutDialog(context, cartProvider),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF4F46E5),
                      foregroundColor: Colors.white,
                      elevation: 4,
                      shadowColor: const Color(0xFF4F46E5).withOpacity(0.4),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: const [
                        Icon(Icons.point_of_sale_rounded, size: 20),
                        SizedBox(width: 8),
                        Text(
                          'COBRAR VENTA',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900, letterSpacing: 0.5),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: PreferredSize(
        preferredSize: const Size.fromHeight(64),
        child: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF0F172A), Color(0xFF1E1B4B)],
              begin: Alignment.centerLeft,
              end: Alignment.centerRight,
            ),
            boxShadow: [
              BoxShadow(
                color: Color(0x33000000),
                blurRadius: 10,
                offset: Offset(0, 4),
              )
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: SafeArea(
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
                          ),
                          borderRadius: BorderRadius.circular(12),
                          boxShadow: [
                            BoxShadow(
                              color: const Color(0xFF6366F1).withOpacity(0.4),
                              blurRadius: 8,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Icon(
                          Icons.cloud_done_rounded,
                          color: Colors.white,
                          size: 22,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                const Text(
                                  'Cloud POS Terminal',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w900,
                                    color: Colors.white,
                                    letterSpacing: -0.2,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFF10B981).withOpacity(0.2),
                                    borderRadius: BorderRadius.circular(6),
                                    border: Border.all(color: const Color(0xFF10B981).withOpacity(0.5)),
                                  ),
                                  child: Row(
                                    children: const [
                                      Icon(Icons.circle, color: Color(0xFF10B981), size: 6),
                                      SizedBox(width: 4),
                                      Text(
                                        'EN TURNO',
                                        style: TextStyle(color: Color(0xFF34D399), fontSize: 9, fontWeight: FontWeight.w900),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                            if (authProvider.tenant != null)
                              Text(
                                '${authProvider.tenant!['name']}${shiftProvider.selectedBranchName != null ? ' • ${shiftProvider.selectedBranchName} (${shiftProvider.selectedWarehouseName})' : ''}',
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF94A3B8),
                                ),
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                Row(
                  children: [
                    // Botón para sincronizar ventas offline (si hay pendientes)
                    if (cartProvider.pendingOfflineSalesCount > 0)
                      Stack(
                        clipBehavior: Clip.none,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.cloud_sync_rounded, color: Colors.orange, size: 26),
                            onPressed: () async {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Sincronizando ventas offline...')),
                              );
                              final count = await cartProvider.syncOfflineSales();
                              if (context.mounted) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  SnackBar(
                                    content: Text('Sincronización completa: $count ventas enviadas.'),
                                    backgroundColor: const Color(0xFF10B981),
                                    behavior: SnackBarBehavior.floating,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    margin: const EdgeInsets.all(15),
                                  ),
                                );
                              }
                            },
                          ),
                          Positioned(
                            right: 4,
                            top: 4,
                            child: Container(
                              padding: const EdgeInsets.all(4),
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                              child: Text(
                                '${cartProvider.pendingOfflineSalesCount}',
                                style: const TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ),
                        ],
                      ),
                    // Botón de control de caja
                    IconButton(
                      icon: const Icon(Icons.calculate_rounded, color: Color(0xFF4F46E5), size: 24),
                      onPressed: () => _showShiftMenuBottomSheet(context, shiftProvider),
                    ),
                    const SizedBox(width: 6),
                    IconButton(
                      icon: const Icon(Icons.logout_rounded, color: Color(0xFF64748B), size: 20),
                      onPressed: () async {
                        await authProvider.logout();
                        if (context.mounted) {
                          Navigator.of(context).pushReplacementNamed('/login');
                        }
                      },
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
      body: isDesktop
          ? Row(
              children: [
                Expanded(flex: 7, child: catalogPane),
                const VerticalDivider(width: 1, thickness: 1, color: Color(0xFFE2E8F0)),
                Expanded(flex: 3, child: cartPane),
              ],
            )
          : (_currentMobileTab == 0 ? catalogPane : cartPane),
      bottomNavigationBar: isDesktop
          ? null
          : Container(
              decoration: const BoxDecoration(
                border: Border(top: BorderSide(color: Color(0xFFE2E8F0))),
              ),
              child: BottomNavigationBar(
                currentIndex: _currentMobileTab,
                backgroundColor: Colors.white,
                onTap: (index) {
                  setState(() {
                    _currentMobileTab = index;
                  });
                },
                selectedItemColor: const Color(0xFF4F46E5),
                unselectedItemColor: const Color(0xFF94A3B8),
                selectedLabelStyle: const TextStyle(fontWeight: FontWeight.w800, fontSize: 11),
                unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 11),
                elevation: 0,
                items: [
                  const BottomNavigationBarItem(
                    icon: Icon(Icons.grid_view_rounded, size: 20),
                    label: 'Catálogo',
                  ),
                  BottomNavigationBarItem(
                    icon: Badge(
                      label: Text('${cartProvider.items.fold(0, (sum, item) => sum + item.quantity)}'),
                      isLabelVisible: cartProvider.items.isNotEmpty,
                      backgroundColor: const Color(0xFF4F46E5),
                      child: const Icon(Icons.shopping_bag_rounded, size: 20),
                    ),
                    label: 'Carrito',
                  ),
                ],
              ),
            ),
    );
  }
}
