import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Lightbulb, 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  ShieldCheck, 
  HeartHandshake,
  ChefHat,
  Camera
} from 'lucide-react';

export interface FoodTip {
  id: number;
  food: string;
  icon: string;
  title: string;
  tip: string;
  tag: string;
}

export const FOOD_PRESERVATION_TIPS: FoodTip[] = [
  {
    id: 1,
    food: "Hierbas y Espinacas",
    icon: "🥬",
    tag: "Verduras de Hoja",
    title: "El secreto del papel absorbente",
    tip: "Envuelve las hojas secas en papel de cocina antes de guardarlas en un recipiente hermético. El papel absorberá el exceso de humedad, duplicando su vida útil."
  },
  {
    id: 2,
    food: "Aguacates",
    icon: "🥑",
    tag: "Frutas y Grasas",
    title: "Evita que se pongan oscuros",
    tip: "Si usas solo la mitad, guarda la otra mitad con el hueso y junto a un trozo de cebolla morada en un táper cerrado. Los compuestos azufrados de la cebolla frenan la oxidación."
  },
  {
    id: 3,
    food: "Tomates",
    icon: "🍅",
    tag: "Fruta / Hortaliza",
    title: "Mejor fuera del refrigerador",
    tip: "A menos que estén muy maduros, no guardes los tomates en la nevera. El frío intenso desactiva las enzimas aromáticas y arruina su textura haciéndola harinosa."
  },
  {
    id: 4,
    food: "Zanahorias y Apio",
    icon: "🥕",
    tag: "Raíces y Tallos",
    title: "Crujientes por semanas",
    tip: "Córtalos en bastones y sumérgelos en un tarro de cristal con agua fría en la nevera. Cambia el agua cada 3 días y se mantendrán tan crujientes como el primer día."
  },
  {
    id: 5,
    food: "Quesos",
    icon: "🧀",
    tag: "Lácteos",
    title: "Déjalos respirar",
    tip: "Evita el papel film plástico ajustado, ya que atrapa condensación y acelera el moho. Envuélvelos en papel vegetal o encerado de horno para que respiren sin secarse."
  },
  {
    id: 6,
    food: "Patatas y Cebollas",
    icon: "🥔",
    tag: "Tubérculos",
    title: "¡Mantenlas separadas!",
    tip: "Nunca las guardes juntas en el mismo cesto. Las cebollas emiten gas etileno que hace que las patatas broten y se echen a perder con el doble de rapidez."
  },
  {
    id: 7,
    food: "Fresas y Frutos Rojos",
    icon: "🍓",
    tag: "Frutas Delicadas",
    title: "Lávalas solo antes de comer",
    tip: "La humedad es el enemigo número uno de los frutos rojos. Si las lavas antes de meterlas al refrigerador, desarrollarán moho en 24 horas. Guárdalas secas sobre papel."
  },
  {
    id: 8,
    food: "Huevos",
    icon: "🥚",
    tag: "Huevos",
    title: "La puerta no es su mejor lugar",
    tip: "La puerta de la nevera sufre cambios bruscos de temperatura cada vez que la abres. Guarda los huevos en su propio cartón en la balda intermedia para mayor frescura."
  },
  {
    id: 9,
    food: "Champiñones y Setas",
    icon: "🍄",
    tag: "Hongos",
    title: "Bolsa de papel marrón",
    tip: "Sácalos del plástico de la tienda y mételos en una bolsa de papel limpia. El papel absorbe la humedad ambiental y evita que adquieran esa textura viscosa."
  },
  {
    id: 10,
    food: "Plátanos / Bananas",
    icon: "🍌",
    tag: "Fruta",
    title: "Cubre los tallos",
    tip: "Envuelve la corona o unión de los tallos con un pedazo de film transparente. De este punto se escapa la mayor parte del gas de maduración; así durarán hasta 5 días más."
  },
  {
    id: 11,
    food: "Carnes y Aves",
    icon: "🍗",
    tag: "Proteínas",
    title: "Siempre en la balda inferior",
    tip: "El estante de abajo es el punto más frío de la nevera. Además, colocarlas allí en un recipiente hondo evita posibles goteos que contaminen otros alimentos."
  },
  {
    id: 12,
    food: "Pan Artesanal",
    icon: "🍞",
    tag: "Panadería",
    title: "Rebanadas congeladas",
    tip: "No guardes el pan en la nevera porque se pone gomoso. Si no lo vas a comer en 48 horas, córtalo en rebanadas y congélalo; va directo a la tostadora y queda perfecto."
  }
];

const WORKING_STEPS = [
  "Analizando ingredientes e identificando opciones...",
  "Calculando proporciones saludables y control glucémico...",
  "Consultando técnicas culinarias óptimas con Gemini 3.1 Pro...",
  "Creando las instrucciones detalladas paso a paso...",
  "¡Seguimos cocinando los últimos detalles para ti!"
];

interface LoadingWithTipsProps {
  type: 'scanning' | 'generating';
  customTitle?: string;
}

export function LoadingWithTips({ type, customTitle }: LoadingWithTipsProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  // Rotación automática de consejos cada 5.5 segundos
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex(prev => (prev + 1) % FOOD_PRESERVATION_TIPS.length);
    }, 5500);

    return () => clearInterval(tipInterval);
  }, []);

  // Avance de pasos de trabajo cada 4 segundos
  useEffect(() => {
    const stepInterval = setInterval(() => {
      setStepIndex(prev => (prev + 1) % WORKING_STEPS.length);
    }, 4000);

    const timer = setInterval(() => {
      setSecondsElapsed(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(stepInterval);
      clearInterval(timer);
    };
  }, []);

  const currentTip = FOOD_PRESERVATION_TIPS[tipIndex];

  const handlePrevTip = () => {
    setTipIndex(prev => (prev === 0 ? FOOD_PRESERVATION_TIPS.length - 1 : prev - 1));
  };

  const handleNextTip = () => {
    setTipIndex(prev => (prev + 1) % FOOD_PRESERVATION_TIPS.length);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col items-center text-center space-y-6 px-4">
      {/* Icono animado de estado */}
      <div className="relative w-20 h-20">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          className="absolute inset-0 border-4 border-emerald-100 border-t-emerald-600 rounded-full"
        />
        <motion.div
          animate={{ scale: [0.95, 1.05, 0.95] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute inset-0 m-auto w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner"
        >
          {type === 'scanning' ? <Camera size={24} /> : <ChefHat size={24} />}
        </motion.div>
      </div>

      {/* Título y estado en vivo */}
      <div className="space-y-2">
        <h3 className="text-xl md:text-2xl font-extrabold text-stone-900 tracking-tight">
          {customTitle || (type === 'scanning' ? "Examinando foto de tu nevera..." : "Creando tu menú personalizado...")}
        </h3>

        {/* Mensaje de cortesía y paciencia */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-50 border border-amber-200/80 text-amber-900 text-xs font-semibold shadow-xs">
          <Clock size={13} className="text-amber-600 animate-spin" />
          <span>Aún estamos trabajando... ¡Gracias por tu paciencia!</span>
        </div>

        {/* Ticker de paso actual */}
        <p className="text-xs text-stone-500 font-medium flex items-center justify-center gap-1.5 pt-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
          <span>{WORKING_STEPS[stepIndex]}</span>
        </p>
      </div>

      {/* Tarjeta interactiva de Consejos de Conservación */}
      <div className="w-full bg-white rounded-3xl border border-stone-200 p-6 md:p-7 shadow-sm text-left relative overflow-hidden space-y-4">
        {/* Adorno superior */}
        <div className="flex items-center justify-between border-b border-stone-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <Lightbulb size={16} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 block">
                Aprende mientras esperas
              </span>
              <h4 className="text-xs font-bold text-stone-900">
                Consejo de Conservación de Alimentos
              </h4>
            </div>
          </div>

          <span className="text-[11px] font-semibold text-stone-400 bg-stone-100 px-2.5 py-0.5 rounded-full">
            {tipIndex + 1} de {FOOD_PRESERVATION_TIPS.length}
          </span>
        </div>

        {/* Contenido del tip animado */}
        <div className="min-h-[110px] flex items-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTip.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-2 w-full"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{currentTip.icon}</span>
                  <span className="text-sm font-bold text-stone-900">{currentTip.food}</span>
                </div>
                <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-md">
                  {currentTip.tag}
                </span>
              </div>

              <div className="text-xs font-semibold text-emerald-900">
                {currentTip.title}
              </div>

              <p className="text-xs text-stone-600 leading-relaxed">
                {currentTip.tip}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Barra inferior con controles manuales */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs">
          <div className="flex items-center gap-1.5 text-stone-400 text-[11px]">
            <HeartHandshake size={13} className="text-emerald-600" />
            <span>Evita el desperdicio de comida</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handlePrevTip}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
              title="Consejo anterior"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={handleNextTip}
              className="p-1.5 rounded-lg hover:bg-stone-100 text-stone-500 hover:text-stone-800 transition-colors"
              title="Siguiente consejo"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Pequeño pie de página con tiempo activo */}
      <div className="flex items-center gap-2 text-[11px] text-stone-400">
        <Sparkles size={12} className="text-emerald-500" />
        <span>Procesando en vivo con Gemini AI ({secondsElapsed}s)</span>
      </div>
    </div>
  );
}
