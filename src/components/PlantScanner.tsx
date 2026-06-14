import React, { useState, useRef } from "react";
import { Upload, Camera, AlertCircle, RefreshCw, Leaf } from "lucide-react";
import { Crop } from "../types";
import { motion } from "motion/react";

interface PlantScannerProps {
  onCropIdentified: (crop: Crop) => void;
}

export const PlantScanner: React.FC<PlantScannerProps> = ({ onCropIdentified }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'camera'>('upload');
  const [isScanning, setIsScanning] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [scanStepMessage, setScanStepMessage] = useState("");
  const [scanProgress, setScanProgress] = useState(0);
  const [scannedResult, setScannedResult] = useState<Crop | null>(null);
  const [backendScanMethod, setBackendScanMethod] = useState("");
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraErr, setCameraErr] = useState("");
  const [selectedTargetElement, setSelectedTargetElement] = useState<string>("Auto-detectar");
  const [apiKeyWarning, setApiKeyWarning] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Play scanner animations and trigger identification api
  const triggerScanApi = async (bodyPayload: any) => {
    setIsScanning(true);
    setScannedResult(null);

    // Simulated staggered educational states
    const steps = [
      { prg: 15, msg: "Iniciando escáner óptico de clorofila..." },
      { prg: 35, msg: "Consultando banco botánico de Gemini AI..." },
      { prg: 60, msg: "Identificando compuestos bioactivos, origen y taxones..." },
      { prg: 85, msg: "Estableciendo tasa de cambio y precios sugeridos en Solana Pay..." },
      { prg: 100, msg: "Finalizando metadatos del cultivo..." }
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 800));
      setScanProgress(step.prg);
      setScanStepMessage(step.msg);
    }

    try {
      const res = await fetch("/api/scan-plant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bodyPayload,
          targetElement: selectedTargetElement,
        }),
      });
      const resultData = await res.json();

      if (resultData.success && resultData.data) {
        const cropRes: Crop = {
          id: `crop-${Date.now()}`,
          name: resultData.data.name,
          scientificName: resultData.data.scientificName,
          origin: resultData.data.origin,
          uses: resultData.data.uses,
          description: resultData.data.description,
          difficulty: resultData.data.difficulty,
          image: resultData.data.image || "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=300",
          priceSol: resultData.data.suggestedPriceSol || 0.05,
          priceUsdc: resultData.data.suggestedPriceUsdc || 2.0,
          priceUsdt: resultData.data.suggestedPriceUsdt || 2.0,
          stock: 6,
          isForSale: true,
          category: resultData.data.category,
          watering: resultData.data.watering,
          sunlight: resultData.data.sunlight,
          idealSowingSeason: resultData.data.idealSowingSeason,
          harvestTimeDays: resultData.data.harvestTimeDays,
          soilType: resultData.data.soilType,
          phRecommended: resultData.data.phRecommended,
          companionPlants: resultData.data.companionPlants,
          pestPrevention: resultData.data.pestPrevention,
          detectedElement: resultData.data.detectedElement,
        };

        setScannedResult(cropRes);
        setBackendScanMethod(resultData.method || "Gemini AI Link");
        onCropIdentified(cropRes);
        if (resultData.warning) {
          setApiKeyWarning(resultData.warning);
        } else {
          setApiKeyWarning("");
        }
      } else {
        throw new Error(resultData.error || "Falla en escaneo de cultivo");
      }
    } catch (err: any) {
      console.error(err);
      // Fallback
      alert("Hubo un contratiempo interpretando la planta. Se recurrió al modo de simulación.");
    } finally {
      setIsScanning(false);
    }
  };

  const resizeImageBase64 = (base64Str: string, mimeType: string = "image/jpeg"): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxWidth = 320;
        const maxHeight = 320;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL(mimeType, 0.75));
        } else {
          resolve(base64Str);
        }
      };
      img.onerror = () => {
        resolve(base64Str);
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFileAndScan(e.target.files[0]);
    }
  };

  const processFileAndScan = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const parentBase64 = reader.result as string;
      const targetMimeType = file.type || "image/jpeg";
      const compressedBase64 = await resizeImageBase64(parentBase64, targetMimeType);
      triggerScanApi({
        base64Image: compressedBase64,
        mimeType: targetMimeType,
        isPresetSeed: false,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFileAndScan(e.dataTransfer.files[0]);
    }
  };

  const startCamera = async () => {
    setCameraErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCameraErr("No se pudo conectar a la cámara de tu dispositivo. Usando demostración simulada.");
      console.warn(err);
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      let width = videoRef.current.videoWidth || 640;
      let height = videoRef.current.videoHeight || 480;
      const maxDim = 320;
      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        const base64 = canvas.toDataURL("image/jpeg", 0.75);
        stopCamera();
        triggerScanApi({
          base64Image: base64,
          mimeType: "image/jpeg",
          isPresetSeed: false,
        });
      }
    } else {
      alert("No se pudo iniciar la cámara o capturar la foto.");
    }
  };

  const handleTabChange = (tab: 'upload' | 'camera') => {
    setActiveTab(tab);
    if (tab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
  };

  return (
    <div id="plant-scanner" className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Leaf className="w-5 h-5 text-emerald-600" />
          <h4 className="font-bold text-slate-800 text-[15px]">Escáner de Plantas y Huerta Orgánica</h4>
        </div>
      </div>

      {/* Selector de Elemento Botánico para Análisis */}
      <div className="mb-4 bg-slate-50 border border-slate-100 p-3.5 rounded-2xl text-left">
        <label htmlFor="botanical-element-select" className="block text-[10px] uppercase tracking-wider font-extrabold text-slate-500 mb-1.5 flex items-center gap-1.5">
          <span>🔎 Estructura Vegetal a Detectar</span>
        </label>
        <select
          id="botanical-element-select"
          value={selectedTargetElement}
          onChange={(e) => setSelectedTargetElement(e.target.value)}
          className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2.5 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-all cursor-pointer shadow-xs"
        >
          <option value="Auto-detectar">🔮 Auto-detectar (Análisis Inteligente Gemini)</option>
        </select>
        <p className="text-[10px] text-slate-400 mt-1.5 italic font-light">
          Selecciona el elemento de estudio para que la IA/base botánica local identifique rigurosamente la imagen.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
        <button
          id="btn-scan-tab-upload"
          onClick={() => handleTabChange('upload')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'upload' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Upload className="w-4 h-4" />
          SUBIR IMAGEN
        </button>
        <button
          id="btn-scan-tab-camera"
          onClick={() => handleTabChange('camera')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-semibold rounded-lg transition-all ${
            activeTab === 'camera' ? 'bg-white text-emerald-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          CÁMARA EN VIVO
        </button>
      </div>

      {/* Main scanning work area */}
      <div className="min-h-[220px] bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl relative overflow-hidden flex flex-col items-center justify-center p-6 text-center">
        {isScanning ? (
          /* Scanning Phase */
          <div className="space-y-4 w-full px-4">
            <div className="flex justify-center">
              <RefreshCw className="w-10 h-10 text-emerald-600 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-slate-700">Analizando el Cultivo...</p>
              <p className="text-xs text-slate-500 italic max-w-xs mx-auto animate-pulse">{scanStepMessage}</p>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <motion.div
                className="bg-emerald-500 h-full"
                initial={{ width: "0%" }}
                animate={{ width: `${scanProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Progreso: {scanProgress}%</span>
          </div>
        ) : scannedResult ? (
          /* Successful Scan Result Details Block */
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full text-left"
          >
            <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 mb-3 flex items-start gap-3 w-full">
              {scannedResult.image ? (
                <img
                  src={scannedResult.image}
                  alt={scannedResult.name}
                  className="w-16 h-16 object-cover rounded-xl border border-emerald-200 shrink-0 shadow-xs"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="bg-emerald-500 text-white p-2 rounded-lg shrink-0 mt-0.5">
                  <Leaf className="w-5 h-5" />
                </div>
              )}
              <div className="space-y-1 sm:max-w-xs flex-1">
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[9px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full uppercase">
                    Identificado ({backendScanMethod})
                  </span>
                  {scannedResult.detectedElement && (
                    <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full uppercase flex items-center gap-0.5">
                      🔎 Estructura: {scannedResult.detectedElement}
                    </span>
                  )}
                </div>
                <h5 className="font-bold text-slate-800 text-[16px] mt-1">{scannedResult.name}</h5>
                <p className="text-xs text-slate-500 italic font-mono">{scannedResult.scientificName}</p>
                <p className="text-xs text-slate-600"><strong className="text-slate-800 font-semibold">Origen:</strong> {scannedResult.origin}</p>
              </div>
            </div>

            <div className="bg-slate-100 rounded-xl p-3 border border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Cotización Devnet:</span>
              <span className="font-bold text-emerald-700 font-mono text-sm">{scannedResult.priceSol} SOL</span>
            </div>

            {apiKeyWarning && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex gap-2">
                <AlertCircle className="shrink-0 w-4 h-4" />
                <p><strong>Atención:</strong> {apiKeyWarning} Para usar la IA real, dirígete al menú <strong>Settings &gt; Secrets</strong> y configura <code>GEMINI_API_KEY</code>.</p>
              </div>
            )}

            <button
              id="btn-scan-reset"
              onClick={() => setScannedResult(null)}
              className="mt-3 w-full border border-slate-200 text-slate-600 hover:text-slate-800 hover:bg-slate-100 text-xs py-2 rounded-lg transition font-semibold"
            >
              Escanear Otra Planta
            </button>
          </motion.div>
        ) : activeTab === 'upload' ? (
          /* Upload View Drop Drag Area */
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`w-full py-6 flex flex-col items-center cursor-pointer ${dragActive ? 'bg-emerald-50/50' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <div className="bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white p-3 rounded-2xl mb-3 shadow-md shadow-emerald-500/20 transition-all cursor-pointer">
              <Upload className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-700">SELECCIONA TU IMAGEN</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
              ARCHIVOS JPG, JPEG, PNG O WEBP — ARRASTRE AQUÍ O HAGA CLIC
            </p>
          </div>
        ) : (
          /* Camera Stream view */
          <div className="w-full">
            {cameraErr ? (
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs flex flex-col items-center gap-2">
                <AlertCircle className="w-6 h-6" />
                <p>{cameraErr}</p>
                <button
                  onClick={() => alert("Usa las imágenes de prueba abajo para realizar el escaneo óptimo de inmediato.")}
                  className="bg-amber-600 text-white font-bold px-3 py-1.5 rounded-lg text-[11px] hover:bg-amber-700 transition"
                >
                  Entendido
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-44 object-cover bg-black rounded-xl border border-slate-200 shadow-sm"
                />
                <button
                  id="btn-scan-capture"
                  onClick={capturePhoto}
                  className="bg-emerald-500 hover:bg-emerald-600 font-bold text-white text-xs px-4 py-2 rounded-xl transition shadow-md shadow-emerald-500/20"
                >
                  Tomar Foto & Identificar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
