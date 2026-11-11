import 'package:intl/intl.dart';

class ThermalReceiptService {
  /// Genera el texto formateado estándar ESC/POS (ancho 32 caracteres para 58mm o 42 para 80mm)
  static String generateSaleReceipt({
    required String businessName,
    required String branchName,
    required String cashierName,
    required List<Map<String, dynamic>> items,
    required double totalAmount,
    required String paymentMethod,
    double? usdToBs,
    String? customerName,
    String? customerTaxId,
  }) {
    final now = DateTime.now();
    final dateStr = DateFormat('dd/MM/yyyy HH:mm:ss').format(now);
    final buffer = StringBuffer();

    // Encabezado
    buffer.writeln(centerText(businessName.toUpperCase(), 32));
    if (branchName.isNotEmpty) {
      buffer.writeln(centerText(branchName, 32));
    }
    buffer.writeln(divider(32, '='));
    buffer.writeln('FECHA:   $dateStr');
    buffer.writeln('CAJERO:  $cashierName');
    if (customerName != null && customerName.isNotEmpty) {
      buffer.writeln('CLIENTE: $customerName');
    }
    if (customerTaxId != null && customerTaxId.isNotEmpty) {
      buffer.writeln('RIF/CI:  $customerTaxId');
    }
    buffer.writeln(divider(32, '-'));

    // Encabezado de columnas
    buffer.writeln('DESCRIPCION      CANT   TOTAL');
    buffer.writeln(divider(32, '-'));

    // Lista de productos
    for (final item in items) {
      final name = (item['name'] ?? 'Producto').toString();
      final qty = (item['quantity'] ?? 1).toString();
      final price = double.tryParse(item['unitPrice']?.toString() ?? '0') ?? 0.0;
      final subtotal = price * (double.tryParse(qty) ?? 1.0);

      // Nombre truncado o en línea completa si es largo
      if (name.length > 16) {
        buffer.writeln(name);
        buffer.writeln(
          '                 ' +
          qty.padLeft(4) +
          '  ' +
          '\$${subtotal.toStringAsFixed(2)}'.padLeft(9),
        );
      } else {
        buffer.writeln(
          name.padRight(16) +
          ' ' +
          qty.padLeft(4) +
          ' ' +
          '\$${subtotal.toStringAsFixed(2)}'.padLeft(9),
        );
      }
    }

    buffer.writeln(divider(32, '='));

    // Totales
    buffer.writeln(
      'TOTAL USD:'.padRight(18) + '\$${totalAmount.toStringAsFixed(2)}'.padLeft(14),
    );

    if (usdToBs != null && usdToBs > 1.0) {
      final totalBs = totalAmount * usdToBs;
      buffer.writeln(
        'TOTAL BS:'.padRight(18) + 'Bs. ${totalBs.toStringAsFixed(2)}'.padLeft(14),
      );
      buffer.writeln(
        'TASA BCV/REF:'.padRight(18) + '${usdToBs.toStringAsFixed(2)}'.padLeft(14),
      );
    }

    buffer.writeln('METODO DE PAGO:    $paymentMethod');
    buffer.writeln(divider(32, '='));
    buffer.writeln(centerText('¡GRACIAS POR SU COMPRA!', 32));
    buffer.writeln(centerText('VUELVA PRONTO', 32));
    buffer.writeln('\n\n\n'); // Espacio para corte de papel

    return buffer.toString();
  }

  static String centerText(String text, int width) {
    if (text.length >= width) return text.substring(0, width);
    final padding = (width - text.length) ~/ 2;
    return ' ' * padding + text;
  }

  static String divider(int width, [String char = '-']) {
    return char * width;
  }
}
