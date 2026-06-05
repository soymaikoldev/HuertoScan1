import React, { useState } from "react";
import { Wallet, Check, AlertCircle, Coins, ArrowRight, Sparkles } from "lucide-react";
import { WalletState } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface WalletHubProps {
  walletState: WalletState;
  onConnectWallet: (walletName: 'Phantom' | 'Solflare' | 'Backpack') => void;
  onDisconnectWallet: () => void;
  onAirdrop: (token: 'SOL' | 'USDC' | 'USDT', amount: number) => void;
}

export const WalletHub: React.FC<WalletHubProps> = ({
  walletState,
  onConnectWallet,
  onDisconnectWallet,
  onAirdrop,
}) => {
  const [showAirdropToast, setShowAirdropToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const handleFaucetRequest = (token: 'SOL' | 'USDC' | 'USDT', amount: number) => {
    onAirdrop(token, amount);
    setToastMsg(`+${amount} ${token} depositados en Devnet (Simulado)`);
    setShowAirdropToast(true);
    setTimeout(() => setShowAirdropToast(false), 3000);
  };

  return (
    <div id="solana-wallet-hub" className="bg-emerald-950 border border-emerald-800 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
      {/* Decorative glows */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl" />

      <div className="flex items-center gap-3 mb-4">
        <div className="bg-emerald-500/20 p-2.5 rounded-xl border border-emerald-500/30">
          <Wallet className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-lg tracking-tight">Solana Wallet Hub</h3>
            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full border border-emerald-500/20">
              SIMULADOR
            </span>
          </div>
          <p className="text-xs text-emerald-300">Prueba transacciones rápidas de costo real en Devnet.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {!walletState.connected ? (
          <motion.div
            key="disconnected"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bg-emerald-900/40 rounded-xl p-4 border border-emerald-800 text-[13px] leading-relaxed text-emerald-100 flex gap-2.5">
              <AlertCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-emerald-200">¿Eres nuevo en Solana?</p>
                <p className="mt-0.5">
                  Las transacciones en Solana tardan menos de 1 segundo y cuestan apenas{" "}
                  <strong className="text-white font-semibold">~0.000005 SOL ($0.00025 USD)</strong>.
                  Conecta una cartera simulada para ver la magia de Solana Pay en acción.
                </p>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-emerald-300 uppercase tracking-widest mb-3">
                SELECCIONA TU CARTERA SIMULADA:
              </p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  id="btn-wallet-phantom"
                  onClick={() => onConnectWallet("Phantom")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-purple-500/35 bg-purple-950/40 hover:bg-purple-900/40 active:scale-95 transition text-purple-200 gap-2 hover:border-purple-400"
                >
                  <div className="w-9 h-9 rounded-full bg-purple-500/25 flex items-center justify-center font-bold text-lg text-purple-300">
                    👻
                  </div>
                  <span className="text-xs font-medium">Phantom</span>
                </button>

                <button
                  id="btn-wallet-solflare"
                  onClick={() => onConnectWallet("Solflare")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-amber-500/35 bg-amber-950/40 hover:bg-amber-900/40 active:scale-95 transition text-amber-200 gap-2 hover:border-amber-400"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-500/25 flex items-center justify-center font-bold text-lg text-amber-300">
                    🔥
                  </div>
                  <span className="text-xs font-medium">Solflare</span>
                </button>

                <button
                  id="btn-wallet-backpack"
                  onClick={() => onConnectWallet("Backpack")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-500/35 bg-rose-950/40 hover:bg-rose-900/40 active:scale-95 transition text-rose-200 gap-2 hover:border-rose-400"
                >
                  <div className="w-9 h-9 rounded-full bg-rose-500/25 flex items-center justify-center font-bold text-lg text-rose-300">
                    🎒
                  </div>
                  <span className="text-xs font-medium">Backpack</span>
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="connected"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* Wallet Info Banner */}
            <div className="bg-emerald-900/50 rounded-xl p-4 border border-emerald-700/60 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {walletState.walletName === "Phantom" ? "👻" : walletState.walletName === "Solflare" ? "🔥" : "🎒"}
                  </span>
                  <span className="text-sm font-bold text-emerald-100">
                    {walletState.walletName} Conectado
                  </span>
                </div>
                <p className="font-mono text-[10.5px] text-emerald-300 mt-1.5 break-all max-w-[210px] md:max-w-none">
                  {walletState.publicKey}
                </p>
              </div>
              <button
                id="btn-wallet-disconnect"
                onClick={onDisconnectWallet}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 border border-emerald-700/60 hover:border-emerald-600 font-semibold px-2.5 py-1 rounded-lg transition shrink-0"
              >
                Desconectar
              </button>
            </div>

            {/* Balances Display Grid */}
            <div className="grid grid-cols-3 gap-2.5">
              <div className="bg-emerald-900/25 border border-emerald-800/60 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold text-emerald-400 tracking-wider block mb-1">
                  SOL BALANCE
                </span>
                <span className="text-[15px] font-bold tracking-tight text-white block">
                  {walletState.solBalance.toFixed(3)}
                </span>
                <button
                  id="faucet-sol"
                  onClick={() => handleFaucetRequest("SOL", 1.0)}
                  className="mt-1.5 text-[9px] bg-emerald-800 hover:bg-emerald-700 text-emerald-200 px-1.5 py-0.5 rounded transition font-medium w-full"
                >
                  Faucet +1.0
                </button>
              </div>

              <div className="bg-emerald-900/25 border border-emerald-800/60 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold text-cyan-400 tracking-wider block mb-1">
                  USDC BALANCE
                </span>
                <span className="text-[15px] font-bold tracking-tight text-white block">
                  ${walletState.usdcBalance.toFixed(1)}
                </span>
                <button
                  id="faucet-usdc"
                  onClick={() => handleFaucetRequest("USDC", 10.0)}
                  className="mt-1.5 text-[9px] bg-emerald-800 hover:bg-emerald-700 text-cyan-200 px-1.5 py-0.5 rounded transition font-medium w-full"
                >
                  Faucet +10
                </button>
              </div>

              <div className="bg-emerald-900/25 border border-emerald-800/60 rounded-xl p-3 text-center">
                <span className="text-[10px] font-bold text-teal-400 tracking-wider block mb-1">
                  USDT BALANCE
                </span>
                <span className="text-[15px] font-bold tracking-tight text-white block">
                  ${walletState.usdtBalance.toFixed(1)}
                </span>
                <button
                  id="faucet-usdt"
                  onClick={() => handleFaucetRequest("USDT", 10.0)}
                  className="mt-1.5 text-[9px] bg-emerald-800 hover:bg-emerald-700 text-teal-200 px-1.5 py-0.5 rounded transition font-medium w-full"
                >
                  Faucet +10
                </button>
              </div>
            </div>

            {/* Educational blockchain context */}
            <div className="text-[11px] text-emerald-300 bg-emerald-950/40 rounded-lg p-2.5 border border-emerald-850 flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                Devnet Faucet disponible
              </span>
              <span className="text-[10px] opacity-85">Costo por tx estimado: 0.000005 SOL</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Internal Airdrop Feedback */}
      <AnimatePresence>
        {showAirdropToast && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            className="absolute bottom-3 left-3 right-3 bg-emerald-500 text-white font-bold text-[12px] py-2 px-3 rounded-lg text-center shadow-lg border border-emerald-400 z-10 flex items-center justify-center gap-2"
          >
            <Coins className="w-4 h-4" />
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
