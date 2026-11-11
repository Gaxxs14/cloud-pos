import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class CartItem {
  final String productId;
  final String name;
  final double regularPrice;
  final double? wholesalePrice;
  final double? wholesaleMinQty;
  double quantity;

  CartItem({
    required this.productId,
    required this.name,
    required this.regularPrice,
    this.wholesalePrice,
    this.wholesaleMinQty,
    required this.quantity,
  });

  bool get isWholesaleApplied =>
      wholesalePrice != null &&
      wholesaleMinQty != null &&
      wholesalePrice! > 0 &&
      wholesaleMinQty! > 0 &&
      quantity >= wholesaleMinQty!;

  double get unitPrice => isWholesaleApplied ? wholesalePrice! : regularPrice;
  double get subtotal => unitPrice * quantity;
}

class CartProvider with ChangeNotifier {
  List<dynamic> _products = [];
  final List<CartItem> _items = [];
  bool _isLoading = false;
  int _pendingOfflineSalesCount = 0;

  List<dynamic> get products => _products;
  List<CartItem> get items => _items;
  bool get isLoading => _isLoading;
  int get pendingOfflineSalesCount => _pendingOfflineSalesCount;

  double get totalAmount {
    return _items.fold(0.0, (sum, item) => sum + item.subtotal);
  }

  Future<void> loadOfflineSalesCount() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingSalesJson = prefs.getString('pending_sales') ?? '[]';
      final List<dynamic> pendingSales = jsonDecode(pendingSalesJson);
      _pendingOfflineSalesCount = pendingSales.length;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> _saveOfflineSale(Map<String, dynamic> payload) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingSalesJson = prefs.getString('pending_sales') ?? '[]';
      final List<dynamic> pendingSales = jsonDecode(pendingSalesJson);
      pendingSales.add(payload);
      await prefs.setString('pending_sales', jsonEncode(pendingSales));
      _pendingOfflineSalesCount = pendingSales.length;
      notifyListeners();
    } catch (_) {}
  }

  Future<int> syncOfflineSales() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final pendingSalesJson = prefs.getString('pending_sales') ?? '[]';
      final List<dynamic> pendingSales = jsonDecode(pendingSalesJson);
      if (pendingSales.isEmpty) return 0;

      int syncedCount = 0;
      List<dynamic> failedSales = [];

      for (final sale in pendingSales) {
        try {
          await ApiService.post('/sales', sale);
          syncedCount++;
        } catch (_) {
          failedSales.add(sale);
        }
      }

      await prefs.setString('pending_sales', jsonEncode(failedSales));
      _pendingOfflineSalesCount = failedSales.length;
      notifyListeners();
      return syncedCount;
    } catch (_) {
      return 0;
    }
  }

  Future<void> fetchProducts([String? warehouseId]) async {
    _isLoading = true;
    notifyListeners();

    await loadOfflineSalesCount();

    try {
      if (warehouseId != null) {
        final response = await ApiService.get('/warehouses/$warehouseId/stock');
        final stockList = jsonDecode(response.body) as List;
        _products = stockList.map((item) {
          final prod = Map<String, dynamic>.from(item['product']);
          prod['stock'] = item['stock']; // Reemplazar stock global por el de este almacén
          return prod;
        }).toList();
      } else {
        final response = await ApiService.get('/products');
        _products = jsonDecode(response.body);
      }

      // Guardar en caché local
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('cached_products', jsonEncode(_products));

      _isLoading = false;
      notifyListeners();
    } catch (e) {
      // Fallback a caché local si falla la red
      final prefs = await SharedPreferences.getInstance();
      final cached = prefs.getString('cached_products');
      if (cached != null) {
        _products = jsonDecode(cached);
      }
      _isLoading = false;
      notifyListeners();
    }
  }

  void addToCart(dynamic product, [double? customQty]) {
    final existingIndex = _items.indexWhere((item) => item.productId == product['id']);
    final qtyToAdd = customQty ?? double.tryParse(product['customWeightKg']?.toString() ?? '') ?? 1.0;

    final sellPrice = double.tryParse(product['sellPrice']?.toString() ?? '') ?? 0.0;
    final wPrice = double.tryParse(product['wholesalePrice']?.toString() ?? '');
    final wMinQty = double.tryParse(product['wholesaleMinQty']?.toString() ?? '');

    if (existingIndex >= 0) {
      _items[existingIndex].quantity += qtyToAdd;
    } else {
      _items.add(CartItem(
        productId: product['id'],
        name: product['name'] ?? 'Producto',
        regularPrice: sellPrice,
        wholesalePrice: wPrice,
        wholesaleMinQty: wMinQty,
        quantity: qtyToAdd,
      ));
    }
    notifyListeners();
  }

  void removeOne(String productId) {
    final existingIndex = _items.indexWhere((item) => item.productId == productId);

    if (existingIndex >= 0) {
      if (_items[existingIndex].quantity > 1) {
        _items[existingIndex].quantity -= 1;
      } else {
        _items.removeAt(existingIndex);
      }
      notifyListeners();
    }
  }

  void removeFromCart(String productId) {
    _items.removeWhere((item) => item.productId == productId);
    notifyListeners();
  }

  void clearCart() {
    _items.clear();
    notifyListeners();
  }

  Future<void> checkout(
    String paymentMethod,
    String? customerId, [
    String? warehouseId,
    Map<String, dynamic>? splitDetails,
    double? igtfAmount,
  ]) async {
    if (_items.isEmpty) return;

    _isLoading = true;
    notifyListeners();

    final finalTotal = totalAmount + (igtfAmount ?? 0.0);
    final payload = {
      'paymentMethod': paymentMethod,
      'customerId': customerId,
      'warehouseId': warehouseId,
      'totalAmount': finalTotal,
      'taxAmount': totalAmount * 0.16,
      'igtfAmount': igtfAmount ?? 0.0,
      'discountAmount': 0.0,
      if (splitDetails != null) 'splitDetails': splitDetails,
      'items': _items.map((item) => {
        'productId': item.productId,
        'quantity': item.quantity.toDouble(),
        'unitPrice': item.unitPrice,
        'discount': 0.0,
      }).toList(),
    };

    try {
      await ApiService.post('/sales', payload);
      clearCart();
      try {
        await fetchProducts(warehouseId);
      } catch (_) {}
    } catch (e) {
      final errStr = e.toString().toLowerCase();
      if (errStr.contains('socketexception') ||
          errStr.contains('clientexception') ||
          errStr.contains('failed host lookup') ||
          errStr.contains('timeout')) {
        
        await _saveOfflineSale(payload);
        clearCart();
        _isLoading = false;
        notifyListeners();
        throw Exception('offline_saved');
      } else {
        _isLoading = false;
        notifyListeners();
        rethrow;
      }
    }
  }
}
