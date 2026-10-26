import { useState, useRef } from 'react';
import { 
  Camera, 
  Upload, 
  ChefHat, 
  Clock, 
  Flame, 
  Filter, 
  ShoppingCart, 
  ChevronRight, 
  ChevronLeft, 
  Volume2, 
  VolumeX,
  Plus, 
  CheckCircle2, 
  X, 
  RotateCcw, 
  UtensilsCrossed, 
  ArrowLeft,
  HeartPulse,
  Sparkles,
  Copy,
  Check,
  Wheat,
  Activity,
  Trash2,
  Image as ImageIcon,
  Download,
  Share2,
  MessageCircle,
  History,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './utils/cn';
import { 
  identifyIngredients, 
  generateRecipes, 
  speakStep, 
  speakWithBrowser,
  stopSpeech,
  type Recipe 
} from './services/geminiService';
import { LoadingWithTips } from './components/LoadingWithTips';
import { 
  generateShoppingListImage, 
  downloadShoppingListImage,
  shareViaWhatsApp,
  type GeneratedImageResult 
} from './utils/generateShoppingListImage';
import { ShoppingListImageModal } from './components/ShoppingListImageModal';
import { CookingTimer } from './components/CookingTimer';

const DIETARY_CATEGORIES = {
  diabetes: [
    { id: 'Apto para Diabéticos', label: 'Apto para Diabéticos', desc: 'Bajo índice glucémico y control de glucosa' },
    { id: 'Diabetes Tipo 2 (Control Glucémico)', label: 'Diabetes Tipo 2', desc: 'Foco en fibra y estabilización de insulina' },
    { id: 'Bajo en Carbohidratos (Low-Carb)', label: 'Bajo en Carbohidratos', desc: 'Menor carga de hidratos de carbono' },
    { id: 'Keto (Cetogénica)', label: 'Keto / Cetogénica', desc: 'Grasas saludables y mínimo carbohidrato' },
    { id: 'Alto en Fibra', label: 'Alto en Fibra', desc: 'Ralentiza la absorción del azúcar' },
  ],
  general: [
    { id: 'Vegetariano', label: 'Vegetariano', desc: 'Sin carne animal' },
    { id: 'Vegano', label: 'Vegano', desc: '100% de origen vegetal' },
    { id: 'Sin Gluten', label: 'Sin Gluten (Celíaco)', desc: 'Libre de trigo, cebada y centeno' },
    { id: 'Mediterránea', label: 'Dieta Mediterránea', desc: 'Rica en aceite de oliva y vegetales' },
    { id: 'Bajo en Sodio', label: 'Bajo en Sodio', desc: 'Cardiosaludable e hipertensión' },
    { id: 'Paleo', label: 'Paleo', desc: 'Alimentos naturales no procesados' },
  ]
};

const EJEMPLOS_NEVERA = [
  "Huevos", "Espinacas", "Pechuga de pollo", "Tomates", 
  "Queso fresco", "Aguacate", "Cebolla", "Ajo", "Calabacín", "Aceite de oliva"
];

export interface HistoryRecipeItem {
  recipe: Recipe;
  timestamp: number;
  isCooked?: boolean;
}

export default function App() {
  const [ingredients, setIngredients] = useState<string[]>(EJEMPLOS_NEVERA.slice(0, 6));
  const [newIngredientInput, setNewIngredientInput] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [shoppingList, setShoppingList] = useState<{ id: string; name: string; completed: boolean }[]>([
    { id: '1', name: 'Aceite de oliva virgen extra', completed: false },
    { id: '2', name: 'Albahaca fresca', completed: false }
  ]);
  const [selectedRestrictions, setSelectedRestrictions] = useState<string[]>(['Apto para Diabéticos']);
  const [isScanning, setIsScanning] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeRecipe, setActiveRecipe] = useState<Recipe | null>(null);
  const [cookingStep, setCookingStep] = useState(0);
  const [activeTab, setActiveTab] = useState<'fridge' | 'recipes' | 'history' | 'shopping'>('fridge');
  const [historyTabFilter, setHistoryTabFilter] = useState<'history' | 'favorites'>('history');
  
  const [recipeHistory, setRecipeHistory] = useState<HistoryRecipeItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('culinary_recipe_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [favoriteRecipes, setFavoriteRecipes] = useState<Recipe[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem('culinary_favorite_recipes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedShopping, setCopiedShopping] = useState(false);
  const [shoppingImageResult, setShoppingImageResult] = useState<GeneratedImageResult | null>(null);
  const [isShoppingImageModalOpen, setIsShoppingImageModalOpen] = useState(false);
  const [isGeneratingShoppingImage, setIsGeneratingShoppingImage] = useState(false);
  const [newShoppingItemInput, setNewShoppingItemInput] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsScanning(true);
    const mimeType = file.type || "image/jpeg";
    const reader = new FileReader();

    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const detected = await identifyIngredients(base64, mimeType);
        setIngredients(prev => Array.from(new Set([...prev, ...detected])));
        setActiveTab('fridge');
      } catch (error) {
        console.error("Fallo al escanear nevera:", error);
      } finally {
        setIsScanning(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddManualIngredient = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = newIngredientInput.trim();
    if (!clean) return;

    if (!ingredients.some(i => i.toLowerCase() === clean.toLowerCase())) {
      setIngredients(prev => [...prev, clean]);
    }
    setNewIngredientInput('');
  };

  const handleLoadSampleFridge = () => {
    setIngredients(EJEMPLOS_NEVERA);
  };

  const handleGenerateRecipes = async () => {
    if (ingredients.length === 0) return;
    setIsGenerating(true);
    setActiveTab('recipes');
    try {
      const results = await generateRecipes(ingredients, selectedRestrictions);
      setRecipes(results);
    } catch (error) {
      console.error("Fallo al generar recetas:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleRestriction = (resId: string) => {
    setSelectedRestrictions(prev => 
      prev.includes(resId) ? prev.filter(r => r !== resId) : [...prev, resId]
    );
  };

  const addToShoppingList = (itemName: string) => {
    if (!shoppingList.some(item => item.name.toLowerCase() === itemName.toLowerCase())) {
      setShoppingList(prev => [
        ...prev, 
        { id: Math.random().toString(36).substring(2, 9), name: itemName, completed: false }
      ]);
    }
  };

  const toggleShoppingItem = (id: string) => {
    setShoppingList(prev => prev.map(item => 
      item.id === id ? { ...item, completed: !item.completed } : item
    ));
  };

  const removeShoppingItem = (id: string) => {
    setShoppingList(prev => prev.filter(item => item.id !== id));
  };

  const copyShoppingList = () => {
    if (shoppingList.length === 0) return;
    const text = "🛒 *Lista de Compras de CulinaryAI:*\n" + 
      shoppingList.map(item => `• ${item.completed ? '☑' : '☐'} ${item.name}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedShopping(true);
    setTimeout(() => setCopiedShopping(false), 2000);
  };

  const handleOpenShoppingImageModal = async () => {
    if (shoppingList.length === 0) return;
    setIsGeneratingShoppingImage(true);
    try {
      const result = await generateShoppingListImage(shoppingList);
      setShoppingImageResult(result);
      setIsShoppingImageModalOpen(true);
    } catch (e) {
      console.error("Error al generar imagen de compras:", e);
    } finally {
      setIsGeneratingShoppingImage(false);
    }
  };

  const handleDirectDownloadImage = async () => {
    if (shoppingList.length === 0) return;
    try {
      const result = await generateShoppingListImage(shoppingList);
      downloadShoppingListImage(result.dataUrl);
    } catch (e) {
      console.error("Error en descarga directa de imagen:", e);
    }
  };

  const handleDirectWhatsApp = () => {
    if (shoppingList.length === 0) return;
    shareViaWhatsApp(shoppingList);
  };

  const handleAddShoppingItemManual = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const name = newShoppingItemInput.trim();
    if (!name) return;
    addToShoppingList(name);
    setNewShoppingItemInput('');
  };

  const addToHistory = (recipe: Recipe, cooked = false) => {
    setRecipeHistory(prev => {
      const existing = prev.find(item => item.recipe.id === recipe.id);
      const wasCooked = existing ? existing.isCooked : false;

      const newItem: HistoryRecipeItem = {
        recipe,
        timestamp: Date.now(),
        isCooked: cooked || wasCooked
      };

      const filtered = prev.filter(item => item.recipe.id !== recipe.id);
      const updated = [newItem, ...filtered].slice(0, 5); // Estrictamente las últimas 5 recetas

      try {
        localStorage.setItem('culinary_recipe_history', JSON.stringify(updated));
      } catch (e) {
        console.warn("No se pudo guardar historial en localStorage", e);
      }
      return updated;
    });
  };

  const handleOpenRecipe = (recipe: Recipe, cooked = false) => {
    addToHistory(recipe, cooked);
    setActiveRecipe(recipe);
    setCookingStep(0);
  };

  const toggleFavorite = (recipe: Recipe) => {
    setFavoriteRecipes(prev => {
      const exists = prev.some(r => r.id === recipe.id);
      const updated = exists 
        ? prev.filter(r => r.id !== recipe.id)
        : [recipe, ...prev];

      try {
        localStorage.setItem('culinary_favorite_recipes', JSON.stringify(updated));
      } catch (e) {
        console.warn("No se pudo guardar favoritas en localStorage", e);
      }
      return updated;
    });
  };

  const isFavorite = (recipeId: string) => {
    return favoriteRecipes.some(r => r.id === recipeId);
  };

  const clearHistory = () => {
    setRecipeHistory([]);
    try {
      localStorage.removeItem('culinary_recipe_history');
    } catch (e) {
      console.warn(e);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 60) return 'Hace un momento';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `Hace ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    const diffDays = Math.floor(diffHours / 24);
    return `Hace ${diffDays} d`;
  };

  const stopAllAudio = () => {
    if (activeAudioRef.current) {
      activeAudioRef.current.pause();
      activeAudioRef.current = null;
    }
    stopSpeech();
    setIsSpeaking(false);
  };

  const handleSpeak = async (text: string) => {
    if (isSpeaking) {
      stopAllAudio();
      return;
    }

    setIsSpeaking(true);
    // Intentar primero con audio de Gemini TTS
    const audioUrl = await speakStep(text);
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      activeAudioRef.current = audio;
      audio.onended = () => {
        setIsSpeaking(false);
        activeAudioRef.current = null;
      };
      audio.onerror = () => {
        // Si falla el audio codificado, recurrir a la síntesis nativa en español
        speakWithBrowser(text, () => setIsSpeaking(false));
      };
      audio.play().catch(() => {
        speakWithBrowser(text, () => setIsSpeaking(false));
      });
    } else {
      // Fallback inmediato con voz del navegador
      const played = speakWithBrowser(text, () => setIsSpeaking(false));
      if (!played) {
        setIsSpeaking(false);
      }
    }
  };

  const isDiabeticFilterActive = selectedRestrictions.some(r => 
    r.toLowerCase().includes('diabét') || 
    r.toLowerCase().includes('diabet') || 
    r.toLowerCase().includes('glucém') ||
    r.toLowerCase().includes('carbohidrat')
  );

  return (
    <div className="flex h-screen bg-stone-50 overflow-hidden text-stone-900">
      {/* Barra Lateral / Sidebar */}
      <aside className="w-80 bg-white border-r border-stone-200 flex flex-col hidden lg:flex shadow-sm">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-emerald-400 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <ChefHat size={22} />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-stone-900 flex items-center gap-1.5">
                CulinaryAI
              </h1>
              <p className="text-xs text-brand-700 font-semibold flex items-center gap-1">
                <Sparkles size={11} /> Asistente de Cocina
              </p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Sección Especial: Dietas para Diabéticos */}
          <section className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-emerald-800">
                <HeartPulse size={18} className="text-emerald-600 animate-pulse" />
                <h3 className="text-sm font-bold">Dietas para Diabéticos</h3>
              </div>
              <span className="text-[10px] bg-emerald-200/70 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                Salud
              </span>
            </div>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Recetas con bajo índice glucémico (IG), control de carbohidratos netos y ricas en fibra.
            </p>
            <div className="space-y-1.5 pt-1">
              {DIETARY_CATEGORIES.diabetes.map(item => {
                const isSelected = selectedRestrictions.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleRestriction(item.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-start gap-2",
                      isSelected
                        ? "bg-emerald-600 text-white font-semibold shadow-sm"
                        : "bg-white/80 text-emerald-950 hover:bg-white border border-emerald-100"
                    )}
                  >
                    <div className={cn(
                      "w-3.5 h-3.5 rounded mt-0.5 flex items-center justify-center border text-[9px]",
                      isSelected ? "border-white bg-white/20 text-white" : "border-emerald-300 bg-white"
                    )}>
                      {isSelected && "✓"}
                    </div>
                    <div>
                      <div className="font-medium">{item.label}</div>
                      <div className={cn("text-[10px]", isSelected ? "text-emerald-100" : "text-emerald-600/80")}>
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Filtros Generales */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
              <Filter size={13} /> Otras Preferencias
            </h3>
            <div className="space-y-1.5">
              {DIETARY_CATEGORIES.general.map(item => {
                const isSelected = selectedRestrictions.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => toggleRestriction(item.id)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs transition-all flex items-center justify-between",
                      isSelected
                        ? "bg-brand-50 text-brand-800 font-semibold border border-brand-200"
                        : "text-stone-600 hover:bg-stone-100/80"
                    )}
                  >
                    <span>{item.label}</span>
                    {isSelected && <span className="text-brand-600 font-bold text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </section>

          {/* Mini Lista de Compras Rápida */}
          <section className="border-t border-stone-100 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <ShoppingCart size={13} /> Compras ({shoppingList.length})
              </h3>
              {shoppingList.length > 0 && (
                <button 
                  onClick={() => setActiveTab('shopping')} 
                  className="text-[11px] font-semibold text-brand-600 hover:underline"
                >
                  Ver todo
                </button>
              )}
            </div>
            {shoppingList.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No hay ingredientes pendientes.</p>
            ) : (
              <ul className="space-y-1">
                {shoppingList.slice(0, 3).map((item) => (
                  <li 
                    key={item.id} 
                    className="flex items-center justify-between py-1 text-xs text-stone-600 group"
                  >
                    <span className={cn("truncate pr-2", item.completed && "line-through text-stone-400")}>
                      • {item.name}
                    </span>
                    <button 
                      onClick={() => removeShoppingItem(item.id)}
                      className="text-stone-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
                {shoppingList.length > 3 && (
                  <p className="text-[11px] text-stone-400 italic pt-1">
                    +{shoppingList.length - 3} ingredientes más...
                  </p>
                )}
              </ul>
            )}
          </section>

          {/* Mini sección de Historial y Favoritas en Barra Lateral */}
          <section className="border-t border-stone-100 pt-4 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <History size={13} /> Historial ({recipeHistory.length}/5)
              </h3>
              {recipeHistory.length > 0 && (
                <button 
                  onClick={() => {
                    setActiveTab('history');
                    setHistoryTabFilter('history');
                  }} 
                  className="text-[11px] font-semibold text-brand-600 hover:underline"
                >
                  Ver todo
                </button>
              )}
            </div>
            {recipeHistory.length === 0 ? (
              <p className="text-xs text-stone-400 italic">No hay recetas vistas aún.</p>
            ) : (
              <ul className="space-y-1.5">
                {recipeHistory.slice(0, 3).map((item) => (
                  <li 
                    key={item.recipe.id} 
                    onClick={() => handleOpenRecipe(item.recipe)}
                    className="flex items-center justify-between py-1 text-xs text-stone-700 hover:text-emerald-700 cursor-pointer group transition-colors"
                  >
                    <span className="truncate pr-2 font-medium">
                      {item.isCooked ? '👨‍🍳 ' : '👁️ '} {item.recipe.title}
                    </span>
                    {isFavorite(item.recipe.id) && (
                      <Star size={12} className="text-amber-500 fill-amber-500 shrink-0" />
                    )}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Cabecera de Navegación */}
        <header className="bg-white border-b border-stone-200 px-4 md:px-8 py-3.5 flex items-center justify-between gap-4 z-10 shadow-xs">
          <div className="flex items-center gap-2 md:gap-8 overflow-x-auto">
            {/* Logo móvil */}
            <div className="flex lg:hidden items-center gap-2 text-brand-600 pr-2 border-r border-stone-200">
              <ChefHat size={20} />
              <span className="font-bold text-sm">CulinaryAI</span>
            </div>

            <nav className="flex gap-2 md:gap-5">
              {[
                { id: 'fridge', label: 'Mi Nevera', icon: UtensilsCrossed, count: ingredients.length },
                { id: 'recipes', label: 'Recetas Sugeridas', icon: ChefHat, count: recipes.length },
                { id: 'history', label: 'Historial', icon: History, count: recipeHistory.length },
                { id: 'shopping', label: 'Lista de Compras', icon: ShoppingCart, count: shoppingList.length }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      "px-3 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all flex items-center gap-2 relative shrink-0",
                      isActive 
                        ? "text-brand-700 bg-brand-50/80 shadow-xs" 
                        : "text-stone-500 hover:text-stone-800 hover:bg-stone-100/60"
                    )}
                  >
                    <Icon size={16} className={isActive ? "text-brand-600" : "text-stone-400"} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded-full font-bold",
                        isActive ? "bg-brand-600 text-white" : "bg-stone-200 text-stone-600"
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-brand-600 hover:bg-brand-700 active:scale-95 text-white px-3.5 md:px-4 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition-all shadow-sm shadow-brand-500/20"
            >
              <Camera size={16} />
              <span className="hidden sm:inline">Escanear Nevera</span>
              <span className="sm:hidden">Foto</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
          </div>
        </header>

        {/* Notificación si el modo diabético está activo */}
        {isDiabeticFilterActive && (
          <div className="bg-gradient-to-r from-emerald-500 via-teal-600 to-emerald-600 text-white px-4 md:px-8 py-2 text-xs font-medium flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <HeartPulse size={15} />
              <span>
                <strong>Modo Control de Diabetes Activo:</strong> Las recetas priorizan bajo índice glucémico, carbohidratos netos reducidos y alto contenido en fibra.
              </span>
            </div>
            <span className="hidden sm:inline-block bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
              Bajo IG
            </span>
          </div>
        )}

        {/* Área de Visualización */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <AnimatePresence mode="wait">
            {/* PESTAÑA 1: MI NEVERA */}
            {activeTab === 'fridge' && (
              <motion.div
                key="fridge"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-4xl mx-auto space-y-6"
              >
                {/* Banner de bienvenida */}
                <div className="text-center space-y-2 py-2">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight">
                    ¿Qué ingredientes tienes en tu nevera?
                  </h2>
                  <p className="text-stone-500 text-sm max-w-xl mx-auto">
                    Toma una foto o añade tus ingredientes manualmente. CulinaryAI creará recetas saludables adaptadas a tu despensa y a tus necesidades de glucosa y salud.
                  </p>
                </div>

                {/* Acciones principales de escaneo y carga */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50/80 rounded-2xl p-5 flex items-center gap-4 transition-all group text-left shadow-xs"
                  >
                    <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <Camera size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm group-hover:text-emerald-700">Tomar o subir foto de la nevera</h4>
                      <p className="text-xs text-stone-500 mt-0.5">Gemini 3.1 Pro reconocerá automáticamente los alimentos.</p>
                    </div>
                  </button>

                  <button 
                    onClick={handleLoadSampleFridge}
                    className="border border-stone-200 hover:border-stone-300 bg-white hover:bg-stone-50 rounded-2xl p-5 flex items-center gap-4 transition-all text-left shadow-xs"
                  >
                    <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md">
                      <Sparkles size={22} />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-900 text-sm">Cargar nevera de prueba saludable</h4>
                      <p className="text-xs text-stone-500 mt-0.5">Prueba la app al instante con ingredientes aptos para diabéticos.</p>
                    </div>
                  </button>
                </div>

                {/* Tarjeta de Ingredientes */}
                <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
                  {/* Formulario para añadir ingrediente manual */}
                  <form onSubmit={handleAddManualIngredient} className="flex gap-2">
                    <input 
                      type="text"
                      value={newIngredientInput}
                      onChange={(e) => setNewIngredientInput(e.target.value)}
                      placeholder="Escribe un ingrediente (ej. Aguacate, Calabacín, Nueces, Yogur griego...)"
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!newIngredientInput.trim()}
                      className="bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus size={16} /> Añadir
                    </button>
                  </form>

                  {/* Lista de tags de ingredientes */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-2">
                        <span>Ingredientes detectados y añadidos</span>
                        <span className="bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-bold">
                          {ingredients.length}
                        </span>
                      </div>
                      {ingredients.length > 0 && (
                        <button 
                          onClick={() => setIngredients([])}
                          className="text-xs text-stone-400 hover:text-red-500 transition-colors flex items-center gap-1"
                        >
                          <Trash2 size={13} /> Vaciar todo
                        </button>
                      )}
                    </div>

                    {ingredients.length === 0 ? (
                      <div className="w-full py-12 border-2 border-dashed border-stone-200 rounded-xl flex flex-col items-center justify-center text-stone-400 text-center p-4">
                        <UtensilsCrossed size={36} className="mb-2 opacity-30" />
                        <p className="text-sm font-medium text-stone-600">No hay ingredientes en tu lista aún.</p>
                        <p className="text-xs text-stone-400 mt-1">Sube una foto de tu nevera o escribe arriba los que tengas a mano.</p>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-1">
                        {ingredients.map((ing, idx) => (
                          <span 
                            key={idx} 
                            className="bg-stone-100 hover:bg-stone-200/80 text-stone-800 border border-stone-200/60 pl-3 pr-2 py-1.5 rounded-xl text-xs md:text-sm font-medium flex items-center gap-2 transition-colors"
                          >
                            <span>{ing}</span>
                            <button 
                              onClick={() => setIngredients(prev => prev.filter((_, i) => i !== idx))}
                              className="text-stone-400 hover:text-red-500 hover:bg-white rounded-full p-0.5 transition-colors"
                              title="Eliminar ingrediente"
                            >
                              <X size={13} />
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Filtros seleccionados rápidos en móvil */}
                  <div className="lg:hidden bg-stone-50 p-4 rounded-xl space-y-2 border border-stone-200/60">
                    <div className="text-xs font-bold text-stone-700 flex items-center gap-1.5">
                      <HeartPulse size={14} className="text-emerald-600" />
                      <span>Dietas y Filtros Activos ({selectedRestrictions.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {DIETARY_CATEGORIES.diabetes.map(d => (
                        <button
                          key={d.id}
                          onClick={() => toggleRestriction(d.id)}
                          className={cn(
                            "px-2.5 py-1 rounded-lg text-xs font-medium transition-all",
                            selectedRestrictions.includes(d.id)
                              ? "bg-emerald-600 text-white"
                              : "bg-white text-stone-600 border border-stone-200"
                          )}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Botón de Generar Recetas */}
                  <div className="pt-2">
                    <button 
                      disabled={ingredients.length === 0 || isGenerating}
                      onClick={handleGenerateRecipes}
                      className="w-full bg-gradient-to-r from-brand-600 via-emerald-600 to-brand-700 text-white rounded-2xl py-4 px-6 flex items-center justify-center gap-3 font-bold text-base hover:brightness-105 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-brand-500/25"
                    >
                      {isGenerating ? (
                        <>
                          <RotateCcw className="animate-spin" size={20} />
                          <span>Gemini está analizando y creando recetas...</span>
                        </>
                      ) : (
                        <>
                          <ChefHat size={22} />
                          <span>Generar Recetas Saludables ({ingredients.length} ingredientes)</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {/* PESTAÑA 2: RECETAS */}
            {activeTab === 'recipes' && (
              <motion.div
                key="recipes"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-6xl mx-auto space-y-6"
              >
                {/* Cabecera de recetas */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2">
                  <div>
                    <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Recetas Recomendadas</h2>
                    <p className="text-stone-500 text-xs md:text-sm">
                      Platos personalizados calculados según tus ingredientes y pautas de nutrición.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerateRecipes}
                    disabled={isGenerating || ingredients.length === 0}
                    className="border border-stone-200 bg-white hover:bg-stone-50 px-4 py-2 rounded-xl text-xs font-semibold text-stone-700 flex items-center gap-2 transition-all shadow-xs"
                  >
                    <RotateCcw size={14} className={isGenerating ? "animate-spin" : ""} />
                    <span>Regenerar Recetas</span>
                  </button>
                </div>

                {isGenerating ? (
                  <div className="py-6">
                    <LoadingWithTips type="generating" />
                  </div>
                ) : recipes.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
                    <div className="w-16 h-16 rounded-full bg-brand-50 text-brand-600 flex items-center justify-center mx-auto">
                      <UtensilsCrossed size={28} />
                    </div>
                    <h3 className="text-base font-bold text-stone-900">Aún no has generado recetas</h3>
                    <p className="text-stone-500 text-xs">
                      Añade ingredientes en la pestaña "Mi Nevera" y presiona "Generar Recetas Saludables".
                    </p>
                    <button
                      onClick={() => setActiveTab('fridge')}
                      className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors inline-block"
                    >
                      Ir a Mi Nevera
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                    {recipes.map((recipe) => (
                      <motion.div
                        key={recipe.id}
                        whileHover={{ y: -4 }}
                        className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group cursor-pointer"
                        onClick={() => handleOpenRecipe(recipe)}
                      >
                        <div className="h-44 bg-gradient-to-r from-stone-800 to-stone-900 relative overflow-hidden">
                          <img 
                            src={`https://picsum.photos/seed/${encodeURIComponent(recipe.title)}/700/400`} 
                            alt={recipe.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                          
                          {/* Badges superiores */}
                          <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {recipe.diabeticFriendly && (
                                <span className="bg-emerald-600/95 backdrop-blur-md text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                  <HeartPulse size={11} /> Apto Diabéticos
                                </span>
                              )}
                              {recipe.glycemicIndex && (
                                <span className="bg-stone-900/80 backdrop-blur-md text-emerald-300 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wider border border-emerald-500/30">
                                  IG {recipe.glycemicIndex}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(recipe);
                                }}
                                className={cn(
                                  "p-1.5 rounded-lg backdrop-blur-md transition-all",
                                  isFavorite(recipe.id)
                                    ? "bg-amber-400 text-stone-900 shadow-xs"
                                    : "bg-stone-900/60 text-white/80 hover:text-white hover:bg-stone-900/90"
                                )}
                                title={isFavorite(recipe.id) ? "Quitar de favoritas" : "Marcar como favorita"}
                              >
                                <Star size={13} className={isFavorite(recipe.id) ? "fill-stone-900" : ""} />
                              </button>

                              <span className={cn(
                                "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-md",
                                recipe.difficulty === 'Fácil' ? "bg-emerald-500/90 text-white" :
                                recipe.difficulty === 'Media' ? "bg-amber-500/90 text-white" :
                                "bg-red-500/90 text-white"
                              )}>
                                {recipe.difficulty}
                              </span>
                            </div>
                          </div>

                          {/* Título en la imagen */}
                          <div className="absolute bottom-3 left-3 right-3 text-white">
                            <h3 className="text-base font-bold leading-tight drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                              {recipe.title}
                            </h3>
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                            {recipe.description}
                          </p>

                          {/* Nota glucémica para diabéticos si existe */}
                          {recipe.glycemicNote && (
                            <div className="bg-emerald-50 border border-emerald-100/80 rounded-xl p-2.5 text-[11px] text-emerald-900 flex items-start gap-2">
                              <Activity size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                              <span className="leading-tight">{recipe.glycemicNote}</span>
                            </div>
                          )}

                          {/* Métricas Nutricionales y de Tiempo */}
                          <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-100 text-center">
                            <div className="bg-stone-50 rounded-xl py-2 px-1">
                              <div className="flex items-center justify-center gap-1 text-[11px] text-stone-500">
                                <Clock size={12} className="text-stone-400" /> Tiempo
                              </div>
                              <div className="text-xs font-bold text-stone-800 mt-0.5">{recipe.prepTime}</div>
                            </div>

                            <div className="bg-stone-50 rounded-xl py-2 px-1">
                              <div className="flex items-center justify-center gap-1 text-[11px] text-stone-500">
                                <Flame size={12} className="text-orange-500" /> Calorías
                              </div>
                              <div className="text-xs font-bold text-stone-800 mt-0.5">{recipe.calories} kcal</div>
                            </div>

                            <div className="bg-emerald-50/60 rounded-xl py-2 px-1 border border-emerald-100/60">
                              <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-700 font-medium">
                                <Wheat size={12} className="text-emerald-600" /> Carbos
                              </div>
                              <div className="text-xs font-extrabold text-emerald-900 mt-0.5">{recipe.carbs || 8}g</div>
                            </div>
                          </div>

                          {/* Botón de acción */}
                          <button className="w-full py-2.5 bg-stone-900 group-hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs">
                            <span>Ver Receta y Cocinar Paso a Paso</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* PESTAÑA HISTORIAL Y FAVORITAS */}
            {activeTab === 'history' && (
              <motion.div
                key="history"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-6xl mx-auto space-y-6"
              >
                {/* Cabecera del Historial */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-stone-100">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-2xl font-bold text-stone-900 tracking-tight">Historial de Recetas</h2>
                      <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                        {recipeHistory.length}/5 recientes
                      </span>
                    </div>
                    <p className="text-stone-500 text-xs md:text-sm mt-0.5">
                      Últimas 5 recetas cocinadas o consultadas, con acceso rápido a tus favoritas guardadas.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Filtro entre historial reciente y favoritas */}
                    <div className="bg-stone-100 p-1 rounded-2xl flex items-center gap-1 border border-stone-200/60">
                      <button
                        onClick={() => setHistoryTabFilter('history')}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all",
                          historyTabFilter === 'history'
                            ? "bg-white text-stone-900 shadow-xs"
                            : "text-stone-500 hover:text-stone-800"
                        )}
                      >
                        <History size={13} />
                        <span>Últimas 5 ({recipeHistory.length})</span>
                      </button>

                      <button
                        onClick={() => setHistoryTabFilter('favorites')}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all",
                          historyTabFilter === 'favorites'
                            ? "bg-amber-400 text-stone-900 shadow-xs"
                            : "text-stone-500 hover:text-stone-800"
                        )}
                      >
                        <Star size={13} className={historyTabFilter === 'favorites' ? "fill-stone-900" : ""} />
                        <span>Favoritas ({favoriteRecipes.length})</span>
                      </button>
                    </div>

                    {historyTabFilter === 'history' && recipeHistory.length > 0 && (
                      <button
                        onClick={clearHistory}
                        className="text-stone-400 hover:text-red-500 p-2 rounded-xl text-xs flex items-center gap-1 transition-colors"
                        title="Vaciar historial de recetas vistas"
                      >
                        <Trash2 size={15} />
                        <span className="hidden md:inline">Vaciar</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Contenido según el filtro */}
                {historyTabFilter === 'history' ? (
                  recipeHistory.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
                      <div className="w-16 h-16 rounded-full bg-stone-100 text-stone-400 flex items-center justify-center mx-auto">
                        <History size={28} />
                      </div>
                      <h3 className="text-base font-bold text-stone-900">Tu historial está vacío</h3>
                      <p className="text-stone-500 text-xs leading-relaxed max-w-xs mx-auto">
                        Cuando abras cualquier receta o completes su preparación en el modo paso a paso, se guardará aquí automáticamente (hasta 5 recetas recientes).
                      </p>
                      <button
                        onClick={() => setActiveTab('fridge')}
                        className="bg-brand-600 text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-brand-700 transition-colors inline-block"
                      >
                        Descubrir Recetas en Mi Nevera
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                      {recipeHistory.map((item) => {
                        const { recipe, timestamp, isCooked } = item;
                        return (
                          <motion.div
                            key={recipe.id}
                            whileHover={{ y: -4 }}
                            className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group cursor-pointer"
                            onClick={() => handleOpenRecipe(recipe)}
                          >
                            <div className="h-44 bg-gradient-to-r from-stone-800 to-stone-900 relative overflow-hidden">
                              <img 
                                src={`https://picsum.photos/seed/${encodeURIComponent(recipe.title)}/700/400`} 
                                alt={recipe.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                                referrerPolicy="no-referrer"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                              {/* Badges superiores con estado de cocinado y tiempo relativo */}
                              <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                                <div className="flex flex-wrap gap-1.5 items-center">
                                  {isCooked ? (
                                    <span className="bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                      <ChefHat size={12} /> ¡Cocinada!
                                    </span>
                                  ) : (
                                    <span className="bg-stone-900/80 backdrop-blur-md text-stone-200 px-2.5 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1">
                                      <Clock size={11} /> {formatRelativeTime(timestamp)}
                                    </span>
                                  )}

                                  {recipe.diabeticFriendly && (
                                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                                      Diabéticos
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleFavorite(recipe);
                                    }}
                                    className={cn(
                                      "p-1.5 rounded-lg backdrop-blur-md transition-all",
                                      isFavorite(recipe.id)
                                        ? "bg-amber-400 text-stone-900 shadow-xs"
                                        : "bg-stone-900/60 text-white/80 hover:text-white hover:bg-stone-900/90"
                                    )}
                                    title={isFavorite(recipe.id) ? "Quitar de favoritas" : "Marcar como favorita"}
                                  >
                                    <Star size={13} className={isFavorite(recipe.id) ? "fill-stone-900" : ""} />
                                  </button>

                                  <span className={cn(
                                    "text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider backdrop-blur-md",
                                    recipe.difficulty === 'Fácil' ? "bg-emerald-500/90 text-white" :
                                    recipe.difficulty === 'Media' ? "bg-amber-500/90 text-white" :
                                    "bg-red-500/90 text-white"
                                  )}>
                                    {recipe.difficulty}
                                  </span>
                                </div>
                              </div>

                              <div className="absolute bottom-3 left-3 right-3 text-white">
                                <h3 className="text-base font-bold leading-tight drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                                  {recipe.title}
                                </h3>
                              </div>
                            </div>

                            <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                              <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                                {recipe.description}
                              </p>

                              {recipe.glycemicNote && (
                                <div className="bg-emerald-50 border border-emerald-100/80 rounded-xl p-2.5 text-[11px] text-emerald-900 flex items-start gap-2">
                                  <Activity size={14} className="text-emerald-600 shrink-0 mt-0.5" />
                                  <span className="leading-tight">{recipe.glycemicNote}</span>
                                </div>
                              )}

                              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-100 text-center">
                                <div className="bg-stone-50 rounded-xl py-2 px-1">
                                  <div className="flex items-center justify-center gap-1 text-[11px] text-stone-500">
                                    <Clock size={12} className="text-stone-400" /> Tiempo
                                  </div>
                                  <div className="text-xs font-bold text-stone-800 mt-0.5">{recipe.prepTime}</div>
                                </div>

                                <div className="bg-stone-50 rounded-xl py-2 px-1">
                                  <div className="flex items-center justify-center gap-1 text-[11px] text-stone-500">
                                    <Flame size={12} className="text-orange-500" /> Calorías
                                  </div>
                                  <div className="text-xs font-bold text-stone-800 mt-0.5">{recipe.calories} kcal</div>
                                </div>

                                <div className="bg-emerald-50/60 rounded-xl py-2 px-1 border border-emerald-100/60">
                                  <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-700 font-medium">
                                    <Wheat size={12} className="text-emerald-600" /> Carbos
                                  </div>
                                  <div className="text-xs font-extrabold text-emerald-900 mt-0.5">{recipe.carbs || 8}g</div>
                                </div>
                              </div>

                              <button className="w-full py-2.5 bg-stone-900 group-hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs">
                                <span>Volver a Cocinar Paso a Paso</span>
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* VISTA DE FAVORITAS */
                  favoriteRecipes.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-stone-200 p-12 text-center max-w-lg mx-auto shadow-sm space-y-4">
                      <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto">
                        <Star size={28} />
                      </div>
                      <h3 className="text-base font-bold text-stone-900">Aún no tienes recetas favoritas</h3>
                      <p className="text-stone-500 text-xs leading-relaxed max-w-xs mx-auto">
                        Marca cualquier receta con la estrella ⭐ para guardarla en esta sección permanente y acceder a ella en cualquier momento.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                      {favoriteRecipes.map((recipe) => (
                        <motion.div
                          key={recipe.id}
                          whileHover={{ y: -4 }}
                          className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col group cursor-pointer"
                          onClick={() => handleOpenRecipe(recipe)}
                        >
                          <div className="h-44 bg-gradient-to-r from-stone-800 to-stone-900 relative overflow-hidden">
                            <img 
                              src={`https://picsum.photos/seed/${encodeURIComponent(recipe.title)}/700/400`} 
                              alt={recipe.title}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                              referrerPolicy="no-referrer"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                              <div className="flex flex-wrap gap-1.5">
                                <span className="bg-amber-400 text-stone-950 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-sm">
                                  <Star size={11} className="fill-stone-950" /> Favorita
                                </span>
                                {recipe.diabeticFriendly && (
                                  <span className="bg-emerald-600/90 text-white px-2 py-0.5 rounded-md text-[10px] font-bold uppercase">
                                    Diabéticos
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleFavorite(recipe);
                                }}
                                className="p-1.5 rounded-lg bg-amber-400 text-stone-900 shadow-xs"
                                title="Quitar de favoritas"
                              >
                                <Star size={13} className="fill-stone-900" />
                              </button>
                            </div>

                            <div className="absolute bottom-3 left-3 right-3 text-white">
                              <h3 className="text-base font-bold leading-tight drop-shadow-sm group-hover:text-emerald-300 transition-colors">
                                {recipe.title}
                              </h3>
                            </div>
                          </div>

                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                              {recipe.description}
                            </p>

                            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-stone-100 text-center">
                              <div className="bg-stone-50 rounded-xl py-2 px-1">
                                <div className="flex items-center justify-center gap-1 text-[11px] text-stone-500">
                                  <Clock size={12} className="text-stone-400" /> Tiempo
                                </div>
                                <div className="text-xs font-bold text-stone-800 mt-0.5">{recipe.prepTime}</div>
                              </div>

                              <div className="bg-stone-50 rounded-xl py-2 px-1">
                                <div className="flex items-center justify-center gap-1 text-[11px] text-stone-500">
                                  <Flame size={12} className="text-orange-500" /> Calorías
                                </div>
                                <div className="text-xs font-bold text-stone-800 mt-0.5">{recipe.calories} kcal</div>
                              </div>

                              <div className="bg-emerald-50/60 rounded-xl py-2 px-1 border border-emerald-100/60">
                                <div className="flex items-center justify-center gap-1 text-[11px] text-emerald-700 font-medium">
                                  <Wheat size={12} className="text-emerald-600" /> Carbos
                                </div>
                                <div className="text-xs font-extrabold text-emerald-900 mt-0.5">{recipe.carbs || 8}g</div>
                              </div>
                            </div>

                            <button className="w-full py-2.5 bg-stone-900 group-hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs">
                              <span>Cocinar Receta Favorita</span>
                              <ChevronRight size={14} />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )
                )}
              </motion.div>
            )}

            {/* PESTAÑA 3: LISTA DE COMPRAS */}
            {activeTab === 'shopping' && (
              <motion.div
                key="shopping"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="max-w-2xl mx-auto space-y-6"
              >
                <div className="bg-white rounded-3xl border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
                  {/* Cabecera y acciones */}
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-5 border-b border-stone-100">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-stone-900">Lista de Compras</h2>
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2.5 py-0.5 rounded-full">
                          {shoppingList.length} artículos
                        </span>
                      </div>
                      <p className="text-xs text-stone-500 mt-0.5">
                        Guarda como imagen, descarga, comparte en redes o envía directo por WhatsApp.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                      {/* Botón principal: Guardar / Compartir como Imagen */}
                      <button
                        onClick={handleOpenShoppingImageModal}
                        disabled={shoppingList.length === 0 || isGeneratingShoppingImage}
                        className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shadow-emerald-600/20 active:scale-95"
                        title="Crear tarjeta visual en alta resolución"
                      >
                        <ImageIcon size={15} />
                        <span>{isGeneratingShoppingImage ? "Generando..." : "Guardar como Imagen"}</span>
                      </button>

                      {/* Botón Descarga Directa */}
                      <button
                        onClick={handleDirectDownloadImage}
                        disabled={shoppingList.length === 0}
                        className="border border-stone-200 hover:bg-stone-50 disabled:opacity-40 text-stone-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Descargar PNG directamente"
                      >
                        <Download size={15} />
                        <span className="hidden sm:inline">Descargar</span>
                      </button>

                      {/* Botón WhatsApp */}
                      <button
                        onClick={handleDirectWhatsApp}
                        disabled={shoppingList.length === 0}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200/80 disabled:opacity-40 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                        title="Enviar lista a WhatsApp"
                      >
                        <MessageCircle size={15} className="text-emerald-600" />
                        <span>WhatsApp</span>
                      </button>

                      {/* Botón Copiar Texto */}
                      <button
                        onClick={copyShoppingList}
                        disabled={shoppingList.length === 0}
                        className="border border-stone-200 hover:bg-stone-50 text-stone-700 px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
                        title="Copiar lista de texto para compartir"
                      >
                        {copiedShopping ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        <span>{copiedShopping ? '¡Copiado!' : 'Copiar'}</span>
                      </button>
                    </div>
                  </div>

                  {/* Formulario rápido para añadir artículo a la lista de compras */}
                  <form onSubmit={handleAddShoppingItemManual} className="flex gap-2">
                    <input 
                      type="text"
                      value={newShoppingItemInput}
                      onChange={(e) => setNewShoppingItemInput(e.target.value)}
                      placeholder="Añadir artículo manual a la lista (ej. Aceite de oliva, Chía, Aguacates...)"
                      className="flex-1 bg-stone-50 border border-stone-200 rounded-xl px-4 py-2 text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all"
                    />
                    <button 
                      type="submit"
                      disabled={!newShoppingItemInput.trim()}
                      className="bg-stone-900 hover:bg-stone-800 disabled:opacity-40 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors shrink-0"
                    >
                      <Plus size={15} /> Añadir
                    </button>
                  </form>

                  {shoppingList.length === 0 ? (
                    <div className="text-center py-12 space-y-3">
                      <div className="w-14 h-14 bg-stone-50 rounded-full flex items-center justify-center mx-auto text-stone-300">
                        <ShoppingCart size={24} />
                      </div>
                      <p className="text-sm font-medium text-stone-700">Tu lista de compras está vacía.</p>
                      <p className="text-xs text-stone-400 max-w-xs mx-auto">
                        Cuando consultes una receta con ingredientes faltantes, podrás agregarlos con un solo clic.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {shoppingList.map((item) => (
                        <div 
                          key={item.id} 
                          className={cn(
                            "flex items-center justify-between p-3.5 rounded-xl transition-all border",
                            item.completed 
                              ? "bg-stone-50/70 border-stone-200/50 opacity-60" 
                              : "bg-white hover:bg-stone-50 border-stone-200"
                          )}
                        >
                          <button 
                            onClick={() => toggleShoppingItem(item.id)}
                            className="flex items-center gap-3 text-left flex-1"
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-lg border flex items-center justify-center transition-all",
                              item.completed 
                                ? "bg-emerald-600 border-emerald-600 text-white" 
                                : "border-stone-300 hover:border-emerald-500 bg-white"
                            )}>
                              {item.completed && <Check size={13} />}
                            </div>
                            <span className={cn(
                              "text-sm font-medium",
                              item.completed ? "line-through text-stone-400" : "text-stone-800"
                            )}>
                              {item.name}
                            </span>
                          </button>
                          
                          <button 
                            onClick={() => removeShoppingItem(item.id)}
                            className="text-stone-300 hover:text-red-500 p-1 rounded-lg transition-colors"
                            title="Eliminar de la lista"
                          >
                            <X size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {shoppingList.length > 0 && (
                    <div className="pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                      <span>{shoppingList.filter(i => i.completed).length} de {shoppingList.length} completados</span>
                      <button 
                        onClick={() => setShoppingList([])}
                        className="text-stone-400 hover:text-red-500 transition-colors"
                      >
                        Vaciar lista completa
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Modal / Modo Cocina "Paso a Paso" con Voz */}
      <AnimatePresence>
        {activeRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-2 sm:p-4 md:p-8"
          >
            <div className="bg-white rounded-[2rem] w-full max-w-5xl max-h-[92vh] overflow-y-auto shadow-2xl border border-stone-200 relative flex flex-col">
              {/* Botón de volver / cerrar */}
              <button 
                onClick={() => {
                  stopAllAudio();
                  setActiveRecipe(null);
                  setCookingStep(0);
                }}
                className="absolute top-5 right-5 z-20 p-2.5 bg-stone-100 hover:bg-stone-200 rounded-full text-stone-700 transition-colors shadow-xs"
                title="Cerrar receta"
              >
                <X size={20} />
              </button>

              <div className="p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Columna Izquierda: Información, Ingredientes y Notas de Salud */}
                <div className="lg:col-span-6 space-y-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex flex-wrap gap-2">
                        {activeRecipe.diabeticFriendly && (
                          <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                            <HeartPulse size={12} /> Apto para Diabéticos
                          </span>
                        )}
                        {activeRecipe.dietaryTags.map(tag => (
                          <span key={tag} className="bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full text-[11px] font-semibold">
                            {tag}
                          </span>
                        ))}
                      </div>

                      <button
                        onClick={() => toggleFavorite(activeRecipe)}
                        className={cn(
                          "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs",
                          isFavorite(activeRecipe.id)
                            ? "bg-amber-400 text-stone-900 shadow-amber-300/40"
                            : "bg-stone-100 hover:bg-stone-200 text-stone-700"
                        )}
                        title={isFavorite(activeRecipe.id) ? "Quitar de favoritas" : "Marcar como favorita"}
                      >
                        <Star size={13} className={isFavorite(activeRecipe.id) ? "fill-stone-900" : ""} />
                        <span>{isFavorite(activeRecipe.id) ? "En Favoritas" : "Añadir a Favoritas"}</span>
                      </button>
                    </div>

                    <h1 className="text-2xl md:text-3xl font-extrabold text-stone-900 tracking-tight leading-snug">
                      {activeRecipe.title}
                    </h1>
                    <p className="text-sm text-stone-600 leading-relaxed">
                      {activeRecipe.description}
                    </p>
                  </div>

                  {/* Ficha para Diabéticos */}
                  {activeRecipe.glycemicNote && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
                      <div className="flex items-center gap-2 text-emerald-800 text-xs font-bold uppercase tracking-wider">
                        <Activity size={16} className="text-emerald-600" />
                        <span>Información de Control Glucémico</span>
                      </div>
                      <p className="text-xs text-emerald-900 leading-relaxed font-medium">
                        {activeRecipe.glycemicNote}
                      </p>
                    </div>
                  )}

                  {/* Métricas rápidas */}
                  <div className="grid grid-cols-3 gap-3 py-4 border-y border-stone-100 text-center">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Tiempo</div>
                      <div className="text-sm font-extrabold text-stone-900 mt-0.5">{activeRecipe.prepTime}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Calorías</div>
                      <div className="text-sm font-extrabold text-stone-900 mt-0.5">{activeRecipe.calories} kcal</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Carbohidratos</div>
                      <div className="text-sm font-extrabold text-emerald-700 mt-0.5">{activeRecipe.carbs || 6}g</div>
                    </div>
                  </div>

                  {/* Lista de Ingredientes de la Receta */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-base font-bold text-stone-900">Ingredientes necesarios</h3>
                      <span className="text-xs text-stone-400">
                        {activeRecipe.ingredients.filter(i => !i.isMissing).length} en nevera
                      </span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {activeRecipe.ingredients.map((ing, idx) => (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between p-3 rounded-xl bg-stone-50 border border-stone-100 text-xs md:text-sm"
                        >
                          <div className="flex items-center gap-2.5">
                            {ing.isMissing ? (
                              <div className="w-2.5 h-2.5 bg-amber-500 rounded-full shrink-0" title="Faltante en tu nevera" />
                            ) : (
                              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                            )}
                            <span className={cn("font-medium", ing.isMissing ? "text-stone-600" : "text-stone-900")}>
                              <strong>{ing.amount}</strong> {ing.name}
                            </span>
                          </div>

                          {ing.isMissing && (
                            <button 
                              onClick={() => addToShoppingList(ing.name)}
                              className="text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors shrink-0"
                            >
                              <Plus size={12} /> Comprar
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Modo Cocina con Letras Grandes y Voz */}
                <div className="lg:col-span-6 bg-stone-900 rounded-[1.8rem] p-6 md:p-8 text-white flex flex-col justify-between shadow-xl min-h-[420px]">
                  {/* Encabezado del paso */}
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div>
                      <span className="text-xs uppercase tracking-widest text-emerald-400 font-bold">Modo Manos Libres</span>
                      <h3 className="text-lg font-bold">
                        Paso {cookingStep + 1} de {activeRecipe.steps.length}
                      </h3>
                    </div>

                    {/* Botón de Voz / Read-Aloud */}
                    <button 
                      onClick={() => handleSpeak(activeRecipe.steps[cookingStep])}
                      className={cn(
                        "px-4 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-2 shadow-md",
                        isSpeaking 
                          ? "bg-red-500 text-white animate-pulse" 
                          : "bg-emerald-500 hover:bg-emerald-600 text-white"
                      )}
                      title={isSpeaking ? "Detener voz" : "Escuchar paso en voz alta"}
                    >
                      {isSpeaking ? (
                        <>
                          <VolumeX size={16} />
                          <span>Pausar</span>
                        </>
                      ) : (
                        <>
                          <Volume2 size={16} />
                          <span>Leer paso</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Texto Grande del Paso (optimizado para leer a distancia mientras cocinas) */}
                  <div className="py-8 flex items-center justify-center my-auto min-h-[180px]">
                    <motion.div 
                      key={cookingStep}
                      initial={{ opacity: 0, x: 15 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="text-xl md:text-2xl font-medium leading-relaxed text-stone-100 text-center"
                    >
                      "{activeRecipe.steps[cookingStep]}"
                    </motion.div>
                  </div>

                  {/* Temporizador de Cocina Integrado Basado en la Receta */}
                  <div className="my-2">
                    <CookingTimer 
                      prepTime={activeRecipe.prepTime} 
                      recipeTitle={activeRecipe.title} 
                    />
                  </div>

                  {/* Navegación y progreso */}
                  <div className="space-y-4 pt-4 border-t border-white/10">
                    {/* Barra de progreso visual de pasos */}
                    <div className="flex gap-1.5">
                      {activeRecipe.steps.map((_, idx) => (
                        <div 
                          key={idx} 
                          onClick={() => {
                            stopAllAudio();
                            setCookingStep(idx);
                          }}
                          className={cn(
                            "h-1.5 flex-1 rounded-full cursor-pointer transition-all",
                            cookingStep === idx ? "bg-emerald-400" :
                            idx < cookingStep ? "bg-emerald-700" : "bg-white/20"
                          )} 
                          title={`Ir al paso ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <div className="flex items-center justify-between gap-4">
                      <button 
                        disabled={cookingStep === 0}
                        onClick={() => {
                          stopAllAudio();
                          setCookingStep(prev => prev - 1);
                        }}
                        className="px-4 py-3 bg-white/10 hover:bg-white/20 disabled:opacity-30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                      >
                        <ChevronLeft size={18} /> Anterior
                      </button>
                      
                      <span className="text-xs text-white/50 font-medium">
                        {cookingStep + 1} / {activeRecipe.steps.length}
                      </span>

                      {cookingStep === activeRecipe.steps.length - 1 ? (
                        <button 
                          onClick={() => {
                            stopAllAudio();
                            addToHistory(activeRecipe, true);
                            setActiveRecipe(null);
                            setCookingStep(0);
                          }}
                          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/30"
                        >
                          <Check size={18} /> ¡Plato Listo!
                        </button>
                      ) : (
                        <button 
                          onClick={() => {
                            stopAllAudio();
                            setCookingStep(prev => prev + 1);
                          }}
                          className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/30"
                        >
                          Siguiente <ChevronRight size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pantalla de carga / Escaneo con Consejos de Conservación */}
      <AnimatePresence>
        {isScanning && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-stone-900/70 backdrop-blur-md flex flex-col items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-stone-50 rounded-3xl p-6 md:p-8 max-w-xl w-full shadow-2xl border border-stone-200"
            >
              <LoadingWithTips 
                type="scanning" 
                customTitle="Analizando foto de tu nevera..." 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal de Exportación y Compartir Lista de Compras como Imagen */}
      <ShoppingListImageModal
        isOpen={isShoppingImageModalOpen}
        onClose={() => setIsShoppingImageModalOpen(false)}
        imageResult={shoppingImageResult}
        items={shoppingList}
      />
    </div>
  );
}
