import React from "react";
import { History, Trash2, CheckCircle, ExternalLink, ArrowRightLeft } from "lucide-react";
import { PaymentLog } from "../types";
import { motion, AnimatePresence } from "motion/react";

interface LedgerLogsProps {
  logs: PaymentLog[];
  onClearLedger: () => void;
}

export const LedgerLogs: React.FC<LedgerLogsProps> = ({ logs, onClearLedger }) => {
  const formatTime = (timeStr: string) => {
    try {
      if (timeStr && (timeStr.includes("T") || !isNaN(Date.parse(timeStr)))) {
        const d = new Date(timeStr);
        return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
      }
    } catch (e) {
      console.error(e);
    }
    return timeStr;
  };

  return (
    <div id="solana-ledger-logs" className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm max-h-[420px] flex flex-col">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-slate-700" />
          <h4 className="font-bold text-slate-800 text-[14.5px]">Registro de Pagos (Solana Ledger)</h4>
        </div>
        {logs.length > 0 && (
          <button
            id="btn-ledger-clear"
            onClick={onClearLedger}
            className="text-[11px] text-red-600 hover:text-red-700 hover:bg-red-50 font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Borrar Registros
          </button>
        )}
      </div>

      <div className="overflow-y-auto pr-1 flex-1 mt-3 space-y-2.5 custom-scrollbar">
        <AnimatePresence initial={false}>
          {logs.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 flex flex-col items-center justify-center text-center text-slate-400"
            >
              <div className="bg-slate-100 p-3 rounded-full mb-2">
                <ArrowRightLeft className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-xs font-semibold">Sin transacciones registradas</p>
              <p className="text-[10.5px] mt-0.5">Visita el Mercado y adquiere cosechas usando tu wallet simulada.</p>
            </motion.div>
          ) : (
            logs.map((log) => (
              <motion.div
                key={log.id}
                id={`ledger-item-${log.id}`}
                initial={{ opacity: 0, x: -15, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 15, height: 0 }}
                className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl space-y-2 text-xs hover:border-slate-200 hover:bg-slate-50/70 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-slate-400 font-mono block mb-1">
                      {formatTime(log.timestamp)}
                    </span>
                    <span className="font-bold text-slate-800 text-[12.5px] tracking-tight">
                      {log.cropName} (x{log.quantity})
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-2 py-0.5 rounded uppercase select-none inline-block">
                      {log.status}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-slate-150/60 font-mono">
                  <span className="text-slate-500 font-medium select-none">PAGO:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100/60">
                    {log.amount.toFixed(log.currency === 'SOL' ? 3 : 2)} {log.currency}
                  </span>
                </div>

                <div className="pt-1 select-all">
                  <div className="text-[9.5px] text-slate-400 font-mono break-all bg-white p-1.5 rounded border border-slate-100 mt-1 flex justify-between items-center group">
                    <span className="truncate max-w-[190px] sm:max-w-none">Tx: {log.signature}</span>
                    <button
                      onClick={() => alert(`Simulado Devnet en Solana Ledger Explorer: \nFirma: ${log.signature} \nEstado: Éxito total. Costo de Red: 0.000005 SOL.`)}
                      className="text-slate-400 hover:text-emerald-600 transition shrink-0 ml-1"
                      title="Ver Transacción en Explorador"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
