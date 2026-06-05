import React, { useState } from "react";
import { ShoppingCart, Coins, ShieldCheck, CreditCard, Sparkles, AlertCircle, CheckCircle2, Ticket, ArrowRight, X } from "lucide-react";
import { Crop, WalletState } from "../types";
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
        <div className="absolute inset-0 flex items-center justify-center font-bold text-[36px] pointer-events-none">
          {category === "Hierbas" ? "🌿" : category === "Medicinales" ? "🌱" : category === "Frutas" ? "🍓" : "🍅"}
        </div>
      )}
    </div>
  );
};

interface CommunityMarketProps {
  crops: Crop[];
  walletState: WalletState;
  onPurchaseComplete: (purchaseDetails: {
    cropId: string;
    cropName: string;
    quantity: number;
    amount: number;
    currency: 'SOL' | 'USDC' | 'USDT';
  }) => void;
}

export const CommunityMarket: React.FC<CommunityMarketProps> = ({
  crops,
  walletState,
  onPurchaseComplete,
}) => {
  const forSaleCrops = crops.filter(c => c.isForSale && c.stock > 0);

  // Checkout flows states
  const [selectedCrop, setSelectedCrop] = useState<Crop | null>(null);
  const [purchaseQty, setPurchaseQty] = useState(1);
  const [selectedCurrency, setSelectedCurrency] = useState<'SOL' | 'USDC' | 'USDT'>('SOL');
  const [isProcessing, setIsProcessing] = useState(false);
  const [successTxSig, setSuccessTxSig] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState("");

  const handleOpenCheckout = (crop: Crop) => {
    setSelectedCrop(crop);
    setPurchaseQty(1);
    setSelectedCurrency('SOL');
    setSuccessTxSig(null);
    setCheckoutError("");
  };

  const currentPricePerUnit = selectedCrop ? (
    selectedCurrency === 'SOL' ? selectedCrop.priceSol :
    selectedCurrency === 'USDC' ? selectedCrop.priceUsdc :
    selectedCrop.priceUsdt
  ) : 0;

  // Let's implement traditional processing vs Solana Pay check path
  // with a 10% direct discount
  const originalPriceSum = currentPricePerUnit * purchaseQty;
  const solanaDiscountRatio = 0.10; // 10%
  const discountedPriceSum = Number((originalPriceSum * (1 - solanaDiscountRatio)).toFixed(selectedCurrency === 'SOL' ? 4 : 2));
  const discountSavedAmount = Number((originalPriceSum * solanaDiscountRatio).toFixed(selectedCurrency === 'SOL' ? 4 : 2));

  // Equivalent estimation in USD to check ledger thresholds
  const getUsdEstimate = () => {
    if (!selectedCrop) return 0;
    const baseUsdc = selectedCrop.priceUsdc * purchaseQty * (1 - solanaDiscountRatio);
    return Number(baseUsdc.toFixed(2));
  };

  const handlePay = async () => {
    if (!selectedCrop) return;
    setCheckoutError("");

    if (!walletState.connected) {
      setCheckoutError("No hay ninguna cartera conectada. Por favor, selecciona una cartera en el Solana Wallet Hub de la izquierda.");
      return;
    }

    // Balance checks
    if (selectedCurrency === 'SOL') {
      if (walletState.solBalance < discountedPriceSum) {
        setCheckoutError(`Saldo de SOL insuficiente. Requieres ${discountedPriceSum} SOL pero solo posees ${walletState.solBalance.toFixed(3)} SOL. ¡Solicita SOL de prueba en el Devnet Faucet!`);
        return;
      }
    } else if (selectedCurrency === 'USDC') {
      if (walletState.usdcBalance < discountedPriceSum) {
        setCheckoutError(`Saldo de USDC insuficiente. Requieres $${discountedPriceSum} USDC pero posees $${walletState.usdcBalance.toFixed(1)} USDC. ¡Solicita USDC de prueba en el Faucet!`);
        return;
      }
    } else if (selectedCurrency === 'USDT') {
      if (walletState.usdtBalance < discountedPriceSum) {
        setCheckoutError(`Saldo de USDT insuficiente. Requieres $${discountedPriceSum} USDT pero posees $${walletState.usdtBalance.toFixed(1)} USDT. ¡Solicita USDT de prueba en el Faucet!`);
        return;
      }
    }

    setIsProcessing(true);
    // Simulate transaction delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const generatedSig = "sol" + Math.random().toString(36).substring(2, 10).toUpperCase() + "tx" + Date.now().toString().substring(8);
      setSuccessTxSig(generatedSig);

      onPurchaseComplete({
        cropId: selectedCrop.id,
        cropName: selectedCrop.name,
        quantity: purchaseQty,
        amount: discountedPriceSum,
        currency: selectedCurrency,
      });
    } catch (err: any) {
      setCheckoutError("La transacción fue cancelada por el simulador de Solana.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div id="community-market-block" className="space-y-4">
      {forSaleCrops.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-2xl border border-slate-100">
          <ShoppingCart className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          <p className="text-xs font-semibold">Mercado Comunitario sin existencias</p>
          <p className="text-[10.5px] mt-0.5 max-w-xs mx-auto text-slate-400">
            Asegúrate de tener cultivos identificados en tu inventario y haz clic en "Poner en Venta" para listarlos aquí.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {forSaleCrops.map((crop) => (
            <div
              key={crop.id}
              id={`market-item-${crop.id}`}
              className="bg-white border border-slate-100 rounded-2xl p-4.5 hover:shadow-xs transition duration-200 flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                {/* Product Thumbnail or Emoji Category Banner */}
                <div className="h-28 bg-slate-50 border border-slate-100/80 rounded-xl relative overflow-hidden flex items-center justify-center select-none shadow-xs">
                  <CropImageView src={crop.image} alt={crop.name} category={crop.category} />
                  <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/50 to-transparent p-2 text-white flex justify-between items-end">
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/85 text-white px-2 py-0.5 rounded">
                      {crop.category || "Cosecha"}
                    </span>
                    <span className="text-[11px] font-mono font-bold bg-slate-900/40 backdrop-blur-xs px-1.5 py-0.5 rounded">
                      Disponibles: {crop.stock}
                    </span>
                  </div>
                </div>

                <div className="space-y-1 text-left">
                  <h5 className="font-bold text-slate-800 text-[14px]">
                    {crop.name}
                  </h5>
                  <p className="font-mono text-[9.5px] text-slate-400 italic">
                    ({crop.scientificName})
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
                    {crop.description}
                  </p>
                </div>
              </div>

              {/* Action purchase strip */}
              <div className="pt-3 border-t border-slate-100 mt-3 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[9.5px] text-slate-400 font-bold block mb-0.5 uppercase tracking-wider select-none">
                    PRECIO COMUNIDAD
                  </span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-extrabold text-sm text-emerald-700 font-mono">
                      {crop.priceSol} SOL
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (${crop.priceUsdc} USDC)
                    </span>
                  </div>
                </div>

                <button
                  id={`btn-market-checkout-trigger-${crop.id}`}
                  onClick={() => handleOpenCheckout(crop)}
                  className="bg-emerald-950 hover:bg-emerald-900 text-white hover:text-emerald-100 font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-md cursor-pointer transition flex items-center gap-1 hover:shadow-emerald-950/20 active:scale-95 text-center shrink-0"
                >
                  Comprar
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive, Beautiful Solana Pay Checkout Modal */}
      <AnimatePresence>
        {selectedCrop && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-5">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-100 overflow-hidden outline-hidden flex flex-col"
            >
              {/* Modal Top Banner */}
              <div className="bg-emerald-950 text-white p-5 relative">
                <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-2xl" />
                <button
                  id="checkout-modal-close"
                  onClick={() => setSelectedCrop(null)}
                  className="absolute top-3.5 right-3.5 text-emerald-250 hover:text-white p-1.5 rounded-full transition"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <Coins className="w-5 h-5 text-emerald-400" />
                  <span className="text-[10px] font-extrabold text-emerald-400 tracking-wider">
                    SOLANA PAY GATEWAY
                  </span>
                </div>
                <h4 className="font-extrabold text-[16px] mt-0.5">Pasarela de Pago Descentralizada</h4>
              </div>

              {!successTxSig ? (
                /* Primary checkout view */
                <div className="p-5 space-y-4">
                  {/* Selected Crop Summary Card */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center gap-3">
                    <div className="w-12 h-12 bg-slate-200 rounded-lg overflow-hidden shrink-0 flex items-center justify-center font-bold text-lg relative select-none shadow-inner border border-slate-200">
                      <CropImageView src={selectedCrop.image} alt={selectedCrop.name} category={selectedCrop.category} />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-800 text-[13px]">{selectedCrop.name}</h5>
                      <p className="text-[10px] text-slate-500 italic font-mono">{selectedCrop.scientificName}</p>
                      <p className="text-[10px] text-emerald-700 font-semibold mt-0.5">Suministro de huerta: {selectedCrop.stock} raciones libres</p>
                    </div>
                  </div>

                  {/* Quantity selector */}
                  <div className="flex justify-between items-center bg-slate-50/50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <span className="font-semibold text-slate-600">Porciones a comprar:</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPurchaseQty(Math.max(1, purchaseQty - 1))}
                        disabled={purchaseQty <= 1}
                        className="w-7 h-7 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-md font-bold disabled:opacity-40 transition-sm"
                      >
                        -
                      </button>
                      <span className="font-extrabold text-slate-800 w-4 text-center">{purchaseQty}</span>
                      <button
                        onClick={() => setPurchaseQty(Math.min(selectedCrop.stock, purchaseQty + 1))}
                        disabled={purchaseQty >= selectedCrop.stock}
                        className="w-7 h-7 bg-white text-slate-600 hover:bg-slate-100 border border-slate-200 rounded-md font-bold disabled:opacity-40 transition-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Solana Pay Direct Token Selectors */}
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      SELECCIONA CRIPTOMONEDA (SOLANA DEVNET):
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['SOL', 'USDC', 'USDT'] as const).map((curr) => {
                        const bal = curr === 'SOL' ? walletState.solBalance : curr === 'USDC' ? walletState.usdcBalance : walletState.usdtBalance;
                        return (
                          <button
                            key={curr}
                            onClick={() => setSelectedCurrency(curr)}
                            className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all ${
                              selectedCurrency === curr
                                ? 'bg-emerald-950/5 text-emerald-850 border-emerald-500 font-bold'
                                : 'bg-slate-50 text-slate-600 border-slate-150'
                            }`}
                          >
                            <span className="text-[11.5px] font-mono">{curr}</span>
                            <span className="text-[8.5px] text-slate-400 mt-1 truncate">
                              Dispon: {curr === 'SOL' ? bal.toFixed(1) : `$${bal.toFixed(0)}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Detailed Pricing Breakdown featuring the awesome Solana Discount */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-1.5 space-y-2 text-xs">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-150 pb-1 flex justify-between items-center">
                      <span>Cálculo de Factura</span>
                      <span className="text-emerald-700 bg-emerald-150/50 px-1.5 rounded text-[8px] flex items-center gap-0.5">
                        <Ticket className="w-2.5 h-2.5" />
                        Ahorro del 10%
                      </span>
                    </p>

                    <div className="flex justify-between items-center text-slate-500 text-[11px]">
                      <span className="flex items-center gap-1">
                        <CreditCard className="w-3.5 h-3.5" />
                        Pago Tradicional (Tarjetas):
                      </span>
                      <span className="line-through font-mono">
                        {originalPriceSum.toFixed(selectedCurrency === 'SOL' ? 4 : 2)} {selectedCurrency}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-emerald-700 font-bold text-[12.5px] bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-50 w-full">
                      <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                        <Sparkles className="w-3.5 h-3.5 text-yellow-500" />
                        Tarifa Integración Solana:
                      </span>
                      <span className="font-mono font-extrabold">
                        {discountedPriceSum} {selectedCurrency}
                      </span>
                    </div>

                    <div className="text-[10px] text-right text-slate-400 flex justify-between pt-0.5">
                      <span>Ahorraste con Solana Pay:</span>
                      <strong className="text-emerald-600 font-bold">
                        -{discountSavedAmount} {selectedCurrency}
                      </strong>
                    </div>
                  </div>

                  {/* Errors alerts pane */}
                  {checkoutError && (
                    <div className="bg-red-50 text-red-800 p-3 rounded-xl border border-red-100 text-[11.5px] flex items-start gap-2 leading-relaxed">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
                      <p>{checkoutError}</p>
                    </div>
                  )}

                  {/* Payment Authorisation Button */}
                  <button
                    id="btn-confirm-solana-pay"
                    onClick={handlePay}
                    disabled={isProcessing}
                    className="w-full bg-emerald-950 hover:bg-emerald-900 disabled:opacity-50 text-white font-extrabold text-xs py-3 rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer border border-emerald-900"
                  >
                    {isProcessing ? (
                      <>
                        <Coins className="w-4 h-4 animate-spin" />
                        Autorizando Pago en Billetera...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-emerald-400" />
                        Autorizar Pago en {walletState.walletName || "Simulador"}
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center select-none font-medium">
                    ✓ Respaldo de Seguridad Criptográfica Solana Devnet.
                  </p>
                </div>
              ) : (
                /* Successful purchase panel celebration */
                <div className="p-6 text-center space-y-4">
                  <div className="flex justify-center">
                    <motion.div
                      initial={{ scale: 0.5, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      className="bg-emerald-100 text-emerald-700 p-4 rounded-full border-2 border-emerald-300 shadow-md shadow-emerald-500/10"
                    >
                      <CheckCircle2 className="w-8 h-8" />
                    </motion.div>
                  </div>

                  <div className="space-y-1">
                    <h5 className="font-extrabold text-[16px] text-slate-800">¡Transacción Exitosa!</h5>
                    <p className="text-xs text-slate-500">La cosecha de huerto ya fue despachada por Solana Pay.</p>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-3 rounded-xl text-xs space-y-1 text-left font-mono">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Descontado:</span>
                      <strong className="text-emerald-700">{discountedPriceSum} {selectedCurrency}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Suministro final:</span>
                      <p>{selectedCrop.stock - purchaseQty} raciones</p>
                    </div>
                    <div className="text-[9px] text-slate-400 pt-1.5 border-t border-slate-150 select-all break-all leading-snug">
                      Firma Ledger: <span className="text-slate-600 block mt-0.5">{successTxSig}</span>
                    </div>
                  </div>

                  <button
                    id="btn-checkout-success-close"
                    onClick={() => setSelectedCrop(null)}
                    className="w-full bg-emerald-900 hover:bg-emerald-950 text-white font-bold text-xs py-2.5 rounded-xl transition shadow-xs"
                  >
                    Volver al Mercado
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
