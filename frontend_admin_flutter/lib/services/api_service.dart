import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  static const String baseUrl = 'https://cloud-pos-13ld.onrender.com';
  static String? _token;

  static Future<void> init() async {
    final prefs = await SharedPreferences.getInstance();
    _token = prefs.getString('admin_auth_token');
  }

  static Future<void> setToken(String? token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    if (token == null) {
      await prefs.remove('admin_auth_token');
    } else {
      await prefs.setString('admin_auth_token', token);
    }
  }

  static String? get token => _token;

  static Map<String, String> _getHeaders() {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (_token != null) {
      headers['Authorization'] = 'Bearer $_token';
    }
    return headers;
  }

  static Future<Map<String, dynamic>> login(String email, String password) async {
    final url = Uri.parse('$baseUrl/auth/login');
    final response = await http.post(
      url,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'email': email, 'password': password}),
    );
    if (response.statusCode >= 400) {
      final data = jsonDecode(response.body);
      throw Exception(data['message'] ?? 'Error al iniciar sesión');
    }
    final data = jsonDecode(response.body);
    final token = data['token'] ?? data['accessToken'];
    if (token != null) {
      await setToken(token.toString());
    }
    return data;
  }

  static Future<List<dynamic>> getProducts() async {
    final url = Uri.parse('$baseUrl/products');
    final response = await http.get(url, headers: _getHeaders());
    if (response.statusCode >= 400) throw Exception('Error al cargar productos');
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> createProduct(Map<String, dynamic> body) async {
    final url = Uri.parse('$baseUrl/products');
    final response = await http.post(url, headers: _getHeaders(), body: jsonEncode(body));
    if (response.statusCode >= 400) throw Exception('Error al crear producto');
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> updateProduct(String id, Map<String, dynamic> body) async {
    final url = Uri.parse('$baseUrl/products/$id');
    final response = await http.put(url, headers: _getHeaders(), body: jsonEncode(body));
    if (response.statusCode >= 400) throw Exception('Error al actualizar producto');
    return jsonDecode(response.body);
  }

  static Future<void> deleteProduct(String id) async {
    final url = Uri.parse('$baseUrl/products/$id');
    final response = await http.delete(url, headers: _getHeaders());
    if (response.statusCode >= 400) throw Exception('Error al eliminar producto');
  }

  static Future<List<dynamic>> getCategories() async {
    final url = Uri.parse('$baseUrl/categories');
    final response = await http.get(url, headers: _getHeaders());
    if (response.statusCode >= 400) return [];
    return jsonDecode(response.body);
  }

  static Future<Map<String, dynamic>> getSummaryReport() async {
    final url = Uri.parse('$baseUrl/reports/summary');
    final response = await http.get(url, headers: _getHeaders());
    if (response.statusCode >= 400) return {};
    return jsonDecode(response.body);
  }

  static Future<double> getExchangeRate() async {
    try {
      final url = Uri.parse('$baseUrl/exchange-rates/current');
      final response = await http.get(url, headers: _getHeaders());
      if (response.statusCode < 400) {
        final data = jsonDecode(response.body);
        final rate = double.tryParse(data['usdToBs']?.toString() ?? '');
        if (rate != null && rate > 0) return rate;
      }
    } catch (_) {}
    return 1.0;
  }

  static Future<void> updateExchangeRate(double rate) async {
    final url = Uri.parse('$baseUrl/exchange-rates');
    final response = await http.post(
      url,
      headers: _getHeaders(),
      body: jsonEncode({'usdToBs': rate}),
    );
    if (response.statusCode >= 400) throw Exception('Error al actualizar tasa');
  }

  static Future<List<dynamic>> getSales() async {
    final url = Uri.parse('$baseUrl/sales');
    final response = await http.get(url, headers: _getHeaders());
    if (response.statusCode >= 400) return [];
    return jsonDecode(response.body);
  }

  static Future<List<dynamic>> getCustomers() async {
    final url = Uri.parse('$baseUrl/customers');
    final response = await http.get(url, headers: _getHeaders());
    if (response.statusCode >= 400) return [];
    return jsonDecode(response.body);
  }
}
