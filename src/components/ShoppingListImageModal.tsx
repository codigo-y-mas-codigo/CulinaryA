import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Download, 
  Share2, 
  Copy, 
  Check, 
  MessageCircle, 
  Image as ImageIcon,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { 
  type GeneratedImageResult, 
  type ShoppingListItem,
  downloadShoppingListImage, 
  shareShoppingList, 
  shareViaWhatsApp,
  copyImageToClipboard 
} from '../utils/generateShoppingListImage';

interface ShoppingListImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageResult: GeneratedImageResult | null;
  items: ShoppingListItem[];
}

export function ShoppingListImageModal({
  isOpen,
  onClose,
  imageResult,
  items
}: ShoppingListImageModalProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen || !imageResult) return null;

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 2500);
  };

  const handleDownload = () => {
    downloadShoppingListImage(imageResult.dataUrl);
    showFeedback("¡Imagen descargada con éxito!");
  };

  const handleShare = async () => {
    const outcome = await shareShoppingList(imageResult.blob, imageResult.dataUrl, items);
    if (outcome === 'downloaded') {
      showFeedback("¡Imagen descargada en tu dispositivo!");
    } else {
      showFeedback("¡Menú de compartir abierto!");
    }
  };

  const handleWhatsApp = () => {
    shareViaWhatsApp(items);
    showFeedback("Abriendo WhatsApp...");
  };

  const handleCopyImage = async () => {
    const ok = await copyImageToClipboard(imageResult.blob);
    if (ok) {
      showFeedback("¡Imagen copiada al portapapeles!");
    } else {
      // Fallback: descargar si el navegador no permite escribir blobs de imagen en clipboard
      downloadShoppingListImage(imageResult.dataUrl);
      showFeedback("Se descargó la imagen (no soportado copiar directo)");
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[110] bg-stone-900/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          className="bg-white rounded-3xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 flex flex-col relative"
        >
          {/* Cabecera */}
          <div className="p-5 border-b border-stone-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <ImageIcon size={18} />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 leading-tight">
                  Lista de Compras en Imagen
                </h3>
                <p className="text-xs text-stone-500">
                  Descarga, comparte en redes o envía por WhatsApp
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
              title="Cerrar ventana"
            >
              <X size={18} />
            </button>
          </div>

          {/* Toast de retroalimentación flotante */}
          {feedback && (
            <div className="bg-emerald-600 text-white text-xs font-semibold py-2 px-4 rounded-full mx-auto my-2 shadow-md flex items-center gap-1.5 animate-bounce">
              <Check size={14} />
              <span>{feedback}</span>
            </div>
          )}

          {/* Vista previa de la imagen */}
          <div className="p-4 sm:p-6 flex flex-col items-center bg-stone-50/70">
            <div className="rounded-2xl overflow-hidden border border-stone-200/80 shadow-md max-h-[420px] bg-white w-full flex items-center justify-center">
              <img 
                src={imageResult.dataUrl} 
                alt="Lista de Compras CulinaryAI" 
                className="w-full h-auto object-contain max-h-[420px]"
              />
            </div>
            <p className="text-[11px] text-stone-400 mt-2 flex items-center gap-1">
              <Sparkles size={11} className="text-emerald-500" />
              <span>Diseño en alta resolución generado automáticamente</span>
            </p>
          </div>

          {/* Botones de acción */}
          <div className="p-5 border-t border-stone-100 space-y-3 bg-white">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Botón Descargar */}
              <button
                onClick={handleDownload}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
              >
                <Download size={16} />
                <span>Descargar Imagen (PNG)</span>
              </button>

              {/* Botón Compartir */}
              <button
                onClick={handleShare}
                className="w-full py-3 px-4 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs md:text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Share2 size={16} />
                <span>Compartir en el Móvil</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Enviar por WhatsApp */}
              <button
                onClick={handleWhatsApp}
                className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <MessageCircle size={16} className="text-emerald-600" />
                <span>Enviar por WhatsApp</span>
              </button>

              {/* Copiar Imagen */}
              <button
                onClick={handleCopyImage}
                className="w-full py-2.5 px-4 bg-stone-100 hover:bg-stone-200/80 text-stone-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Copy size={16} />
                <span>Copiar Imagen al Portapapeles</span>
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
