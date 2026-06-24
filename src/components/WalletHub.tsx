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

const BACKPACK_ICON = "data:image/png;base64,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";
const PHANTOM_ICON = "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiB2aWV3Qm94PSIwIDAgMTA4IDEwOCIgZmlsbD0ibm9uZSI+CjxyZWN0IHdpZHRoPSIxMDgiIGhlaWdodD0iMTA4IiByeD0iMjYiIGZpbGw9IiNBQjlGRjIiLz4KPHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIGQ9Ik00Ni41MjY3IDY5LjkyMjlDNDIuMDA1NCA3Ni44NTA5IDM0LjQyOTIgODUuNjE4MiAyNC4zNDggODUuNjE4MkMxOS41ODI0IDg1LjYxODIgMTUgODMuNjU2MyAxNSA3NS4xMzQyQzE1IDUzLjQzMDUgNDQuNjMyNiAxOS44MzI3IDcyLjEyNjggMTkuODMyN0M4Ny43NjggMTkuODMyNyA5NCAzMC42ODQ2IDk0IDQzLjAwNzlDOTQgNTguODI1OCA4My43MzU1IDc2LjkxMjIgNzMuNTMyMSA3Ni45MTIyQzcwLjI5MzkgNzYuOTEyMiA2OC43MDUzIDc1LjEzNDIgNjguNzA1MyA3Mi4zMTRDNjguNzA1MyA3MS41NzgzIDY4LjgyNzUgNzAuNzgxMiA2OS4wNzE5IDY5LjkyMjlDNjUuNTg5MyA3NS44Njk5IDU4Ljg2ODUgODEuMzg3OCA1Mi41NzU0IDgxLjM4NzhDNDcuOTkzIDgxLjM4NzggNDUuNjcxMyA3OC41MDYzIDQ1LjY3MTMgNzQuNDU5OEM0NS42NzEzIDcyLjk4ODQgNDUuOTc2OCA3MS40NTU2IDQ2LjUyNjcgNjkuOTIyOVpNODMuNjc2MSA0Mi41Nzk0QzgzLjY3NjEgNDYuMTcwNCA4MS41NTc1IDQ3Ljk2NTggNzkuMTg3NSAzNy4xOTMxQzgxLjU1NzUgMzcuMTkzMSA4My42NzYxIDM4Ljk4ODUgODMuNjc2MSA0Mi41Nzk0Wk03MC4yMTAzIDQyLjU3OTVDNzAuMjEwMyA0Ni4xNzA0IDY4LjA5MTYgNDcuOTY1OCA2NS43MjE2IDQ3Ljk2NThDNjMuMzE1NyA0Ny45NjU4IDYxLjIzMyA0Ni4xNzA0IDYxLjIzMyA0Mi41Nzk1QzYxLjIzMyAzOC45ODg1IDYzLjMxNTcgMzcuMTkzMSA2NS43MjE2IDM3LjE5MzFDNjguMDkxNiAzNy4xOTMxIDcwLjIxMDMgMzguOTg4NSA3MC4yMTAzIDQyLjU3OTVaIiBmaWxsPSIjRkZGREY4Ii8+Cjwvc3ZnPg==";

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
                    <img src={PHANTOM_ICON} alt="Phantom" className="w-7 h-7 drop-shadow-md pb-0.5" />
                  </div>
                  <span className="text-xs font-medium">Phantom</span>
                </button>

                <button
                  id="btn-wallet-solflare"
                  onClick={() => onConnectWallet("Solflare")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-amber-500/35 bg-amber-950/40 hover:bg-amber-900/40 active:scale-95 transition text-amber-200 gap-2 hover:border-amber-400"
                >
                  <div className="w-9 h-9 rounded-full bg-amber-500/10 flex items-center justify-center">
                    <img src="https://www.solflare.com/wp-content/uploads/2024/11/App-Icon.svg" alt="Solflare" className="w-7 h-7 drop-shadow-md pb-0.5" />
                  </div>
                  <span className="text-xs font-medium">Solflare</span>
                </button>

                <button
                  id="btn-wallet-backpack"
                  onClick={() => onConnectWallet("Backpack")}
                  className="flex flex-col items-center justify-center p-3 rounded-xl border border-rose-500/35 bg-rose-950/40 hover:bg-rose-900/40 active:scale-95 transition text-rose-200 gap-2 hover:border-rose-400"
                >
                  <div className="w-9 h-9 rounded-full bg-rose-500/25 flex items-center justify-center font-bold text-lg text-rose-300">
                    <img src={BACKPACK_ICON} alt="Backpack" className="w-7 h-7 drop-shadow-md pb-0.5" />
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
                  <span className="text-lg flex items-center justify-center">
                    {walletState.walletName === "Phantom" ? <img src={PHANTOM_ICON} alt="Phantom" className="w-6 h-6 object-contain" /> : walletState.walletName === "Solflare" ? <img src="https://www.solflare.com/wp-content/uploads/2024/11/App-Icon.svg" alt="Solflare" className="w-6 h-6 object-contain" /> : <img src={BACKPACK_ICON} alt="Backpack" className="w-6 h-6 object-contain" />}
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
