export interface Crop {
  id: string;
  name: string;
  scientificName: string;
  origin: string;
  uses: string;
  description: string;
  difficulty: 'Fácil' | 'Moderado' | 'Difícil';
  image: string; // URL or Base64 data string
  priceSol: number; // Price in SOL
  priceUsdc: number; // Price in USDC
  priceUsdt: number; // Price in USDT
  stock: number;
  isForSale: boolean;
  category?: 'Hortalizas' | 'Medicinales' | 'Frutas' | 'Hierbas' | 'Otro';
  watering?: string;
  sunlight?: string;
  idealSowingSeason?: string;
  harvestTimeDays?: string;
  soilType?: string;
  phRecommended?: string;
  companionPlants?: string;
  pestPrevention?: string;
  detectedElement?: string;
}

export interface WalletState {
  connected: boolean;
  walletName: 'Phantom' | 'Solflare' | 'Backpack' | null;
  publicKey: string | null;
  solBalance: number;
  usdcBalance: number;
  usdtBalance: number;
}

export interface PaymentLog {
  id: string;
  timestamp: string;
  cropName: string;
  quantity: number;
  amount: number;
  currency: 'SOL' | 'USDC' | 'USDT';
  signature: string;
  status: 'EXITOSO' | 'PENDIENTE' | 'FALLIDO';
}
