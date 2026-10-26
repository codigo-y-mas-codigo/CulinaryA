export interface ShoppingListItem {
  id?: string;
  name: string;
  completed: boolean;
}

export interface GeneratedImageResult {
  dataUrl: string;
  blob: Blob;
}

export function generateShoppingListImage(
  items: ShoppingListItem[],
  extraNote = "Recuerda priorizar alimentos frescos de temporada y bajo índice glucémico."
): Promise<GeneratedImageResult> {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('No se pudo inicializar el contexto 2D del canvas');
      }

      // Dimensiones base
      const width = 800;
      const itemHeight = 44;
      const headerHeight = 220;
      const footerHeight = 160;
      const contentHeight = Math.max(120, items.length * itemHeight);
      const height = headerHeight + contentHeight + footerHeight;

      // Escala para calidad Retina / HD (2x)
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;
      ctx.scale(scale, scale);

      // 1. Fondo elegante con degradado suave
      const bgGradient = ctx.createLinearGradient(0, 0, width, height);
      bgGradient.addColorStop(0, '#ffffff');
      bgGradient.addColorStop(0.5, '#f8fafc');
      bgGradient.addColorStop(1, '#f0fdf4');
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, width, height);

      // Marco decorativo con bordes redondeados
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2;
      ctx.strokeRect(16, 16, width - 32, height - 32);

      // 2. Barra decorativa superior verde esmeralda
      const bannerGradient = ctx.createLinearGradient(16, 16, width - 16, 16);
      bannerGradient.addColorStop(0, '#059669');
      bannerGradient.addColorStop(0.5, '#10b981');
      bannerGradient.addColorStop(1, '#047857');
      ctx.fillStyle = bannerGradient;
      ctx.fillRect(16, 16, width - 32, 10);

      // 3. Encabezado de la marca
      ctx.fillStyle = '#059669';
      ctx.font = 'bold 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('CULINARY AI • TU COCINA INTELIGENTE', 44, 58);

      // Título principal
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 32px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('🛒 Lista de Compras', 44, 100);

      // Subtítulo con fecha y cantidad de artículos
      const fecha = new Date().toLocaleDateString('es-ES', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      const fechaCapitalizada = fecha.charAt(0).toUpperCase() + fecha.slice(1);
      const completados = items.filter(i => i.completed).length;

      ctx.fillStyle = '#64748b';
      ctx.font = '500 15px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(
        `${fechaCapitalizada}  •  ${items.length} artículos (${completados} marcados)`, 
        44, 
        130
      );

      // Tarjeta contenedora de la lista
      const listCardX = 36;
      const listCardY = 160;
      const listCardWidth = width - 72;
      const listCardHeight = contentHeight + 40;

      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.04)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.roundRect(listCardX, listCardY, listCardWidth, listCardHeight, 16);
      ctx.fill();

      ctx.shadowColor = 'transparent';
      ctx.strokeStyle = '#f1f5f9';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // 4. Renderizado de artículos
      let currentY = listCardY + 36;

      if (items.length === 0) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = 'italic 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('No hay ingredientes pendientes en la lista.', width / 2, currentY + 20);
        ctx.textAlign = 'left';
      } else {
        items.forEach((item, index) => {
          const itemNumber = `${index + 1}.`;
          const checkboxX = 60;
          const checkboxY = currentY - 14;
          const checkboxSize = 20;

          // Dibujar casilla de verificación
          if (item.completed) {
            ctx.fillStyle = '#10b981';
            ctx.beginPath();
            ctx.roundRect(checkboxX, checkboxY, checkboxSize, checkboxSize, 5);
            ctx.fill();

            // Símbolo de verificación blanco
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(checkboxX + 5, checkboxY + 10);
            ctx.lineTo(checkboxX + 9, checkboxY + 14);
            ctx.lineTo(checkboxX + 15, checkboxY + 5);
            ctx.stroke();

            // Texto tachado
            ctx.fillStyle = '#94a3b8';
            ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(item.name, checkboxX + 32, currentY);

            // Línea de tachado
            const textWidth = ctx.measureText(item.name).width;
            ctx.strokeStyle = '#94a3b8';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(checkboxX + 32, currentY - 5);
            ctx.lineTo(checkboxX + 32 + textWidth, currentY - 5);
            ctx.stroke();
          } else {
            ctx.strokeStyle = '#cbd5e1';
            ctx.lineWidth = 2;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.roundRect(checkboxX, checkboxY, checkboxSize, checkboxSize, 5);
            ctx.fill();
            ctx.stroke();

            // Texto normal legible
            ctx.fillStyle = '#1e293b';
            ctx.font = '600 16px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
            ctx.fillText(item.name, checkboxX + 32, currentY);
          }

          // Separador tenue entre elementos
          if (index < items.length - 1) {
            ctx.strokeStyle = '#f8fafc';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(60, currentY + 18);
            ctx.lineTo(width - 60, currentY + 18);
            ctx.stroke();
          }

          currentY += itemHeight;
        });
      }

      // 5. Nota de salud / consejo nutricional
      const noteY = listCardY + listCardHeight + 24;
      ctx.fillStyle = '#ecfdf5';
      ctx.beginPath();
      ctx.roundRect(36, noteY, width - 72, 54, 12);
      ctx.fill();
      ctx.strokeStyle = '#a7f3d0';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#065f46';
      ctx.font = 'bold 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText('💡 CONSEJO DE COMPRA SALUDABLE', 56, noteY + 22);

      ctx.fillStyle = '#047857';
      ctx.font = '500 13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.fillText(extraNote, 56, noteY + 41);

      // 6. Pie de página y firma
      const footerY = height - 42;
      ctx.fillStyle = '#94a3b8';
      ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Generado con CulinaryAI • Asistente de Cocina y Nevera Inteligente', width / 2, footerY);
      ctx.textAlign = 'left';

      // Conversión a DataURL y Blob
      const dataUrl = canvas.toDataURL('image/png');
      canvas.toBlob((blob) => {
        if (blob) {
          resolve({ dataUrl, blob });
        } else {
          reject(new Error('No se pudo generar el archivo Blob'));
        }
      }, 'image/png');
    } catch (err) {
      reject(err);
    }
  });
}

// Descargar imagen directamente
export function downloadShoppingListImage(dataUrl: string, filename = 'Lista_de_Compras_CulinaryAI.png') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Compartir con Web Share API (con soporte de archivo imagen donde esté disponible)
export async function shareShoppingList(
  blob: Blob, 
  dataUrl: string, 
  items: ShoppingListItem[]
): Promise<'shared' | 'downloaded' | 'copied'> {
  const title = '🛒 Mi Lista de Compras - CulinaryAI';
  const textSummary = items.map(i => `${i.completed ? '☑' : '☐'} ${i.name}`).join('\n');
  const shareText = `🛒 *Lista de Compras de CulinaryAI:*\n${textSummary}\n\nCreado con CulinaryAI`;

  // Intentar compartir con Web Share API archivo imagen
  if (typeof navigator !== 'undefined' && 'share' in navigator) {
    try {
      const file = new File([blob], 'Lista_de_Compras_CulinaryAI.png', { type: 'image/png' });
      if ('canShare' in navigator && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({
          title,
          text: shareText,
          files: [file]
        });
        return 'shared';
      } else {
        // Compartir texto si no admite archivos
        await navigator.share({
          title,
          text: shareText
        });
        return 'shared';
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Fallo en navigator.share, procediendo a descarga:', err);
      }
    }
  }

  // Si no hay Web Share, descargar automáticamente la imagen
  downloadShoppingListImage(dataUrl);
  return 'downloaded';
}

// Enlace directo a WhatsApp
export function shareViaWhatsApp(items: ShoppingListItem[]) {
  const textSummary = items.map(i => `• ${i.completed ? '☑' : '☐'} ${i.name}`).join('\n');
  const message = `🛒 *Mi Lista de Compras (CulinaryAI):*\n\n${textSummary}\n\n✨ _Creado con mi asistente inteligente de cocina_`;
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}

// Copiar imagen directamente al portapapeles
export async function copyImageToClipboard(blob: Blob): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'clipboard' in navigator && 'write' in navigator.clipboard) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blob })
      ]);
      return true;
    } catch (e) {
      console.warn('No se pudo copiar la imagen al portapapeles:', e);
    }
  }
  return false;
}
