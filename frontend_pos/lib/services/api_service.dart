import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class PaymentRequiredException implements Exception {
  final String message;
  PaymentRequiredException(this.message);
  @override
  String toString() => message;
}

class UnauthorizedException implements Exception {
  final String message;
  UnauthorizedException(this.message);
  @override
  String toString() => message;
}

class ApiService {
  static const String baseUrl = String.fromEnvironment('API_URL', defaultValue: 'https://cloud-pos-13ld.onrender.com');
  static String? _token;
  static VoidCallback? onUnauthorized;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('auth_token');
  }

  static Future<void> setToken(String? token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove('auth_token');
    } else {
      await prefs.setString('auth_token', token);
    }
  }

  static String? get token => _token;

  static Map<String, String> _getHeaders() {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Bypass-Tunnel-Reminder': 'true',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  static const Duration timeoutDuration = Duration(seconds: 12);

  static Future<http.Response> get(String path) async {
    final url = Uri.parse('$baseUrl$path');
    try {
      final response = await http.get(url, headers: _getHeaders()).timeout(timeoutDuration);
      _checkResponse(response);
      return response;
    } catch (e) {
      rethrow;
    }
  }

  static Future<http.Response> post(String path, Map<String, dynamic> body) async {
    final url = Uri.parse('$baseUrl$path');
    try {
      final response = await http.post(
        url,
        headers: _getHeaders(),
        body: jsonEncode(body),
      ).timeout(timeoutDuration);
      _checkResponse(response);
      return response;
    } catch (e) {
      rethrow;
    }
  }

  static Future<http.Response> put(String path, Map<String, dynamic> body) async {
    final url = Uri.parse('$baseUrl$path');
    try {
      final response = await http.put(
        url,
        headers: _getHeaders(),
        body: jsonEncode(body),
      ).timeout(timeoutDuration);
      _checkResponse(response);
      return response;
    } catch (e) {
      rethrow;
    }
  }

  static Future<http.Response> delete(String path) async {
    final url = Uri.parse('$baseUrl$path');
    try {
      final response = await http.delete(url, headers: _getHeaders()).timeout(timeoutDuration);
      _checkResponse(response);
      return response;
    } catch (e) {
      rethrow;
    }
  }

  static void _checkResponse(http.Response response) {
    if (response.statusCode >= 400) {
      String errorMessage = 'Ocurrió un error en el servidor';
      try {
        final body = jsonDecode(response.body);
        if (body['message'] != null) {
          if (body['message'] is List) {
            errorMessage = (body['message'] as List).join(', ');
          } else {
            errorMessage = body['message'].toString();
          }
        }
      } catch (_) {}
      
      if (response.statusCode == 401 || response.statusCode == 403) {
        onUnauthorized?.call();
        throw UnauthorizedException(errorMessage);
      }
      if (response.statusCode == 402) {
        throw PaymentRequiredException(errorMessage);
      }
      throw Exception(errorMessage);
    }
  }

  /// Obtiene la tasa de cambio USD → Bs vigente.
  /// Devuelve 1.0 como fallback si no hay tasa configurada o falla la petición.
  static Future<double> getExchangeRate() async {
    try {
      final response = await get('/exchange-rates/current');
      final data = jsonDecode(response.body);
      final rate = double.tryParse(data['usdToBs']?.toString() ?? '');
      return (rate != null && rate > 0) ? rate : 1.0;
    } catch (_) {
      return 1.0; // fallback seguro si no hay tasa o falla la red
    }
  }

  /// Sincroniza la tasa oficial del BCV en vivo desde el backend
  static Future<double> syncBcvExchangeRate() async {
    try {
      final response = await post('/exchange-rates/sync-bcv', {});
      final data = jsonDecode(response.body);
      final rate = double.tryParse(data['usdToBs']?.toString() ?? '');
      return (rate != null && rate > 0) ? rate : await getExchangeRate();
    } catch (_) {
      return await getExchangeRate();
    }
  }

  /// Obtiene los datos del perfil del usuario para validar el token
  static Future<http.Response> getProfile() async {
    return get('/auth/profile');
  }
}
