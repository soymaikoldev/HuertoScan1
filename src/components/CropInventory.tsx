import React, { useState } from "react";
import { Edit2, Eye, Trash2, Power, BookOpen, Save, X, PlusCircle, ShoppingBag, Sparkles } from "lucide-react";
import { Crop } from "../types";
import { motion, AnimatePresence } from "motion/react";

// Helper component to resolve image load properly without multiple overlays
const CropImageView: React.FC<{ src?: string; alt: string; category?: string }> = ({ src, alt, category }) => {
  const [hasError, setHasError] = useState(!src);

  React.useEffect(() => {
    setHasError(!src);
  }, [src]);

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {!hasError && src ? (
        <img
          key={src}
          src={src}
          alt={alt}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center font-bold text-[24px] pointer-events-none">
          {category === "Hierbas" ? "🌿" : category === "Medicinales" ? "🌱" : category === "Frutas" ? "🍓" : "🍅"}
        </div>
      )}
    </div>
  );
};

interface CropInventoryProps {
  crops: Crop[];
  onToggleSale: (id: string) => void;
  onUpdateCrop: (id: string, updatedFields: Partial<Crop>) => void;
  onDeleteCrop: (id: string) => void;
}

export const CropInventory: React.FC<CropInventoryProps> = ({
  crops,
  onToggleSale,
  onUpdateCrop,
  onDeleteCrop,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPriceSol, setEditPriceSol] = useState(0);
  const [editPriceUsdc, setEditPriceUsdc] = useState(0);
  const [editPriceUsdt, setEditPriceUsdt] = useState(0);
  const [editStock, setEditStock] = useState(0);

  // Technical sheet modal states
  const [activeSheetCrop, setActiveSheetCrop] = useState<Crop | null>(null);

  const startEditing = (crop: Crop) => {
    setEditingId(crop.id);
    setEditPriceSol(crop.priceSol);
    setEditPriceUsdc(crop.priceUsdc);
    setEditPriceUsdt(crop.priceUsdt);
    setEditStock(crop.stock);
  };

  const cancelEditing = () => {
    setEditingId(null);
  };

  const saveEditing = (id: string) => {
    onUpdateCrop(id, {
      priceSol: Number(editPriceSol),
      priceUsdc: Number(editPriceUsdc),
      priceUsdt: Number(editPriceUsdt),
      stock: Math.max(0, parseInt(String(editStock)) || 0),
    });
    setEditingId(null);
  };

  return (
    <div id="crop-inventory-list" className="space-y-4">
      {crops.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <BookOpen className="w-8 h-8 text-slate-350 mx-auto mb-2" />
          <p className="text-xs font-semibold">Tu huerto está vacío por ahora</p>
          <p className="text-[10.5px] mt-0.5 max-w-xs mx-auto text-slate-400">
            Escanea tu primera planta con el selector de imágenes de la izquierda para comenzar a poblar tu biblioteca.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {crops.map((crop) => {
            const isEditing = editingId === crop.id;

            return (
              <motion.div
                key={crop.id}
                id={`crop-card-${crop.id}`}
                layout
                className={`bg-white border rounded-2xl p-4.5 transition-all shadow-xs relative overflow-hidden ${
                  crop.isForSale ? "border-emerald-100" : "border-slate-100"
                }`}
              >
                {/* Visual Status Indicator Belt */}
                {crop.isForSale && (
                  <div className="absolute top-0 right-0 bg-emerald-500 text-white font-bold text-[9.5px] uppercase py-0.5 px-3 rounded-bl-xl tracking-wider select-none flex items-center gap-1 shrink-0">
                    <ShoppingBag className="w-3 h-3" />
                    Puesto en Venta
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  {/* Aspect Crop Image Placeholder */}
                  <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 shrink-0 overflow-hidden flex items-center justify-center relative shadow-inner select-none">
                    <CropImageView src={crop.image} alt={crop.name} category={crop.category} />
                  </div>

                  {/* Main texts details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h5 className="font-extrabold text-slate-800 text-[15px] truncate">
                        {crop.name}
                      </h5>
                      <span className="text-[10px] text-slate-400 italic font-mono truncate max-w-[130px] sm:max-w-none">
                        ({crop.scientificName})
                      </span>
                      <span
                        className={`text-[9.5px] font-bold px-2 py-0.5 rounded ${
                          crop.difficulty === "Fácil"
                            ? "bg-emerald-50 text-emerald-700"
                            : crop.difficulty === "Moderado"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-red-50 text-red-700"
                        }`}
                      >
                        {crop.difficulty}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-500 line-clamp-1">
                      {crop.description}
                    </p>

                    {/* Stock Prices Display block */}
                    {!isEditing ? (
                      <div className="flex items-center gap-3 text-[11px] text-slate-600 font-mono mt-1 w-full flex-wrap sm:flex-nowrap">
                        <span className="bg-slate-150/70 p-1 rounded">
                          Precios: <strong className="text-emerald-700">{crop.priceSol} SOL</strong> / <strong>${crop.priceUsdc} USDC</strong>
                        </span>
                        <span className="text-slate-400 select-none">•</span>
                        <span>
                          Stock: <strong className="text-slate-700">{crop.stock} raciones</strong>
                        </span>
                      </div>
                    ) : (
                      /* Inline Editor Panel */
                      <div className="bg-slate-50/70 p-3 rounded-xl border border-slate-200 mt-2 space-y-2.5 w-full">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          Editar Tarifas de Cosecha & Inventario
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                          <label className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 font-mono">SOL Price</span>
                            <input
                              type="number"
                              step="0.001"
                              value={editPriceSol}
                              onChange={(e) => setEditPriceSol(Number(e.target.value))}
                              className="bg-white border text-[11.5px] border-slate-200 px-2 py-1 rounded font-mono font-bold focus:outline-emerald-500"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 font-mono">USDC Price</span>
                            <input
                              type="number"
                              step="0.05"
                              value={editPriceUsdc}
                              onChange={(e) => setEditPriceUsdc(Number(e.target.value))}
                              className="bg-white border text-[11.5px] border-slate-200 px-2 py-1 rounded font-mono font-bold focus:outline-emerald-500"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 font-mono">USDT Price</span>
                            <input
                              type="number"
                              step="0.05"
                              value={editPriceUsdt}
                              onChange={(e) => setEditPriceUsdt(Number(e.target.value))}
                              className="bg-white border text-[11.5px] border-slate-200 px-2 py-1 rounded font-mono font-bold focus:outline-emerald-500"
                            />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-[10px] text-slate-400 font-mono">Suministro</span>
                            <input
                              type="number"
                              value={editStock}
                              onChange={(e) => setEditStock(Number(e.target.value))}
                              className="bg-white border text-[11.5px] border-slate-200 px-2 py-1 rounded font-bold focus:outline-emerald-500"
                            />
                          </label>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Operational buttons group */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                    {!isEditing ? (
                      <>
                        {/* Toggle On Sale state */}
                        <button
                          id={`btn-crop-sale-toggle-${crop.id}`}
                          onClick={() => onToggleSale(crop.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            crop.isForSale
                              ? "bg-slate-100 hover:bg-slate-250 text-slate-700"
                              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          {crop.isForSale ? "Pausar Venta" : "Poner en Venta"}
                        </button>

                        <button
                          id={`btn-crop-sheet-view-${crop.id}`}
                          onClick={() => setActiveSheetCrop(crop)}
                          className="bg-slate-100 hover:bg-slate-150 text-slate-600 hover:text-slate-800 p-2 rounded-lg text-xs font-medium flex items-center gap-1 transition"
                          title="Ficha Técnica Botánica"
                        >
                          <BookOpen className="w-4 h-4 text-emerald-700" />
                          Ficha Técnica
                        </button>

                        <button
                          id={`btn-crop-edit-trigger-${crop.id}`}
                          onClick={() => startEditing(crop)}
                          className="text-slate-400 hover:text-slate-700 p-2 rounded-lg hover:bg-slate-50 transition"
                          title="Editar Precios / Stock"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          id={`btn-crop-delete-${crop.id}`}
                          onClick={() => onDeleteCrop(crop.id)}
                          className="text-slate-400 hover:text-red-650 p-2 rounded-lg hover:bg-red-50 transition"
                          title="Eliminar de mi huerto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    ) : (
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          id="btn-crop-edit-save"
                          onClick={() => saveEditing(crop.id)}
                          className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 justify-center shadow-xs"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Guardar
                        </button>
                        <button
                          id="btn-crop-edit-cancel"
                          onClick={cancelEditing}
                          className="flex-1 sm:flex-initial bg-slate-150 text-slate-600 hover:bg-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 justify-center"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Beautiful High Fidelity Botanical Sheet Pop-up Modal */}
      <AnimatePresence>
        {activeSheetCrop && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden outline-hidden flex flex-col max-h-[90vh]"
            >
              {/* Header block with visual theme */}
              <div className="bg-emerald-950 text-white p-5 pb-8 relative">
                <div className="absolute top-0 right-0 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl" />
                <button
                  id="btn-botanical-modal-close"
                  onClick={() => setActiveSheetCrop(null)}
                  className="absolute top-3 right-3 text-emerald-200 hover:text-white hover:bg-white/10 p-1.5 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-3">
                  <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-300">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-400 font-bold tracking-widest uppercase block">
                      FICHA TÉCNICA BOTÁNICA
                    </span>
                    <h4 className="font-extrabold text-xl leading-snug">{activeSheetCrop.name}</h4>
                    <p className="text-xs text-emerald-300 italic font-mono">{activeSheetCrop.scientificName}</p>
                  </div>
                </div>
              </div>

              {/* Scrolling Content Details */}
              <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-650 flex-1 scroll-smooth">
                {/* 1. Atributos Clave */}
                <div className="flex flex-wrap gap-2 pt-1">
                  <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Dificultad</span>
                    <span
                      className={`font-semibold text-[11.5px] ${
                        activeSheetCrop.difficulty === "Fácil"
                          ? "text-emerald-700"
                          : activeSheetCrop.difficulty === "Moderado"
                          ? "text-amber-700"
                          : "text-red-700"
                      }`}
                    >
                      {activeSheetCrop.difficulty}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex-1 min-w-[120px]">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Categoría</span>
                    <span className="font-semibold text-[11.5px] text-slate-700">
                      {activeSheetCrop.category || "General"}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-xl flex-1 min-w-[150px] max-w-full">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block mb-0.5">Origen Geográfico</span>
                    <span className="font-semibold text-[11.5px] text-slate-700 block whitespace-normal break-words" title={activeSheetCrop.origin}>
                      {activeSheetCrop.origin}
                    </span>
                  </div>

                  {activeSheetCrop.detectedElement && (
                    <div className="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-xl">
                      <span className="text-[9px] text-amber-500 font-bold uppercase block mb-0.5">Estructura</span>
                      <span className="font-semibold text-[11.5px] text-amber-800 flex items-center gap-1">
                        🌿 {activeSheetCrop.detectedElement}
                      </span>
                    </div>
                  )}
                </div>

                {/* 2. Descripción */}
                <div className="space-y-1">
                  <h6 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 leading-none select-none">
                    Descripción del Cultivo
                  </h6>
                  <p className="text-[12px] leading-relaxed text-slate-700 bg-slate-50/40 p-3 rounded-2xl border border-slate-100">
                    {activeSheetCrop.description}
                  </p>
                </div>

                {/* 3. Utilidades y Beneficios */}
                <div className="space-y-1">
                  <h6 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 leading-none select-none">
                    Para qué sirve / Usos y Propiedades
                  </h6>
                  <div className="bg-emerald-50/30 border border-emerald-100/50 text-slate-700 p-3.5 rounded-2xl leading-relaxed italic text-[11.5px]">
                    🔬 {activeSheetCrop.uses}
                  </div>
                </div>

                {/* 4. Parámetros de Riego y Luz */}
                <div className="space-y-2">
                  <h6 className="font-bold text-[10px] uppercase tracking-wider text-slate-400 leading-none select-none">
                    Requerimientos de Cultivo
                  </h6>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gradient-to-tr from-sky-50 to-white border border-sky-100/50 p-3 rounded-2xl">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">💧</span>
                        <span className="font-bold text-[10px] text-sky-850 uppercase tracking-wide">
                          Riego Sugerido
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-700 leading-relaxed font-semibold">
                        {activeSheetCrop.watering || (activeSheetCrop.difficulty === "Fácil" ? "Frecuente (2-3 veces/semana)" : "Moderado (Suelo seco entre riegos)")}
                      </p>
                    </div>

                    <div className="bg-gradient-to-tr from-amber-50 to-white border border-amber-100/50 p-3 rounded-2xl">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-sm">☀️</span>
                        <span className="font-bold text-[10px] text-amber-850 uppercase tracking-wide">
                          Clima y Exposición Solar
                        </span>
                      </div>
                      <p className="text-[11.5px] text-slate-700 leading-relaxed font-semibold">
                        {activeSheetCrop.sunlight || (activeSheetCrop.difficulty === "Fácil" || activeSheetCrop.category === "Hierbas" ? "Media Sombra / Sol Directo" : "Sol Directo (+6 horas)")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 5. Suelo y Época de Siembra */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-gradient-to-tr from-stone-50 to-white border border-stone-200 p-3 rounded-2xl">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm">🟫</span>
                      <span className="font-bold text-[10px] text-stone-800 uppercase tracking-wide">
                        Tipo de Suelo / Sustrato
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-700 leading-relaxed font-semibold">
                      {activeSheetCrop.soilType || "Suelo suelto bien drenado, rico en humus orgánico."}
                    </p>
                  </div>

                  <div className="bg-gradient-to-tr from-emerald-50/70 to-white border border-emerald-100 p-3 rounded-2xl">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      <span className="text-sm">📅</span>
                      <span className="font-bold text-[10px] text-emerald-850 uppercase tracking-wide">
                        Época de Siembra
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-700 leading-relaxed font-semibold">
                      {activeSheetCrop.idealSowingSeason || "De principios de Primavera a mediados de Otoño."}
                    </p>
                  </div>
                </div>

                {/* 6. Tiempo de Cosecha & pH */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl">
                    <span className="font-bold text-[9.5px] text-slate-400 uppercase tracking-wider block mb-1">
                      ⏱️ Tiempo Cosecha
                    </span>
                    <p className="font-semibold text-[12px] text-slate-700">
                      {activeSheetCrop.harvestTimeDays || "60 a 85 días"}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-150 p-3 rounded-2xl">
                    <span className="font-bold text-[9.5px] text-slate-400 uppercase tracking-wider block mb-1">
                      🧪 pH Recomendado
                    </span>
                    <p className="font-semibold text-[12px] text-slate-700 font-mono">
                      {activeSheetCrop.phRecommended || "6.0 - 7.0"}
                    </p>
                  </div>
                </div>

                {/* 7. Asociación y Protección avanzada */}
                <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🤝</span>
                      <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                        Asociación de Cultivos beneficiosa
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-755 leading-relaxed font-medium">
                      {activeSheetCrop.companionPlants || "No especificado."}
                    </p>
                  </div>

                  <div className="border-t border-slate-200/50 pt-3 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">🛡️</span>
                      <span className="font-bold text-[10px] text-slate-500 uppercase tracking-wide">
                        Protección Ecológica de Plagas
                      </span>
                    </div>
                    <p className="text-[11.5px] text-slate-755 leading-relaxed font-medium">
                      {activeSheetCrop.pestPrevention || "No especificado."}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer controls */}
              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
                <button
                  id="btn-botanical-modal-close-footer"
                  onClick={() => setActiveSheetCrop(null)}
                  className="bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs px-5 py-2 rounded-xl shadow-xs transition"
                >
                  Cerrar Ficha Técnica
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
