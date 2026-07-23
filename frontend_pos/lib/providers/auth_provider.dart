import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AuthProvider with ChangeNotifier {
  bool _isAuthenticated = false;
  bool _isLoading = false;
  Map<String, dynamic>? _user;
  Map<String, dynamic>? _tenant;

  AuthProvider() {
    ApiService.onUnauthorized = () {
      logout();
    };
  }

  bool get isAuthenticated => _isAuthenticated;
  bool get isLoading => _isLoading;
  Map<String, dynamic>? get user => _user;
  Map<String, dynamic>? get tenant => _tenant;

  Future<void> tryAutoLogin() async {
    await ApiService.init();
    if (ApiService.token != null) {
      try {
        final response = await ApiService.getProfile();
        final data = jsonDecode(response.body);
        _user = data;
        _tenant = data['tenant'];
        _isAuthenticated = true;
      } on UnauthorizedException catch (_) {
        // Token vencido o inválido: limpiar datos locales
        await ApiService.setToken(null);
        _isAuthenticated = false;
        _user = null;
        _tenant = null;
      } catch (_) {
        // Fallas de conexión u offline: asumir sesión válida temporalmente para no bloquear la caja
        _isAuthenticated = true;
      }
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await ApiService.post('/auth/login', {
        'email': email,
        'password': password,
      });

      final data = jsonDecode(response.body);
      final token = data['token'];
      
      await ApiService.setToken(token);
      _user = data['user'];
      _tenant = data['tenant'];
      _isAuthenticated = true;
      _isLoading = false;
      notifyListeners();
    } catch (e) {
      _isLoading = false;
      notifyListeners();
      rethrow;
    }
  }

  Future<void> logout() async {
    await ApiService.setToken(null);
    _isAuthenticated = false;
    _user = null;
    _tenant = null;
    notifyListeners();
  }
}
