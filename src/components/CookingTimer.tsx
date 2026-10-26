import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Bell, 
  Clock, 
  Plus, 
  Minus, 
  Volume2, 
  Check, 
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

interface CookingTimerProps {
  prepTime: string;
  recipeTitle?: string;
}

export function parsePrepTimeToSeconds(prepTimeStr: string): number {
  if (!prepTimeStr) return 15 * 60; // 15 minutos por defecto

  const clean = prepTimeStr.toLowerCase().trim();
  let totalSeconds = 0;

  // Buscar horas (ej: "1 h", "1 hora", "1h 30 min")
  const hourMatch = clean.match(/(\d+)\s*(?:h|hora|horas)/);
  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
  }

  // Buscar minutos (ej: "25 min", "25 minutos", "20m")
  const minMatch = clean.match(/(\d+)\s*(?:m|min|minuto|minutos)/);
  if (minMatch) {
    totalSeconds += parseInt(minMatch[1], 10) * 60;
  }

  // Si solo hay un número suelto (ej: "20")
  if (totalSeconds === 0) {
    const rawNumberMatch = clean.match(/^(\d+)$/);
    if (rawNumberMatch) {
      totalSeconds = parseInt(rawNumberMatch[1], 10) * 60;
    }
  }

  return totalSeconds > 0 ? totalSeconds : 15 * 60;
}

export function CookingTimer({ prepTime, recipeTitle }: CookingTimerProps) {
  const defaultSeconds = parsePrepTimeToSeconds(prepTime);
  const [initialDuration, setInitialDuration] = useState<number>(defaultSeconds);
  const [timeLeft, setTimeLeft] = useState<number>(defaultSeconds);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Actualizar cuando cambie la receta
  useEffect(() => {
    const sec = parsePrepTimeToSeconds(prepTime);
    setInitialDuration(sec);
    setTimeLeft(sec);
    setIsRunning(false);
    setIsCompleted(false);
  }, [prepTime]);

  // Alarma sonora mediante Web Audio API (agradable y 100% compatible sin archivos externos)
  const playAlarmSound = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const playChime = (freq: number, startDelay: number, duration: number) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime + startDelay);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime + startDelay);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + startDelay + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + startDelay);
        osc.stop(audioCtx.currentTime + startDelay + duration);
      };

      // Tono culinario melodioso (D5 -> A5 -> D6)
      playChime(587.33, 0, 0.2);
      playChime(880, 0.22, 0.25);
      playChime(1174.66, 0.48, 0.6);

      // Repetición sutil a los 1.2 segundos
      playChime(880, 1.2, 0.2);
      playChime(1174.66, 1.45, 0.7);
    } catch (e) {
      console.warn("Web Audio API no soportado:", e);
    }
  };

  // Cuenta regresiva
  useEffect(() => {
    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current as NodeJS.Timeout);
            setIsRunning(false);
            setIsCompleted(true);
            playAlarmSound();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, timeLeft]);

  const togglePlay = () => {
    if (isCompleted) {
      // Reiniciar si ya completó
      setTimeLeft(initialDuration);
      setIsCompleted(false);
      setIsRunning(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsCompleted(false);
    setTimeLeft(initialDuration);
  };

  const adjustMinutes = (deltaMinutes: number) => {
    setTimeLeft((prev) => {
      const updated = Math.max(10, prev + deltaMinutes * 60);
      setInitialDuration(updated);
      setIsCompleted(false);
      return updated;
    });
  };

  const setPreset = (minutes: number) => {
    const sec = minutes * 60;
    setInitialDuration(sec);
    setTimeLeft(sec);
    setIsRunning(false);
    setIsCompleted(false);
  };

  // Formato mm:ss o hh:mm:ss
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;

    if (h > 0) {
      return `${h}:${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
    }
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // Porcentaje de progreso
  const progressPercent = initialDuration > 0 
    ? Math.max(0, Math.min(100, ((initialDuration - timeLeft) / initialDuration) * 100))
    : 0;

  return (
    <div className="w-full bg-stone-800/90 border border-white/10 rounded-2xl p-4 text-white shadow-lg backdrop-blur-md transition-all">
      {/* Encabezado del Temporizador */}
      <div className="flex items-center justify-between pb-2 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isRunning ? 'bg-emerald-500 text-white animate-pulse' : 'bg-white/10 text-emerald-400'}`}>
            <Clock size={16} />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400 block">
              Temporizador de Cocina
            </span>
            <span className="text-xs font-semibold text-stone-300">
              Tiempo estimado receta: <strong className="text-white">{prepTime}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {isCompleted && (
            <span className="bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-bounce">
              <Bell size={10} /> ¡Listo!
            </span>
          )}

          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-stone-400 hover:text-white transition-colors"
            title={isMinimized ? "Expandir temporizador" : "Minimizar temporizador"}
          >
            {isMinimized ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
          </button>
        </div>
      </div>

      {/* Contenido Principal / Desplegado */}
      <AnimatePresence>
        {!isMinimized ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="pt-3 space-y-3"
          >
            {/* Reloj Digital Grande con Barra de Progreso */}
            <div className="flex flex-col items-center justify-center py-2 bg-stone-900/60 rounded-xl border border-white/5 relative overflow-hidden">
              {/* Barra de progreso de fondo */}
              <div 
                className="absolute left-0 bottom-0 top-0 bg-emerald-500/15 transition-all duration-1000 ease-linear pointer-events-none"
                style={{ width: `${progressPercent}%` }}
              />

              <div className={`text-4xl md:text-5xl font-mono font-bold tracking-tight relative z-10 transition-colors ${
                isCompleted 
                  ? 'text-emerald-400 animate-pulse' 
                  : timeLeft <= 60 && isRunning 
                    ? 'text-amber-400 animate-pulse' 
                    : 'text-white'
              }`}>
                {formatTime(timeLeft)}
              </div>

              <div className="flex items-center gap-2 mt-1 text-[11px] text-stone-400 relative z-10">
                <span>Total: {formatTime(initialDuration)}</span>
                <span>•</span>
                <span>{isRunning ? 'En marcha...' : isCompleted ? 'Tiempo cumplido' : 'Pausado'}</span>
              </div>
            </div>

            {/* Alerta de tiempo cumplido */}
            {isCompleted && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-semibold p-2.5 rounded-xl flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2">
                  <Bell size={15} className="text-emerald-400 animate-bounce" />
                  <span>¡Tiempo cumplido para tu preparación! Revisa la cocción.</span>
                </div>
                <button
                  onClick={playAlarmSound}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white p-1 rounded-lg transition-colors text-[11px] flex items-center gap-1"
                  title="Reproducir campana"
                >
                  <Volume2 size={12} />
                </button>
              </motion.div>
            )}

            {/* Controles de Acción (Play / Pausa / Reset) */}
            <div className="flex items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => adjustMinutes(-1)}
                  disabled={timeLeft <= 60}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-xs font-semibold flex items-center gap-1 transition-all"
                  title="Restar 1 minuto"
                >
                  <Minus size={12} /> 1m
                </button>
                <button
                  onClick={() => adjustMinutes(1)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 transition-all"
                  title="Sumar 1 minuto"
                >
                  <Plus size={12} /> 1m
                </button>
                <button
                  onClick={() => adjustMinutes(5)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1 transition-all"
                  title="Sumar 5 minutos"
                >
                  <Plus size={12} /> 5m
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleReset}
                  className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 hover:text-white transition-all"
                  title="Reiniciar temporizador"
                >
                  <RotateCcw size={16} />
                </button>

                <button
                  onClick={togglePlay}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95 ${
                    isRunning 
                      ? 'bg-amber-500 hover:bg-amber-600 text-stone-950' 
                      : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20'
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause size={15} />
                      <span>Pausar</span>
                    </>
                  ) : (
                    <>
                      <Play size={15} />
                      <span>{isCompleted ? 'Reiniciar' : 'Iniciar'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Presets rápidos */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-stone-400">
              <span className="text-[10px] uppercase font-bold tracking-wider text-stone-500">Presets:</span>
              <div className="flex gap-1.5">
                {[3, 5, 10, 15].map((m) => (
                  <button
                    key={m}
                    onClick={() => setPreset(m)}
                    className="px-2 py-0.5 rounded-md bg-white/5 hover:bg-white/15 text-stone-300 hover:text-white transition-colors"
                  >
                    {m} min
                  </button>
                ))}
                <button
                  onClick={() => setPreset(defaultSeconds / 60)}
                  className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-colors font-medium"
                  title="Volver al tiempo estimado por la receta"
                >
                  Receta ({prepTime})
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Vista compacta cuando está minimizado */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="pt-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-mono font-bold ${
                isCompleted ? 'text-emerald-400 animate-pulse' : 'text-white'
              }`}>
                {formatTime(timeLeft)}
              </span>
              <span className="text-[11px] text-stone-400">
                {isRunning ? 'Corriendo...' : isCompleted ? 'Completado' : 'Pausado'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePlay}
                className={`p-2 rounded-xl text-xs font-bold transition-all ${
                  isRunning 
                    ? 'bg-amber-500 text-stone-950' 
                    : 'bg-emerald-500 text-white'
                }`}
              >
                {isRunning ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                onClick={handleReset}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-stone-300 transition-colors"
              >
                <RotateCcw size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
