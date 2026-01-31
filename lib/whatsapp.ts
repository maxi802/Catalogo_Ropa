/**
 * Interfaz actualizada para incluir el talle seleccionado.
 */
export interface CartItem {
  nombre: string;
  precio: number;
  cantidad: number;
  talle: string; // Nueva propiedad para el talle
  imagen_url: string | string[];
}

/**
 * Envía el pedido a WhatsApp con el detalle de productos y sus talles.
 */
export const enviarPedidoWhatsApp = (cart: CartItem[], total: number) => {
  // CONFIGURACIÓN: Tu número de WhatsApp
  const TELEFONO_DESTINO = "5493884874331"; 

  // 1. Encabezado del mensaje
  let mensaje = `*📦 NUEVO PEDIDO*\n`;
  mensaje += `--------------------------\n\n`;

  // 2. Detalle de los productos
  cart.forEach((item) => {
    const subtotal = item.precio * item.cantidad;
    mensaje += `*${item.cantidad}x* ${item.nombre}\n`;
    mensaje += `📍 *Talle: ${item.talle}*\n`; // Línea agregada para el talle
    mensaje += `Subtotal: $${subtotal.toLocaleString()}\n\n`;
  });

  // 3. Pie del mensaje con el Total
  mensaje += `--------------------------\n`;
  mensaje += `*TOTAL A PAGAR: $${total.toLocaleString()}*\n\n`;
  mensaje += `_Enviado desde el catálogo web_`;

  // 4. Codificar para URL
  const textoFinal = encodeURIComponent(mensaje);
  const link = `https://wa.me/${TELEFONO_DESTINO}?text=${textoFinal}`;

  // 5. Abrir en una nueva ventana
  window.open(link, "_blank");
};