import React, { useState, useEffect } from "react";
import { Leaf, Award, Globe, Coins, ShieldCheck, CreditCard, Sparkles, AlertCircle, ShoppingBag, ListPlus } from "lucide-react";
import { Crop, WalletState, PaymentLog } from "./types";
import { WalletHub } from "./components/WalletHub";
import { PlantScanner } from "./components/PlantScanner";
import { CropInventory } from "./components/CropInventory";
import { CommunityMarket } from "./components/CommunityMarket";
import { LedgerLogs } from "./components/LedgerLogs";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'market'>('inventory');
  const [crops, setCrops] = useState<Crop[]>([]);
  const [ledgerLogs, setLedgerLogs] = useState<PaymentLog[]>([]);
  const [totalSalesUsd, setTotalSalesUsd] = useState(28.62);
  const [isLoadingCrops, setIsLoadingCrops] = useState(true);

  // Safe wrapper for localStorage.setItem to completely avoid QuotaExceededError in React
  const setLocalStorageItem = (key: string, value: string) => {
    try {
      localStorage.setItem(key, value);
    } catch (e) {
      console.warn(`[LocalStorage] No se pudo escribir '${key}' (cuota de navegador superada):`, e);
      if (key === "solana_garden_crops") {
        try {
          // If storage is full, aggressively strip high-res / heavy images and retry
          const items = JSON.parse(value);
          const sanitized = items.map((c: any) => ({ ...c, image: "" }));
          localStorage.setItem(key, JSON.stringify(sanitized));
        } catch (err) {
          console.error("No se pudo regenerar versión limpia mínima para localStorage:", err);
        }
      }
    }
  };

  // Simulated Solana wallet states initialized locally
  const [walletState, setWalletState] = useState<WalletState>({
    connected: false,
    walletName: null,
    publicKey: null,
    solBalance: 0,
    usdcBalance: 0,
    usdtBalance: 0,
  });

  // Pre-seed mock keys when choosing wallets
  const DEFAULT_WALLET_CONFIGS = {
    Phantom: {
      publicKey: "E5S6px8wGZmC9sd3R2v1kTaLxPyP9dK8s7zF6gH1jK3l",
      solBalance: 4.25,
      usdcBalance: 60.0,
      usdtBalance: 40.0,
    },
    Solflare: {
      publicKey: "7xFb9cK8zs7zF6gH1jK3lPyP9dK8s7zF6gH1jK3lE5S6",
      solBalance: 15.82,
      usdcBalance: 120.0,
      usdtBalance: 120.0,
    },
    Backpack: {
      publicKey: "9xTkLaNp9dK8s7zF6gH1jK3lE5S6px8wGZmC9sd3R2v1",
      solBalance: 1.12,
      usdcBalance: 25.0,
      usdtBalance: 25.0,
    }
  };

  // Fetch initial data on mount
  const fetchCrops = async () => {
    try {
      const res = await fetch("/api/crops");
      const serverCrops: Crop[] = await res.json();
      
      const localStr = localStorage.getItem("solana_garden_crops");
      let localCrops: Crop[] = [];
      if (localStr) {
        try {
          const parsed = JSON.parse(localStr);
          // Deduplicate local crops
          localCrops = Array.from(new Map(parsed.map((item: any) => [item.id, item])).values()) as Crop[];
        } catch (e) {
          console.error("Error parsing local crops:", e);
        }
      }

      // Sync local crops to server if missing from server
      const missingOnServer = localCrops.filter(lc => !serverCrops.some(sc => sc.id === lc.id));
      if (missingOnServer.length > 0) {
        console.log("Restaurando especies guardadas en el servidor:", missingOnServer);
        for (const crop of missingOnServer) {
          await fetch("/api/crops", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(crop),
          });
        }
        // Fetch again to get fully unified server-side state
        const res2 = await fetch("/api/crops");
        const serverCrops2: Crop[] = await res2.json();
        setCrops(serverCrops2);
        setLocalStorageItem("solana_garden_crops", JSON.stringify(serverCrops2));
      } else {
        // Normal path: Merge keeping server state as authoritative for common ones, but preserve any local edits
        const merged = [...serverCrops];
        setCrops(merged);
        setLocalStorageItem("solana_garden_crops", JSON.stringify(merged));
      }
    } catch (e) {
      console.error("Error al obtener cultivos:", e);
      // Fallback to local storage if API fails
      const localStr = localStorage.getItem("solana_garden_crops");
      if (localStr) {
        try {
          setCrops(JSON.parse(localStr));
        } catch (err) {}
      }
    } finally {
      setIsLoadingCrops(false);
    }
  };

  const fetchLedger = async () => {
    try {
      const res = await fetch("/api/ledger");
      const data = await res.json();
      const serverLogs: PaymentLog[] = data.ledger || [];
      const serverVolume: number = data.totalSalesUsd !== undefined ? data.totalSalesUsd : 28.62;

      const localLogsStr = localStorage.getItem("solana_garden_ledger");
      let localLogs: PaymentLog[] = [];
      if (localLogsStr) {
        try {
          localLogs = JSON.parse(localLogsStr);
        } catch (e) {}
      }

      // Sync missing client transactions to server Ledger
      const missingOnServer = localLogs.filter(ll => !serverLogs.some(sl => sl.id === ll.id));
      if (missingOnServer.length > 0) {
        console.log("Sincronizando transacciones locales con el servidor Ledger:", missingOnServer);
        for (const log of missingOnServer) {
          await fetch("/api/ledger", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(log),
          });
        }
        // Fetch again after sync
        const res2 = await fetch("/api/ledger");
        const data2 = await res2.json();
        const updatedLogs = data2.ledger || [];
        setLedgerLogs(updatedLogs);
        setTotalSalesUsd(data2.totalSalesUsd);
        setLocalStorageItem("solana_garden_ledger", JSON.stringify(updatedLogs));
        setLocalStorageItem("solana_garden_volume", String(data2.totalSalesUsd));
      } else {
        setLedgerLogs(serverLogs);
        setTotalSalesUsd(serverVolume);
        setLocalStorageItem("solana_garden_ledger", JSON.stringify(serverLogs));
        setLocalStorageItem("solana_garden_volume", String(serverVolume));
      }
    } catch (e) {
      console.error("Error al obtener libro contable:", e);
      // Fallback
      const localLogsStr = localStorage.getItem("solana_garden_ledger");
      const localVolumeStr = localStorage.getItem("solana_garden_volume");
      if (localLogsStr) {
        try {
          setLedgerLogs(JSON.parse(localLogsStr));
        } catch (err) {}
      }
      if (localVolumeStr) {
        setTotalSalesUsd(Number(localVolumeStr));
      }
    }
  };

  useEffect(() => {
    fetchCrops();
    fetchLedger();
  }, []);

  const handleConnectWallet = (walletName: 'Phantom' | 'Solflare' | 'Backpack') => {
    const config = DEFAULT_WALLET_CONFIGS[walletName];
    setWalletState({
      connected: true,
      walletName: walletName,
      publicKey: config.publicKey,
      solBalance: config.solBalance,
      usdcBalance: config.usdcBalance,
      usdtBalance: config.usdtBalance,
    });
  };

  const handleDisconnectWallet = () => {
    setWalletState({
      connected: false,
      walletName: null,
      publicKey: null,
      solBalance: 0,
      usdcBalance: 0,
      usdtBalance: 0,
    });
  };

  const handleAirdrop = (token: 'SOL' | 'USDC' | 'USDT', amount: number) => {
    if (!walletState.connected) return;

    setWalletState(prev => {
      if (token === 'SOL') {
        return { ...prev, solBalance: prev.solBalance + amount };
      } else if (token === 'USDC') {
        return { ...prev, usdcBalance: prev.usdcBalance + amount };
      } else {
        return { ...prev, usdtBalance: prev.usdtBalance + amount };
      }
    });
  };

  // Callback once a plant is scanned and successfully classified!
  const handleCropIdentified = async (newCrop: Crop) => {
    // 1. Optimistic client additions
    const updatedCrops = [...crops, newCrop];
    setCrops(updatedCrops);
    setLocalStorageItem("solana_garden_crops", JSON.stringify(updatedCrops));

    try {
      const res = await fetch("/api/crops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCrop),
      });
      if (res.ok) {
        await fetchCrops();
      }
    } catch (e) {
      console.error("Error al guardar cultivo en backend:", e);
    }
  };

  // Delete from backend library
  const handleDeleteCrop = async (id: string) => {
    try {
      // 1. Mark as deleted in client-state immediately to prevent syncing back
      const updatedCrops = crops.filter(c => c.id !== id);
      setCrops(updatedCrops);
      setLocalStorageItem("solana_garden_crops", JSON.stringify(updatedCrops));

      const res = await fetch(`/api/crops/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchCrops();
      }
    } catch (e) {
      console.error("Error delete crop:", e);
    }
  };

  // Toggle put up for sale switch status
  const handleToggleSale = async (id: string) => {
    const cropToToggle = crops.find(c => c.id === id);
    if (!cropToToggle) return;

    const updatedStatus = !cropToToggle.isForSale;
    
    // Optimistic client-side save
    const updatedCrops = crops.map(c => c.id === id ? { ...c, isForSale: updatedStatus } : c);
    setCrops(updatedCrops);
    setLocalStorageItem("solana_garden_crops", JSON.stringify(updatedCrops));

    try {
      const res = await fetch(`/api/crops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isForSale: updatedStatus }),
      });
      if (res.ok) {
        await fetchCrops();
      }
    } catch (e) {
      console.error("Error toggle sale:", e);
    }
  };

  // Inline pricing edits
  const handleUpdateCrop = async (id: string, updatedFields: Partial<Crop>) => {
    // Optimistic client-side save
    const updatedCrops = crops.map(c => c.id === id ? { ...c, ...updatedFields } : c);
    setCrops(updatedCrops);
    setLocalStorageItem("solana_garden_crops", JSON.stringify(updatedCrops));

    try {
      const res = await fetch(`/api/crops/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedFields),
      });
      if (res.ok) {
        await fetchCrops();
      }
    } catch (e) {
      console.error("Error al actualizar precio/suministro:", e);
    }
  };

  // Purchase crop successfully made inside pasarela
  const handlePurchaseComplete = async (purchase: {
    cropId: string;
    cropName: string;
    quantity: number;
    amount: number;
    currency: 'SOL' | 'USDC' | 'USDT';
  }) => {
    // 1. Deduct cost from simulated connected wallet
    setWalletState(prev => {
      let finalSol = prev.solBalance;
      let finalUsdc = prev.usdcBalance;
      let finalUsdt = prev.usdtBalance;

      if (purchase.currency === "SOL") {
        finalSol = Math.max(0, prev.solBalance - purchase.amount);
      } else if (purchase.currency === "USDC") {
        finalUsdc = Math.max(0, prev.usdcBalance - purchase.amount);
      } else if (purchase.currency === "USDT") {
        finalUsdt = Math.max(0, prev.usdtBalance - purchase.amount);
      }

      return {
        ...prev,
        solBalance: finalSol,
        usdcBalance: finalUsdc,
        usdtBalance: finalUsdt,
      };
    });

    // 2. Decrement crop stock from database and local storage optimistically
    const targetCrop = crops.find(c => c.id === purchase.cropId);
    if (targetCrop) {
      const newStock = Math.max(0, targetCrop.stock - purchase.quantity);
      const isStillForSale = newStock > 0 ? targetCrop.isForSale : false;

      const updatedCrops = crops.map(c => c.id === purchase.cropId ? { ...c, stock: newStock, isForSale: isStillForSale } : c);
      setCrops(updatedCrops);
      setLocalStorageItem("solana_garden_crops", JSON.stringify(updatedCrops));

      try {
        await fetch(`/api/crops/${purchase.cropId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stock: newStock, isForSale: isStillForSale }),
        });
      } catch (e) {
        console.error("Error decrementing stock:", e);
      }
    }

    // 3. Register transaction receipt inside centralized ledger api
    const tempTxId = `tx-${Date.now()}`;
    const newTx = {
      id: tempTxId,
      timestamp: new Date().toISOString(),
      cropName: purchase.cropName,
      quantity: purchase.quantity,
      amount: purchase.amount,
      currency: purchase.currency,
      signature: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      status: "EXITOSO" as const
    };

    // Optimistically add to local logs
    const updatedLogs = [newTx, ...ledgerLogs];
    setLedgerLogs(updatedLogs);
    setLocalStorageItem("solana_garden_ledger", JSON.stringify(updatedLogs));

    let usdValue = purchase.amount;
    if (purchase.currency === "SOL") {
      usdValue = purchase.amount * 150.0;
    }
    const newVolume = Number((totalSalesUsd + usdValue).toFixed(2));
    setTotalSalesUsd(newVolume);
    setLocalStorageItem("solana_garden_volume", String(newVolume));

    try {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newTx),
      });
      if (res.ok) {
        await fetchLedger();
        await fetchCrops();
      }
    } catch (e) {
      console.error("Error updating ledger database:", e);
    }
  };

  // Clear Ledger lists
  const handleClearLedger = async () => {
    try {
      // 1. Clear local storage first
      localStorage.removeItem("solana_garden_ledger");
      setLocalStorageItem("solana_garden_volume", "0.00");
      setLedgerLogs([]);
      setTotalSalesUsd(0.00);

      const res = await fetch("/api/ledger", {
        method: "DELETE",
      });
      if (res.ok) {
        await fetchLedger();
        alert("Libro contable y volumen de ventas reinicializados en Solana Devnet.");
      }
    } catch (e) {
      console.error("Error clearing ledger:", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Absolute Header with clean details */}
      <header className="bg-white border-b border-slate-100 py-4 px-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2.5 rounded-2xl shadow-md shadow-emerald-600/10 flex items-center justify-center">
              <Leaf className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-extrabold text-[18px] tracking-tight text-slate-800">
                  Huerto Scan & Solana Pay
                </h1>
                <span className="bg-emerald-100 text-emerald-800 text-[9.5px] font-black px-2 py-0.5 rounded-full border border-emerald-200 uppercase whitespace-nowrap">
                  Solana Vibe Bootcamp
                </span>
              </div>
              <p className="text-[11.5px] text-slate-500 font-medium">Asesor de Producto & Guía de Desarrollo Web3 para Principiantes</p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 border border-slate-150 px-3.5 py-1.5 rounded-xl text-xs font-semibold">
            <span className="text-[10.5px] text-slate-400 uppercase font-bold tracking-wider block">
              ESTADO CLUSTER
            </span>
            <span className="flex items-center gap-1.5 text-emerald-700">
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping Absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              Solana Devnet Online
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 flex-1 w-full grid grid-cols-1 gap-6">
        {/* Metric Summary Rows */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Identified Species card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4.5 flex items-center gap-4 shadow-xs">
            <div className="bg-emerald-50 text-emerald-700 p-3 rounded-xl shrink-0">
              <ListPlus className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                CULTIVOS IDENTIFICADOS
              </span>
              <p className="font-extrabold text-xl text-slate-800 tracking-tight mt-0.5">
                {isLoadingCrops ? "..." : `${crops.length} especies`}
              </p>
            </div>
          </div>

          {/* Connected wallet simulated card */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4.5 flex items-center gap-4 shadow-xs">
            <div className="bg-purple-50 text-purple-700 p-3 rounded-xl shrink-0">
              <Coins className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                WALLET DE SOLANA
              </span>
              <p className="font-extrabold text-sm text-slate-800 tracking-tight mt-1 truncate">
                {walletState.connected ? (
                  <span className="text-purple-700">{walletState.walletName} Conectada</span>
                ) : (
                  <span className="text-slate-500 font-medium text-xs">Desconectada</span>
                )}
              </p>
            </div>
          </div>

          {/* Dynamic volume sales */}
          <div className="bg-white border border-slate-100 rounded-2xl p-4.5 flex items-center gap-4 shadow-xs">
            <div className="bg-cyan-50 text-cyan-700 p-3 rounded-xl shrink-0">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                VOLUMEN VENTAS SOLANA
              </span>
              <p className="font-extrabold text-xl text-emerald-700 tracking-tight mt-0.5 font-mono">
                ${totalSalesUsd.toFixed(2)} <span className="text-xs text-slate-400 font-medium">USD</span>
              </p>
            </div>
          </div>
        </section>

        {/* Dynamic educational advisory section introducing Solana Pay to Beginners */}
        <section className="bg-emerald-900/5 text-emerald-800 rounded-2xl p-5 border border-emerald-500/10 flex flex-col md:flex-row gap-5 items-center justify-between">
          <div className="space-y-1 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <h3 className="font-bold text-[14.5px] text-emerald-950">
                Guía de Huerto Scan y Solana para Principiantes
              </h3>
            </div>
            <p className="text-[12.5px] text-slate-650 leading-relaxed max-w-3xl">
              ¡Bienvenido al Solana Vibe Bootcamp! Con esta app vas a solucionar dos desafíos clave de la huerta tradicional: 
              <strong> 1. Escaneo con IA </strong> para clasificar automáticamente tus folios (con nombre científico, procedencia y usos farmacéuticos) 
              y <strong> 2. Pagos Instantáneos </strong> usando Web3. El uso directo de Solana reduce tus tarifas de pago un 99% y te permite recompensar a la comunidad mediante un <strong>10% de descuento automático</strong> por pagar de manera transparente en la blockchain.
            </p>
          </div>
          <div className="bg-emerald-900/10 px-4 py-2 rounded-xl text-xs font-bold text-emerald-900 shrink-0 text-center">
            🚀 Potenciado por Gemini AI
          </div>
        </section>

        {/* Central working dual column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Column Left (Widgets and Loggers) */}
          <div className="space-y-6 lg:col-span-1">
            {/* 1. Wallet sim hub */}
            <WalletHub
              walletState={walletState}
              onConnectWallet={handleConnectWallet}
              onDisconnectWallet={handleDisconnectWallet}
              onAirdrop={handleAirdrop}
            />

            {/* 2. Plant scanning module */}
            <PlantScanner onCropIdentified={handleCropIdentified} />

            {/* 3. Central Ledger logger */}
            <LedgerLogs logs={ledgerLogs} onClearLedger={handleClearLedger} />
          </div>

          {/* Column Right (Tabs and Inventory or Market details) */}
          <div className="lg:col-span-2 space-y-4">
            {/* View navigation headers */}
            <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-xs">
              <button
                id="tab-inventory-trigger"
                onClick={() => setActiveTab('inventory')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-extrabold rounded-xl transition duration-200 cursor-pointer ${
                  activeTab === 'inventory'
                    ? 'bg-emerald-950 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <ListPlus className="w-4 h-4" />
                Mi Inventario de Cultivos
              </button>
              <button
                id="tab-market-trigger"
                onClick={() => setActiveTab('market')}
                className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-extrabold rounded-xl transition duration-200 cursor-pointer ${
                  activeTab === 'market'
                    ? 'bg-emerald-950 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
              >
                <ShoppingBag className="w-4 h-4" />
                Mercado para la Comunidad
              </button>
            </div>

            <p className="text-[12.5px] text-slate-500 px-1 mt-1 leading-normal">
              {activeTab === 'inventory'
                ? "Organiza, edita e inicializa los precios en SOL de tus cosechas cultivadas y visualiza sus fichas técnicas botánicas."
                : "Sección de venta directa. Adquiere productos ecológicos procesando transacciones Devnet en SOL, USDC o USDT."}
            </p>

            <AnimatePresence mode="wait">
              {activeTab === 'inventory' ? (
                <motion.div
                  key="inventory"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest leading-none">
                      Mis Especies Guardadas ({crops.length})
                    </span>
                  </div>
                  <CropInventory
                    crops={crops}
                    onToggleSale={handleToggleSale}
                    onUpdateCrop={handleUpdateCrop}
                    onDeleteCrop={handleDeleteCrop}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="market"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  <div className="flex justify-between items-center px-1">
                    <span className="text-xs font-extrabold text-slate-500 uppercase tracking-widest leading-none">
                      Lista para Cosechar & Comprar ({crops.filter(c => c.isForSale && c.stock > 0).length})
                    </span>
                  </div>
                  <CommunityMarket
                    crops={crops}
                    walletState={walletState}
                    onPurchaseComplete={handlePurchaseComplete}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Footer advice */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center text-xs text-slate-500 leading-normal">
        <p className="max-w-xl mx-auto px-4 font-normal">
          Diseñado para el <strong>Solana Vibe Bootcamp</strong> como un prototipo educativo robusto. Conexiones, firmas y fondos de red se ejecutan en estado simulado protegido de costo cero.
        </p>
        <p className="text-[10px] text-slate-400 font-mono mt-1.5">
          © 2026 Huerto Scan & Solana Pay — Licencia Apache-2.0
        </p>
      </footer>
    </div>
  );
}
