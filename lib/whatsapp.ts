/**
 * Interfaz local para compatibilidad con el nuevo formato de imágenes.
 */
export interface CartItem {
  nombre: string;
  precio: number;
  cantidad: number;
  imagen_url: string | string[]; // Acepta string único o Array de strings
}

/**
 * Envía el pedido a WhatsApp con un formato profesional y limpio.
 * @param cart - Array de items del carrito.
 * @param total - Monto total de la compra.
 */
export const enviarPedidoWhatsApp = (cart: CartItem[], total: number) => {
  // CONFIGURACIÓN: Cambia este número por el tuyo (con código de país, sin el +)
  const TELEFONO_DESTINO = "5493875403428"; 

  // 1. Encabezado del mensaje
  let mensaje = `*📦 NUEVO PEDIDO*\n`;
  mensaje += `--------------------------\n\n`;

  // 2. Detalle de los productos
  cart.forEach((item) => {
    const subtotal = item.precio * item.cantidad;
    mensaje += `*${item.cantidad}x* ${item.nombre}\n`;
    mensaje += `Subtotal: $${subtotal.toLocaleString()}\n\n`;
  });

  // 3. Pie del mensaje con el Total
  mensaje += `--------------------------\n`;
  mensaje += `*TOTAL A PAGAR: $${total.toLocaleString()}*\n\n`;


  // 4. Codificar para URL
  const textoFinal = encodeURIComponent(mensaje);
  const link = `https://wa.me/${TELEFONO_DESTINO}?text=${textoFinal}`;

  // 5. Abrir en una nueva ventana
  window.open(link, "_blank");
};