import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../services/api_service.dart';
import '../widgets/barcode_scanner_dialog.dart';
import 'login_screen.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  int _selectedIndex = 0;
  bool _isLoading = true;
  double _usdToBs = 1.0;
  List<dynamic> _products = [];
  // ignore: unused_field
  List<dynamic> _categories = [];
  List<dynamic> _sales = [];
  List<dynamic> _customers = [];
  Map<String, dynamic> _summary = {};

  final TextEditingController _searchController = TextEditingController();
  final currencyFormatter = NumberFormat.currency(symbol: '\$', decimalDigits: 2);

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final rate = await ApiService.getExchangeRate();
      final products = await ApiService.getProducts();
      final categories = await ApiService.getCategories();
      final summary = await ApiService.getSummaryReport();
      final sales = await ApiService.getSales();
      final customers = await ApiService.getCustomers();

      setState(() {
        _usdToBs = rate;
        _products = products;
        _categories = categories;
        _summary = summary;
        _sales = sales;
        _customers = customers;
        _isLoading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error al sincronizar datos: $e')),
        );
      }
    }
  }

  void _showUpdateRateDialog() {
    final controller = TextEditingController(text: _usdToBs.toStringAsFixed(2));
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        title: const Text('Actualizar Tasa de Cambio (Bs.)', style: TextStyle(color: Colors.white)),
        content: TextField(
          controller: controller,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          style: const TextStyle(color: Colors.white),
          decoration: const InputDecoration(
            labelText: 'Tasa 1 USD = X Bs.',
            labelStyle: TextStyle(color: Colors.blueGrey),
            suffixText: 'Bs.',
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(),
            child: const Text('Cancelar', style: TextStyle(color: Colors.blueGrey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.indigoAccent),
            onPressed: () async {
              final newRate = double.tryParse(controller.text);
              if (newRate != null && newRate > 0) {
                Navigator.of(ctx).pop();
                try {
                  await ApiService.updateExchangeRate(newRate);
                  _loadData();
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(e.toString())),
                  );
                }
              }
            },
            child: const Text('Guardar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  void _showAddProductDialog() {
    final nameCtrl = TextEditingController();
    final priceCtrl = TextEditingController();
    final costCtrl = TextEditingController();
    final skuCtrl = TextEditingController();
    final stockCtrl = TextEditingController(text: '10');

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Nuevo Producto', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                      IconButton(
                        icon: const Icon(Icons.qr_code_scanner, color: const Color(0xFF10B981), size: 28),
                        tooltip: 'Escanear Código de Barras con Cámara',
                        onPressed: () async {
                          final code = await Navigator.of(context).push<String>(
                            MaterialPageRoute(builder: (_) => const BarcodeScannerDialog()),
                          );
                          if (code != null && code.isNotEmpty) {
                            setModalState(() {
                              skuCtrl.text = code;
                            });
                          }
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: nameCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Nombre del producto',
                      labelStyle: TextStyle(color: Colors.blueGrey),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: priceCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Precio Venta (\$)',
                            labelStyle: TextStyle(color: Colors.blueGrey),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: costCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Costo (\$)',
                            labelStyle: TextStyle(color: Colors.blueGrey),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: skuCtrl,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            labelText: 'Código / SKU de Barras',
                            labelStyle: const TextStyle(color: Colors.blueGrey),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.camera_alt_outlined, color: Colors.indigoAccent),
                              onPressed: () async {
                                final code = await Navigator.of(context).push<String>(
                                  MaterialPageRoute(builder: (_) => const BarcodeScannerDialog()),
                                );
                                if (code != null && code.isNotEmpty) {
                                  setModalState(() {
                                    skuCtrl.text = code;
                                  });
                                }
                              },
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: stockCtrl,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Stock Inicial',
                            labelStyle: TextStyle(color: Colors.blueGrey),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.indigoAccent,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                    onPressed: () async {
                      if (nameCtrl.text.isEmpty || priceCtrl.text.isEmpty) return;
                      Navigator.of(ctx).pop();
                      try {
                        await ApiService.createProduct({
                          'name': nameCtrl.text.trim(),
                          'sellPrice': double.tryParse(priceCtrl.text) ?? 0.0,
                          'costPrice': double.tryParse(costCtrl.text) ?? 0.0,
                          'skuBarcode': skuCtrl.text.trim().isNotEmpty ? skuCtrl.text.trim() : null,
                          'sku': skuCtrl.text.trim().isNotEmpty ? skuCtrl.text.trim() : null,
                          'stock': int.tryParse(stockCtrl.text) ?? 0,
                        });
                        _loadData();
                      } catch (e) {
                        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                      }
                    },
                    child: const Text('GUARDAR PRODUCTO', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  void _showEditProductDialog(Map<String, dynamic> product) {
    final nameCtrl = TextEditingController(text: product['name'] ?? '');
    final priceCtrl = TextEditingController(text: (double.tryParse(product['sellPrice']?.toString() ?? '0') ?? 0.0).toString());
    final costCtrl = TextEditingController(text: (double.tryParse(product['costPrice']?.toString() ?? '0') ?? 0.0).toString());
    final skuCtrl = TextEditingController(text: (product['skuBarcode'] ?? product['sku'] ?? '').toString());
    final stockCtrl = TextEditingController(text: (product['stock'] ?? 0).toString());

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: const Color(0xFF1E293B),
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          return Padding(
            padding: EdgeInsets.only(
              left: 20,
              right: 20,
              top: 20,
              bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
            ),
            child: SingleChildScrollView(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Editar Producto', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.white)),
                      IconButton(
                        icon: const Icon(Icons.qr_code_scanner, color: Color(0xFF10B981), size: 28),
                        tooltip: 'Escanear Código de Barras con Cámara',
                        onPressed: () async {
                          final code = await Navigator.of(context).push<String>(
                            MaterialPageRoute(builder: (_) => const BarcodeScannerDialog()),
                          );
                          if (code != null && code.isNotEmpty) {
                            setModalState(() {
                              skuCtrl.text = code;
                            });
                          }
                        },
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: nameCtrl,
                    style: const TextStyle(color: Colors.white),
                    decoration: const InputDecoration(
                      labelText: 'Nombre del producto',
                      labelStyle: TextStyle(color: Colors.blueGrey),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: priceCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Precio Venta (\$)',
                            labelStyle: TextStyle(color: Colors.blueGrey),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: costCtrl,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Costo (\$)',
                            labelStyle: TextStyle(color: Colors.blueGrey),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: skuCtrl,
                          style: const TextStyle(color: Colors.white),
                          decoration: InputDecoration(
                            labelText: 'Código / SKU de Barras',
                            labelStyle: const TextStyle(color: Colors.blueGrey),
                            suffixIcon: IconButton(
                              icon: const Icon(Icons.camera_alt_outlined, color: Colors.indigoAccent),
                              onPressed: () async {
                                final code = await Navigator.of(context).push<String>(
                                  MaterialPageRoute(builder: (_) => const BarcodeScannerDialog()),
                                );
                                if (code != null && code.isNotEmpty) {
                                  setModalState(() {
                                    skuCtrl.text = code;
                                  });
                                }
                              },
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextField(
                          controller: stockCtrl,
                          keyboardType: TextInputType.number,
                          style: const TextStyle(color: Colors.white),
                          decoration: const InputDecoration(
                            labelText: 'Stock Actual',
                            labelStyle: TextStyle(color: Colors.blueGrey),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.delete_forever, color: Colors.redAccent, size: 28),
                        tooltip: 'Eliminar Producto',
                        onPressed: () async {
                          if (confirm('¿Eliminar este producto?')) {
                            Navigator.of(ctx).pop();
                            try {
                              await ApiService.deleteProduct(product['id']);
                              _loadData();
                            } catch (e) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                            }
                          }
                        },
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: ElevatedButton(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.indigoAccent,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                          ),
                          onPressed: () async {
                            if (nameCtrl.text.isEmpty || priceCtrl.text.isEmpty) return;
                            Navigator.of(ctx).pop();
                            try {
                              await ApiService.updateProduct(product['id'], {
                                'name': nameCtrl.text.trim(),
                                'sellPrice': double.tryParse(priceCtrl.text) ?? 0.0,
                                'costPrice': double.tryParse(costCtrl.text) ?? 0.0,
                                'skuBarcode': skuCtrl.text.trim().isNotEmpty ? skuCtrl.text.trim() : null,
                                'sku': skuCtrl.text.trim().isNotEmpty ? skuCtrl.text.trim() : null,
                                'stock': int.tryParse(stockCtrl.text) ?? 0,
                              });
                              _loadData();
                            } catch (e) {
                              ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString())));
                            }
                          },
                          child: const Text('ACTUALIZAR PRODUCTO', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  bool confirm(String msg) => true;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        title: const Text('Cloud POS Admin', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.indigoAccent),
            onPressed: _loadData,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.redAccent),
            onPressed: () async {
              await ApiService.setToken(null);
              if (!mounted) return;
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(builder: (_) => const AdminLoginScreen()),
              );
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Colors.indigoAccent))
          : RefreshIndicator(
              onRefresh: _loadData,
              child: IndexedStack(
                index: _selectedIndex,
                children: [
                  _buildSummaryTab(),
                  _buildProductsTab(),
                  _buildSalesTab(),
                  _buildCustomersTab(),
                ],
              ),
            ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _selectedIndex,
        onTap: (idx) => setState(() => _selectedIndex = idx),
        backgroundColor: const Color(0xFF1E293B),
        selectedItemColor: Colors.indigoAccent,
        unselectedItemColor: Colors.blueGrey,
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard_rounded), label: 'Resumen'),
          BottomNavigationBarItem(icon: Icon(Icons.inventory_2_rounded), label: 'Productos'),
          BottomNavigationBarItem(icon: Icon(Icons.receipt_long_rounded), label: 'Ventas'),
          BottomNavigationBarItem(icon: Icon(Icons.people_alt_rounded), label: 'Clientes'),
        ],
      ),
    );
  }

  Widget _buildSummaryTab() {
    final totalSales = double.tryParse(_summary['totalSalesAmount']?.toString() ?? '0') ?? 0.0;
    final totalSalesCount = _summary['totalSalesCount'] ?? 0;

    return SingleChildScrollView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Tasa de cambio card
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [Colors.indigo.shade900, Colors.indigo.shade700],
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Tasa Oficial BCV / Paralelo', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(
                      '1 USD = ${_usdToBs.toStringAsFixed(2)} Bs.',
                      style: const TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                ElevatedButton.icon(
                  onPressed: _showUpdateRateDialog,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.white, foregroundColor: Colors.indigo.shade900),
                  icon: const Icon(Icons.edit, size: 16),
                  label: const Text('Cambiar'),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),
          const Text('Resumen del Negocio', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  'Ventas Totales',
                  currencyFormatter.format(totalSales),
                  'Bs. ${(totalSales * _usdToBs).toStringAsFixed(2)}',
                  Icons.attach_money,
                  const Color(0xFF10B981),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  'Transacciones',
                  '$totalSalesCount ventas',
                  'Registradas',
                  Icons.shopping_bag_outlined,
                  Colors.blueAccent,
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: _buildMetricCard(
                  'Productos en Catálogo',
                  '${_products.length} ítems',
                  'Disponibles',
                  Icons.category_outlined,
                  Colors.amber,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _buildMetricCard(
                  'Clientes Registrados',
                  '${_customers.length} clientes',
                  'En sistema',
                  Icons.people_outline,
                  Colors.purpleAccent,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildMetricCard(String title, String mainValue, String subValue, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 28),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(color: Colors.blueGrey, fontSize: 12)),
          const SizedBox(height: 4),
          Text(mainValue, style: const TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 2),
          Text(subValue, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w500)),
        ],
      ),
    );
  }

  Widget _buildProductsTab() {
    final query = _searchController.text.toLowerCase().trim();
    final filteredProducts = _products.where((p) {
      final name = (p['name'] ?? '').toString().toLowerCase();
      final sku = (p['sku'] ?? '').toString().toLowerCase();
      return name.contains(query) || sku.contains(query);
    }).toList();

    return Scaffold(
      backgroundColor: Colors.transparent,
      floatingActionButton: FloatingActionButton(
        backgroundColor: Colors.indigoAccent,
        onPressed: _showAddProductDialog,
        child: const Icon(Icons.add, color: Colors.white),
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _searchController,
                    onChanged: (_) => setState(() {}),
                    style: const TextStyle(color: Colors.white),
                    decoration: InputDecoration(
                      hintText: 'Buscar por nombre o código...',
                      hintStyle: const TextStyle(color: Colors.blueGrey),
                      prefixIcon: const Icon(Icons.search, color: Colors.blueGrey),
                      filled: true,
                      fillColor: const Color(0xFF1E293B),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Container(
                  decoration: BoxDecoration(
                    color: const Color(0xFF1E293B),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: IconButton(
                    icon: const Icon(Icons.qr_code_scanner, color: const Color(0xFF10B981)),
                    tooltip: 'Escanear con Cámara',
                    onPressed: () async {
                      final code = await Navigator.of(context).push<String>(
                        MaterialPageRoute(builder: (_) => const BarcodeScannerDialog()),
                      );
                      if (code != null && code.isNotEmpty) {
                        setState(() {
                          _searchController.text = code;
                        });
                      }
                    },
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: filteredProducts.isEmpty
                ? const Center(child: Text('No hay productos que coincidan', style: TextStyle(color: Colors.blueGrey)))
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: filteredProducts.length,
                    itemBuilder: (ctx, i) {
                      final p = filteredProducts[i];
                      final price = double.tryParse(p['sellPrice']?.toString() ?? '0') ?? 0.0;
                      final stock = p['stock'] ?? 0;

                      return Card(
                        color: const Color(0xFF1E293B),
                        margin: const EdgeInsets.only(bottom: 10),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        child: ListTile(
                          onTap: () => _showEditProductDialog(p),
                          leading: CircleAvatar(
                            backgroundColor: Colors.indigo.shade900,
                            child: Text(
                              p['name'] != null && p['name'].toString().isNotEmpty ? p['name'].toString()[0].toUpperCase() : 'P',
                              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                            ),
                          ),
                          title: Text(p['name'] ?? 'Producto', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                          subtitle: Text(
                            'Stock: $stock | Barras: ${p['skuBarcode'] ?? p['sku'] ?? 'Sin Código'}',
                            style: const TextStyle(color: Colors.blueGrey, fontSize: 12),
                          ),
                          trailing: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            crossAxisAlignment: CrossAxisAlignment.end,
                            children: [
                              Text(currencyFormatter.format(price), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                              Text('Bs. ${(price * _usdToBs).toStringAsFixed(2)}', style: const TextStyle(color: Colors.indigoAccent, fontSize: 11)),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildSalesTab() {
    return _sales.isEmpty
        ? const Center(child: Text('No hay historial de ventas', style: TextStyle(color: Colors.blueGrey)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _sales.length,
            itemBuilder: (ctx, i) {
              final sale = _sales[i];
              final total = double.tryParse(sale['totalAmount']?.toString() ?? '0') ?? 0.0;
              final code = sale['code'] ?? 'VENTA #${sale['id']}';

              return Card(
                color: const Color(0xFF1E293B),
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  leading: const CircleAvatar(
                    backgroundColor: const Color(0xFF10B981),
                    child: Icon(Icons.check_circle_outline, color: Colors.white),
                  ),
                  title: Text(code, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  subtitle: Text(
                    'Pago: ${sale['paymentMethod'] ?? 'EFECTIVO'}',
                    style: const TextStyle(color: Colors.blueGrey, fontSize: 12),
                  ),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(currencyFormatter.format(total), style: const TextStyle(color: const Color(0xFF34D399), fontWeight: FontWeight.bold, fontSize: 15)),
                      Text('Bs. ${(total * _usdToBs).toStringAsFixed(2)}', style: const TextStyle(color: Colors.blueGrey, fontSize: 11)),
                    ],
                  ),
                ),
              );
            },
          );
  }

  Widget _buildCustomersTab() {
    return _customers.isEmpty
        ? const Center(child: Text('No hay clientes registrados', style: TextStyle(color: Colors.blueGrey)))
        : ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: _customers.length,
            itemBuilder: (ctx, i) {
              final c = _customers[i];
              final debt = double.tryParse(c['currentDebt']?.toString() ?? '0') ?? 0.0;

              return Card(
                color: const Color(0xFF1E293B),
                margin: const EdgeInsets.only(bottom: 10),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: ListTile(
                  leading: CircleAvatar(
                    backgroundColor: Colors.purple.shade900,
                    child: Text(
                      c['name'] != null && c['name'].toString().isNotEmpty ? c['name'].toString()[0].toUpperCase() : 'C',
                      style: const TextStyle(color: Colors.white),
                    ),
                  ),
                  title: Text(c['name'] ?? 'Cliente', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  subtitle: Text('Doc: ${c['documentId'] ?? 'N/A'} | Tel: ${c['phone'] ?? 'N/A'}', style: const TextStyle(color: Colors.blueGrey, fontSize: 12)),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('Deuda:', style: TextStyle(color: Colors.blueGrey.shade300, fontSize: 11)),
                      Text(
                        currencyFormatter.format(debt),
                        style: TextStyle(
                          color: debt > 0 ? Colors.redAccent : const Color(0xFF34D399),
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
  }
}
