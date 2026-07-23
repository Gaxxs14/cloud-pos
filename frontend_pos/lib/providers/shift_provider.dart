import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class ShiftProvider with ChangeNotifier {
  Map<String, dynamic>? _activeShift;
  bool _isLoading = false;

  String? _selectedBranchId;
  String? _selectedBranchName;
  String? _selectedWarehouseId;
  String? _selectedWarehouseName;

  Map<String, dynamic>? get activeShift => _activeShift;
  bool get isOpen => _activeShift != null;
  bool get isLoading => _isLoading;

  String? get selectedBranchId => _selectedBranchId;
  String? get selectedBranchName => _selectedBranchName;
  String? get selectedWarehouseId => _selectedWarehouseId;
  String? get selectedWarehouseName => _selectedWarehouseName;

  // Carga las selecciones guardadas de sucursal y bodega
  Future<void> loadSavedSelection() async {
    final prefs = await SharedPreferences.getInstance();
    _selectedBranchId = prefs.getString('pos_branch_id');
    _selectedBranchName = prefs.getString('pos_branch_name');
    _selectedWarehouseId = prefs.getString('pos_warehouse_id');
    _selectedWarehouseName = prefs.getString('pos_warehouse_name');
    notifyListeners();
  }

  // Guarda y actualiza la sucursal y bodega seleccionadas
  Future<void> selectBranchAndWarehouse(
    String branchId,
    String branchName,
    String warehouseId,
    String warehouseName,
  ) async {
    _selectedBranchId = branchId;
    _selectedBranchName = branchName;
    _selectedWarehouseId = warehouseId;
    _selectedWarehouseName = warehouseName;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('pos_branch_id', branchId);
    await prefs.setString('pos_branch_name', branchName);
    await prefs.setString('pos_warehouse_id', warehouseId);
    await prefs.setString('pos_warehouse_name', warehouseName);
    
    notifyListeners();
  }

  // Verifica si hay un turno activo en el servidor
  Future<void> checkActiveShift() async {
    _isLoading = true;
    notifyListeners();

    try {
      await loadSavedSelection();
      
      final response = await ApiService.get('/shifts/active');
      if (response.body.isNotEmpty && response.body != 'null') {
        _activeShift = jsonDecode(response.body);
        // Si hay un turno activo en el servidor, sincronizar el branchId
        if (_activeShift!['branchId'] != null) {
          _selectedBranchId = _activeShift!['branchId'];
        }
      } else {
        _activeShift = null;
      }
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _activeShift = null;
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Abre un turno con el saldo inicial
  Future<void> openShift(double openingBalance) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.post('/shifts/open', {
        'openingBalance': openingBalance,
        'branchId': _selectedBranchId,
      });
      _activeShift = jsonDecode(response.body);
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Registra una transacción de caja (Entrada / Salida de efectivo)
  Future<void> addTransaction(double amount, String type, String description) async {
    _isLoading = true;
    notifyListeners();

    try {
      await ApiService.post('/shifts/transaction', {
        'amount': amount,
        'type': type,
        'description': description,
      });
      // Volver a cargar el estado del turno para ver totales actualizados
      await checkActiveShift();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  // Cierra el turno declarando el saldo físico contado
  Future<Map<String, dynamic>> closeShift(double declaredBalance, {double? usd, double? bs}) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.post('/shifts/close', {
        'declaredBalance': declaredBalance,
        if (usd != null) 'declaredBalanceUsd': usd,
        if (bs != null) 'declaredBalanceBs': bs,
      });
      final closedDetails = jsonDecode(response.body) as Map<String, dynamic>;
      _activeShift = null; // Reiniciar estado a cerrado localmente
      _isLoading = false;
      notifyListeners();
      return closedDetails;
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }
}
