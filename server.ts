import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

// Supabase configuration
const rawSupabaseUrl = "https://klaompnbmjufvhjkeeno.supabase.co";
const supabaseUrl = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '');
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtsYW9tcG5ibWp1ZnZoamtlZW5vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1NjY5ODEsImV4cCI6MjA5NzE0Mjk4MX0.udKgeFZLsVzXvSU0oqR0F3_J7EDCA1g7MxF00l8LEEc";
const supabase = createClient(supabaseUrl, supabaseAnonKey);
const SUPABASE_QUERY_TIMEOUT_MS = 3000;
const PLANT_IMAGES_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "imagenes";

const normalizeImageExtension = (mimeType?: string) => {
  const rawExt = mimeType?.split("/")?.[1]?.toLowerCase() || "jpg";
  if (rawExt === "jpeg") return "jpg";
  if (rawExt === "svg+xml") return "svg";
  return rawExt.replace(/[^a-z0-9]/g, "") || "jpg";
};

const uploadScanImageToSupabase = async (
  base64Image: string,
  mimeType?: string
): Promise<string> => {
  const parts = base64Image.split(";base64,");
  const cleanBase = parts.length > 1 ? parts[1] : base64Image;
  const buffer = Buffer.from(cleanBase, "base64");
  const contentType = mimeType || base64Image.match(/^data:([^;]+);base64,/i)?.[1] || "image/jpeg";
  const ext = normalizeImageExtension(contentType);
  const objectPath = `scans/scan-${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

  const { error } = await supabase.storage
    .from(PLANT_IMAGES_BUCKET)
    .upload(objectPath, buffer, {
      contentType,
      upsert: false,
    });

  if (error) {
    throw error;
  }

  const { data } = supabase.storage
    .from(PLANT_IMAGES_BUCKET)
    .getPublicUrl(objectPath);

  return data.publicUrl;
};

const withTimeout = async <T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string
): Promise<T> => {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

// Initialize Gemini Client Lazily/Safely
let aiClient: GoogleGenAI | null = null;
const getGeminiClient = (): GoogleGenAI | null => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("⚠️ Advertencia: GEMINI_API_KEY no está configurada o usa el marcador por defecto.");
    return null;
  }
  if (!aiClient) {
    try {
      aiClient = new GoogleGenAI({
        apiKey: apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      console.log("✅ Cliente Gemini configurado exitosamente.");
    } catch (e) {
      console.error("❌ Error al instanciar el cliente Gemini:", e);
    }
  }
  return aiClient;
};

// Mock standard database of crop results to fallback in case of errors / no API key
const PRESETS_BOTANICAL: Array<{
  name: string;
  scientificName: string;
  origin: string;
  uses: string;
  description: string;
  difficulty: "Fácil" | "Moderado" | "Difícil";
  suggestedPriceSol: number;
  suggestedPriceUsdc: number;
  suggestedPriceUsdt: number;
  category: "Hortalizas" | "Medicinales" | "Frutas" | "Hierbas" | "Otro";
  watering: string;
  sunlight: string;
  idealSowingSeason: string;
  harvestTimeDays: string;
  soilType: string;
  phRecommended: string;
  companionPlants: string;
  pestPrevention: string;
  detectedElement?: string;
  image: string;
}> = [
  {
    name: "Rábano Fast-Grow",
    scientificName: "Raphanus sativus",
    origin: "Eurasia",
    detectedElement: "Raíz",
    uses: "Alimenticio: Consumo en ensaladas, aporta textura crujiente y toque picante. Alto en vitamina C y fibra.",
    description: "Pequeña raíz globosa de color rojo intenso con pulpa blanca, crujiente y refrescante.",
    difficulty: "Fácil",
    suggestedPriceSol: 0.015,
    suggestedPriceUsdc: 0.75,
    suggestedPriceUsdt: 0.75,
    category: "Hortalizas",
    watering: "Riego regular y uniforme para evitar que la raíz se agriete o se ponga demasiado picante.",
    sunlight: "Sol pleno o semisombra.",
    idealSowingSeason: "Primavera, Otoño y finales de Verano.",
    harvestTimeDays: "21 a 30 días",
    soilType: "Suelo suelto, ligero, bien drenado y rico en materia orgánica.",
    phRecommended: "6.0 a 7.0.",
    companionPlants: "Espinaca, lechuga y guisantes. Ayuda a dispersar plagas comunes.",
    pestPrevention: "Proteger con malla anti-insectos en las primeras etapas y vigilar el escarabajo pulga.",
    image: "https://images.unsplash.com/photo-1590005354167-6da97870c913?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Menta Piperita",
    scientificName: "Mentha x piperita",
    origin: "Europa",
    uses: "Medicinal: Alivia espasmos, digestiones difíciles e infusión relajante. Culinario: Aromatizante de licores y postres.",
    description: "Planta herbácea perenne muy aromática, de tallos cuadrangulares rojizos y hojas dentadas con intenso olor a mentol.",
    difficulty: "Fácil",
    suggestedPriceSol: 0.015,
    suggestedPriceUsdc: 0.75,
    suggestedPriceUsdt: 0.75,
    category: "Medicinales",
    watering: "Riego abundante y regular. Prefiere suelos húmedos de forma continua pero con desague óptimo.",
    sunlight: "Sombra parcial o semisombra. Prefiere luz tamizada indirecta.",
    idealSowingSeason: "Principios de Primavera u Otoño (es altamente invasiva, preferir cultivo en macetas separadas).",
    harvestTimeDays: "60 a 70 días tras la siembra.",
    soilType: "Suelo arcilloso o suelto pero muy rico en materia orgánica con alta capacidad de retención de humedad.",
    phRecommended: "6.5 a 7.0.",
    companionPlants: "Repollo, coliflor y lechuga. Repele plagas de orugas. ¡No plantar cerca de manzanilla o perejil!",
    pestPrevention: "Podar a ras de suelo en Otoño para un resurgir vigoroso en Primavera. Controlar caracoles manualmente.",
    detectedElement: "Hojas",
    image: "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Frutilla Silvestre",
    scientificName: "Fragaria vesca",
    origin: "Eurasia",
    uses: "Alimenticio: Consumo fresco, mermeladas y helados. Rica en antioxidantes, ácido fólico y vitamina C.",
    description: "Planta rastrera perenne que produce estolones, hojas trifoliadas dentadas y pequeños frutos rojos muy fragantes y dulces.",
    difficulty: "Moderado",
    suggestedPriceSol: 0.06,
    suggestedPriceUsdc: 2.50,
    suggestedPriceUsdt: 2.50,
    category: "Frutas",
    watering: "Moderado y constante. El método de goteo es excelente para proteger la corona de la planta de pudriciones.",
    sunlight: "Pleno sol para máxima fructificación y sabor dulce, pero tolera algo de semisombra.",
    idealSowingSeason: "A finales de Otoño o principios de Primavera.",
    harvestTimeDays: "90 a 120 días tras la plantación.",
    soilType: "Suelo arenoso rico en humus, bien acolchado con paja seca para evitar que las frutillas toquen la tierra.",
    phRecommended: "5.8 a 6.2.",
    companionPlants: "Espinacas, cebollas y borraja. Evitar plantar cerca de otras solanáceas o brassicas.",
    pestPrevention: "Abonar con compost enriquecido en potasio. Vigilar la aparición de pulgones rociando jabón potásico.",
    detectedElement: "Frutas",
    image: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Helecho Espada Sol",
    scientificName: "Nephrolepis exaltata",
    origin: "Zonas tropicales de América y Asia",
    uses: "Ornamental: Purifica el aire interior capturando formaldehído. Excelente para colgar en canastos.",
    description: "Espectacular planta perenne de frondas arqueadas y plumosas, que aporta un follaje verde y tupido sumamente decorativo.",
    difficulty: "Fácil",
    suggestedPriceSol: 0.03,
    suggestedPriceUsdc: 1.20,
    suggestedPriceUsdt: 1.20,
    category: "Otro",
    watering: "Frecuente para mantener el sustrato constantemente húmedo pero sin encharcar la maceta.",
    sunlight: "Luz indirecta brillante o semisombra. Evitar el sol directo que quema sus delicadas frondas.",
    idealSowingSeason: "Primavera u Otoño húmedo.",
    harvestTimeDays: "Crecimiento constante todo el año",
    soilType: "Sustrato a base de turba, poroso, rico en nutrientes y con excelente drenaje de agua.",
    phRecommended: "5.5 a 6.0.",
    companionPlants: "Orquídeas, potos y otras plantas que disfrutan de alta humedad ambiental.",
    pestPrevention: "Mantener alta humedad pulverizando agua regularmente para ahuyentar a la araña roja.",
    detectedElement: "Plantas",
    image: "https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Pimiento Dulce",
    scientificName: "Capsicum annuum",
    origin: "Mesoamérica",
    uses: "Culinario: Consumo fresco, asado o frito. Fuente excelente de vitaminas A y C esenciales.",
    description: "Fruto hueco de paredes carnosas y jugosas que cambia de verde a colores brillantes rojos, amarillos o naranjas al madurar.",
    difficulty: "Moderado",
    suggestedPriceSol: 0.04,
    suggestedPriceUsdc: 1.50,
    suggestedPriceUsdt: 1.50,
    category: "Hortalizas",
    watering: "Humedad regular. Evitar estrés hídrico durante la floración y el desarrollo del fruto.",
    sunlight: "Pleno sol constante y temperaturas cálidas para un óptimo cuajado de frutos.",
    idealSowingSeason: "Finales de Invierno o principios de Primavera.",
    harvestTimeDays: "70 a 90 días",
    soilType: "Suelo fértil, profundo, rico en materia orgánica y con excelente desague.",
    phRecommended: "6.0 a 6.8.",
    companionPlants: "Albahaca, tomate, cebollas y cilantro de huerto.",
    pestPrevention: "Uso de trampas cromáticas amarillas y pulverización preventiva con jabón potásico para pulgones.",
    detectedElement: "Frutos",
    image: "https://images.unsplash.com/photo-1563861826100-9cb868fdcd1e?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Espinaca Clorofílica",
    scientificName: "Spinacia oleracea",
    origin: "Persia antigua",
    uses: "Alimenticio: Gran aporte de hierro, ácido fólico y clorofila depurativa. Se consume fresca o cocida.",
    description: "Hojas carnosas de color verde oscuro brillante dispuestas en roseta, ricas en clorofila y fitonutrientes saludables.",
    difficulty: "Fácil",
    suggestedPriceSol: 0.02,
    suggestedPriceUsdc: 1.00,
    suggestedPriceUsdt: 1.00,
    category: "Hortalizas",
    watering: "Riego regular y moderado, manteniendo la tierra uniformemente húmeda pero nunca pesada.",
    sunlight: "Semisombra o sol parcial. La luz solar excesiva puede acelerar la producción prematura de semillas.",
    idealSowingSeason: "Otoño y Primavera temprana para disfrutar del clima fresco.",
    harvestTimeDays: "40 a 50 días",
    soilType: "Suelos pesados o francos, muy ricos en nitrógeno orgánico.",
    phRecommended: "6.5 a 7.5.",
    companionPlants: "Frutillas, habas, guisantes y repollo.",
    pestPrevention: "Remover malezas manualmente y controlar orugas con tratamientos con Bacillus thuringiensis de ser necesario.",
    detectedElement: "Clorofila",
    image: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Apio de Sacramento",
    scientificName: "Apium graveolens",
    origin: "Zonas mediterráneas",
    uses: "Culinario: Cocción en caldos, sopas o consumo de tallos crujientes en ensaladas y jugos desintoxicantes.",
    description: "Planta con gruesos tallos acanalados y fibrosos que forman una corona compacta de color verde pálido.",
    difficulty: "Difícil",
    suggestedPriceSol: 0.035,
    suggestedPriceUsdc: 1.40,
    suggestedPriceUsdt: 1.40,
    category: "Hortalizas",
    watering: "Exigente en riego continuo. Necesita humedad constante y un sustrato rico en nutrientes.",
    sunlight: "Semisombra o pleno sol con protección frente a vientos secos.",
    idealSowingSeason: "Primavera para cosecha en Otoño.",
    harvestTimeDays: "120 a 150 días",
    soilType: "Suelo de huerta pesado o arcilloso, muy fértil y retenedor de agua.",
    phRecommended: "6.0 a 7.0.",
    companionPlants: "Cebolla, ajo, coliflor y tomates.",
    pestPrevention: "Abonar intensivamente y pulverizar decocciones de cola de caballo para prevenir hongos.",
    detectedElement: "Tallo",
    image: "https://images.unsplash.com/photo-1610970881699-44a5587cabec?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Manzanilla de la Reina",
    scientificName: "Matricaria chamomilla",
    origin: "Europa y Asia templada",
    uses: "Infusión medicinal: Aliviador gástrico y sedante natural. Antiinflamatorio ocular.",
    description: "Planta herbácea con pequeñas flores similares a margaritas, que emiten una fragancia dulce y relajante.",
    difficulty: "Fácil",
    suggestedPriceSol: 0.02,
    suggestedPriceUsdc: 0.90,
    suggestedPriceUsdt: 0.90,
    category: "Medicinales",
    watering: "Moderado. Soporta muy bien periodos cortos de sequía una vez establecida.",
    sunlight: "Pleno sol para maximizar la concentración de aceites esenciales curativos.",
    idealSowingSeason: "Otoño o Primavera directa a suelo.",
    harvestTimeDays: "60 a 80 días",
    soilType: "Suelo liviano, arenoso y no demasiado fértil.",
    phRecommended: "6.0 a 7.2.",
    companionPlants: "Cebollas, coles y trigo. Mejora el sabor de vecinas aromáticas.",
    pestPrevention: "Evitar suelos pesados que propicien pudrición de raíz. Pulverizar agua con ajo si surge pulgón.",
    detectedElement: "Flor",
    image: "https://images.unsplash.com/photo-1588145293284-cd9d282e4e13?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Girasol de Oro",
    scientificName: "Helianthus annuus",
    origin: "Norteamérica",
    uses: "Culinario: Extracción de aceite de alta cocina y snack saludable de semillas crujientes de girasol.",
    description: "Hermosa e imponente inflorescencia amarilla gigante que sigue la trayectoria solar diaria, albergando cientos de ricas semillas.",
    difficulty: "Fácil",
    suggestedPriceSol: 0.025,
    suggestedPriceUsdc: 1.10,
    suggestedPriceUsdt: 1.10,
    category: "Hierbas",
    watering: "Moderado pero profundo. Tolera sequía moderada gracias a su raíz pivotante larga.",
    sunlight: "Sol directo absoluto (mínimo de 6 a 8 horas diarias prescritas).",
    idealSowingSeason: "Mediados de Primavera, tras desaparecer las heladas.",
    harvestTimeDays: "80 a 110 días",
    soilType: "Suelo suelto y profundo que permita la libre extensión de su raíz.",
    phRecommended: "6.0 a 7.5.",
    companionPlants: "Maíz, pepinos y calabazas montantes.",
    pestPrevention: "Proteger las flores maduras de las aves con mallas finas si se desea conservar las semillas intactas.",
    detectedElement: "Semilla",
    image: "https://images.unsplash.com/photo-1595855759920-86582396756a?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Sangre de Dragón",
    scientificName: "Croton lechleri",
    origin: "Amazonía americana",
    uses: "Medicinal: Cicatrizante ultrapotente de heridas y protector celular cutáneo ante patógenos.",
    description: "Árbol tropical cuya corteza, al ser raspada o cortada, secreta una savia rojiza espesa rica en taspina.",
    difficulty: "Difícil",
    suggestedPriceSol: 0.09,
    suggestedPriceUsdc: 3.50,
    suggestedPriceUsdt: 3.50,
    category: "Medicinales",
    watering: "Riego espaciado simulando las abundantes lluvias de selva.",
    sunlight: "Cálido y húmedo con sol directo filtrado o tamizado.",
    idealSowingSeason: "Estación lluviosa tropical.",
    harvestTimeDays: "Varios años para el desarrollo óptimo de su tronco.",
    soilType: "Suelo de bosque húmedo con abundante humus ácido.",
    phRecommended: "5.0 a 6.0.",
    companionPlants: "Helechos tropicales, bromelias y cacao de monte.",
    pestPrevention: "Tratar plagas fúngicas de hojas tiernas con macerado purificante de ajo y jengibre.",
    detectedElement: "Savia",
    image: "https://images.unsplash.com/photo-1502082553048-f009c37129b9?auto=format&fit=crop&q=80&w=300"
  },
  {
    name: "Hiedra de Pared",
    scientificName: "Hedera helix",
    origin: "Europa, Asia y África",
    uses: "Funcional: Cubrimiento térmico estético de muros e investigación botánica de estomas activos en hojas perennes.",
    description: "Planta trepadora perenne con hojas verdes brillantes coriáceas muy estudiada para revelar estomas microscópicos.",
    difficulty: "Fácil",
    suggestedPriceSol: 0.02,
    suggestedPriceUsdc: 0.85,
    suggestedPriceUsdt: 0.85,
    category: "Otro",
    watering: "Moderado. Dejar secar ligeramente la capa superior de tierra antes del siguiente riego.",
    sunlight: "Prefiere sombra o luz tamizada.",
    idealSowingSeason: "Primavera u Otoño en climas templados.",
    harvestTimeDays: "Crecimiento constante rápido.",
    soilType: "Cualquier suelo bien drenado, tolera suelos pobres en nutrientes.",
    phRecommended: "6.0 a 7.5.",
    companionPlants: "Cualquier planta de sotobosque y helechos.",
    pestPrevention: "Humedecer el follaje para prevenir ácaros y cochinillas en épocas de calor extremo.",
    detectedElement: "Estomas",
    image: "https://images.unsplash.com/photo-1508739773434-c26b3d09e071?auto=format&fit=crop&q=80&w=300"
  }
];

// Memory state to support persistence over developer server session
interface ServerCrop {
  id: string;
  name: string;
  scientificName: string;
  origin: string;
  uses: string;
  description: string;
  difficulty: "Fácil" | "Moderado" | "Difícil";
  image: string;
  priceSol: number;
  priceUsdc: number;
  priceUsdt: number;
  stock: number;
  isForSale: boolean;
  category: "Hortalizas" | "Medicinales" | "Frutas" | "Hierbas" | "Otro";
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

interface ServerLedgerLog {
  id: string;
  timestamp: string;
  cropName: string;
  quantity: number;
  amount: number;
  currency: "SOL" | "USDC" | "USDT";
  signature: string;
  status: "EXITOSO" | "PENDIENTE" | "FALLIDO";
}

const CROPS_FILE = path.join(process.cwd(), "crops_data.json");
const LEDGER_FILE = path.join(process.cwd(), "ledger_data.json");
const VOLUME_FILE = path.join(process.cwd(), "volume_data.json");

// Helper function to resolve high-quality Unsplash image by plant/crop name
function getFallbackImageByPlantName(name: string): string {
  const lowercase = (name || "").toLowerCase();
  
  if (lowercase.includes("cafeto") || lowercase.includes("café") || lowercase.includes("coffee")) {
    return "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&q=80&w=300";
  }
  if (lowercase.includes("caña") || lowercase.includes("sugarcane")) {
    return "https://images.unsplash.com/photo-1543257580-7269da773bf5?auto=format&fit=crop&q=80&w=300";
  }
  if (lowercase.includes("plátano") || lowercase.includes("platano") || lowercase.includes("banano") || lowercase.includes("banana") || lowercase.includes("guineo")) {
    return "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=300";
  }
  if (lowercase.includes("aguacate") || lowercase.includes("avocado") || lowercase.includes("palta")) {
    return "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&q=80&w=300";
  }
  if (lowercase.includes("naranja") || lowercase.includes("orange") || lowercase.includes("cítrico") || lowercase.includes("citrico")) {
    return "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&q=80&w=300";
  }
  if (lowercase.includes("rabano") || lowercase.includes("radish")) {
    return "https://images.unsplash.com/photo-1590005354167-6da97870c913?auto=format&fit=crop&q=80&w=300";
  }
  if (lowercase.includes("menta") || lowercase.includes("mint") || lowercase.includes("piperita")) {
    return "https://images.unsplash.com/photo-1608686207856-001b95cf60ca?auto=format&fit=crop&q=80&w=300";
  }
  if (lowercase.includes("frutilla") || lowercase.includes("fresa") || lowercase.includes("strawberry")) {
    return "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&q=80&w=300";
  }
  
  return `https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?auto=format&fit=crop&q=80&w=300`;
}

function loadCrops(): ServerCrop[] {
  try {
    if (fs.existsSync(CROPS_FILE)) {
      const data = fs.readFileSync(CROPS_FILE, "utf-8");
      const list: ServerCrop[] = JSON.parse(data);
      let updated = false;
      const sanitized = list.map(c => {
        // Purge base64 / excessively large image strings that cause QuotaExceededError
        if (c.image && (c.image.startsWith("data:") || c.image.length > 1000)) {
          c.image = getFallbackImageByPlantName(c.name);
          updated = true;
        }
        return c;
      });
      if (updated) {
        saveCrops(sanitized);
      }
      return sanitized;
    }
  } catch (e) {
    console.error("Error al cargar crops_data.json:", e);
  }
  return [
    {
      id: "crop-2",
      name: "Rábano Fast-Grow",
      detectedElement: "Raíz",
      scientificName: "Raphanus sativus",
      origin: "Eurasia",
      uses: "Alimenticio: Consumo en ensaladas, aporta textura crujiente y toque picante. Alto en vitamina C.",
      description: "Pequeña raíz globosa de color rojo intenso con pulpa blanca, crujiente y refrescante.",
      difficulty: "Fácil",
      image: "https://images.unsplash.com/photo-1590005354167-6da97870c913?auto=format&fit=crop&q=80&w=300",
      priceSol: 0.015,
      priceUsdc: 0.75,
      priceUsdt: 0.75,
      stock: 5,
      isForSale: true,
      category: "Hortalizas",
      watering: "Riego regular y uniforme para evitar que la raíz se agriete o se ponga demasiado picante.",
      sunlight: "Sol pleno o semisombra.",
      idealSowingSeason: "Primavera, Otoño.",
      harvestTimeDays: "21 a 30 días.",
      soilType: "Suelo suelto, ligero, bien drenado.",
      phRecommended: "6.0 a 7.0.",
      companionPlants: "Espinaca, lechuga y guisantes.",
      pestPrevention: "Proteger con malla anti-insectos."
    }
  ];
}

function saveCrops(crops: ServerCrop[]) {
  try {
    fs.writeFileSync(CROPS_FILE, JSON.stringify(crops, null, 2), "utf-8");
  } catch (e) {
    console.error("Error al guardar crops_data.json:", e);
  }
}

function loadLedger(): ServerLedgerLog[] {
  try {
    if (fs.existsSync(LEDGER_FILE)) {
      const data = fs.readFileSync(LEDGER_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (e) {
    console.error("Error al cargar ledger_data.json:", e);
  }
  return [
    {
      id: "tx-1",
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      cropName: "Rábano Fast-Grow",
      quantity: 1,
      amount: 0.75,
      currency: "USDC",
      signature: "5R7P37v6y8X9qZd2B1cK3eHgFdSjKa8s9dF2gH1jK3l7s9z2x3c4v5b6n7m8",
      status: "EXITOSO",
    },
    {
      id: "tx-2",
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      cropName: "Rábano Fast-Grow",
      quantity: 1,
      amount: 0.75,
      currency: "USDT",
      signature: "5R2W9qZd2B1cK3eHgFdSjKa8s9dF2gH1jK3l7s9z2x3c4v5b6n7m8tx3k2l19",
      status: "EXITOSO",
    }
  ];
}

function saveLedger(ledger: ServerLedgerLog[]) {
  try {
    fs.writeFileSync(LEDGER_FILE, JSON.stringify(ledger, null, 2), "utf-8");
  } catch (e) {
    console.error("Error al guardar ledger_data.json:", e);
  }
}

function loadVolume(): number {
  try {
    if (fs.existsSync(VOLUME_FILE)) {
      const data = fs.readFileSync(VOLUME_FILE, "utf-8");
      return Number(data) || 28.62;
    }
  } catch (e) {
    console.error("Error al cargar volume_data.json:", e);
  }
  return 28.62;
}

function saveVolume(volume: number) {
  try {
    fs.writeFileSync(VOLUME_FILE, String(volume), "utf-8");
  } catch (e) {
    console.error("Error al guardar volume_data.json:", e);
  }
}

// Removing local variables
let activeCrops: ServerCrop[] = [];
let paymentLedger: ServerLedgerLog[] = [];
let mockVolumenSalesUsd = 0;

export const app = express();

async function startServer() {
  const REAL_PORT = 3000;

  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));
  app.use((err: any, _req: any, res: any, next: any) => {
    if (!err) {
      return next();
    }

    console.error("Error procesando el cuerpo de la petición:", err);
    const status = err.type === "entity.too.large" ? 413 : 400;
    return res.status(status).json({
      success: false,
      error: status === 413
        ? "La imagen es demasiado grande para procesarla. Intenta con una foto más liviana."
        : "No se pudo interpretar la petición de análisis.",
    });
  });
  app.use("/src/Imagenes", express.static(path.join(process.cwd(), "src", "Imagenes")));
  app.use("/src/imagenes", express.static(path.join(process.cwd(), "src", "imagenes")));

  // API Endpoints
  app.get("/api/crops", async (req, res) => {
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(supabase.from('crops').select('*')),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout consultando cultivos en Supabase.'
      );
      if (error) throw error;
      res.json(data || []);
    } catch (error: any) {
      console.error("Supabase /api/crops GET error:", error.message || error);
      res.status(500).json({ error: "Fallo al conectar con la base de datos (Supabase)." });
    }
  });

  app.post("/api/crops", async (req, res) => {
    const {
      id, name, scientificName, origin, uses, description, difficulty,
      priceSol, priceUsdc, priceUsdt, stock, isForSale, category, image,
      watering, sunlight, idealSowingSeason, harvestTimeDays, soilType,
      phRecommended, companionPlants, pestPrevention, detectedElement
    } = req.body;

    const newCrop = {
      id: id || `crop-${Date.now()}`,
      name: name || "Cultivo Desconocido",
      scientificName: scientificName || "Incognita",
      origin: origin || "Desconocido",
      uses: uses || "No especificado",
      description: description || "No disponible",
      difficulty: (difficulty || "Fácil"),
      image: image || "",
      priceSol: Number(priceSol) || 0.01,
      priceUsdc: Number(priceUsdc) || 0.5,
      priceUsdt: Number(priceUsdt) || 0.5,
      stock: Number(stock) || 5,
      isForSale: isForSale !== undefined ? isForSale : false,
      category: category || "Otro",
      watering: watering || "",
      sunlight: sunlight || "",
      idealSowingSeason: idealSowingSeason || "",
      harvestTimeDays: harvestTimeDays || "",
      soilType: soilType || "",
      phRecommended: phRecommended || "",
      companionPlants: companionPlants || "",
      pestPrevention: pestPrevention || "",
      detectedElement: detectedElement || "Plantas"
    };

    try {
      // Check if exists
      const { data: existing } = await withTimeout(
        Promise.resolve(supabase.from('crops').select('id').eq('id', newCrop.id).maybeSingle()),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout verificando cultivo existente en Supabase.'
      );
      
      if (existing) {
        return res.json(newCrop);
      }

      const { data, error } = await withTimeout(
        Promise.resolve(supabase.from('crops').insert([newCrop]).select()),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout guardando cultivo en Supabase.'
      );
      if (error) throw error;
      
      res.status(201).json(data?.[0] || newCrop);
    } catch (error: any) {
       console.error("Supabase /api/crops POST error:", JSON.stringify(error, null, 2), error.message);
       res.status(500).json({ error: "Error al guardar el cultivo en base de datos. Verifica RLS y tablas." });
    }
  });

  app.put("/api/crops/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { data, error } = await withTimeout(
        Promise.resolve(supabase.from('crops').update(req.body).eq('id', id).select()),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout actualizando cultivo en Supabase.'
      );
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        res.json(data[0]);
      } else {
        res.status(404).json({ error: "Cultivo no encontrado en DB" });
      }
    } catch (error: any) {
      console.error("Supabase /api/crops PUT error:", error);
      res.status(500).json({ error: "Error actualizando el cultivo en DB." });
    }
  });

  app.delete("/api/crops/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { error } = await withTimeout(
        Promise.resolve(supabase.from('crops').delete().eq('id', id)),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout eliminando cultivo en Supabase.'
      );
      if (error) throw error;
      res.json({ success: true });
    } catch (error: any) {
      console.error("Supabase /api/crops DELETE error:", error);
      res.status(500).json({ error: "Error borrando el cultivo en DB." });
    }
  });

  // Payment Ledger Endpoints
  app.get("/api/ledger", async (req, res) => {
    try {
      const { data: ledgerData, error: ledgerError } = await withTimeout(
        Promise.resolve(supabase.from('ledger').select('*').order('timestamp', { ascending: false })),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout consultando ledger en Supabase.'
      );
      if (ledgerError) throw ledgerError;
      
      const { data: volumeData } = await withTimeout(
        Promise.resolve(supabase.from('store_metrics').select('totalSalesUsd').eq('id', 'main').maybeSingle()),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout consultando métricas en Supabase.'
      );
      
      res.json({
        ledger: ledgerData || [],
        totalSalesUsd: volumeData?.totalSalesUsd || 0,
      });
    } catch (error: any) {
      console.error("Supabase /api/ledger GET error:", error);
      res.status(500).json({ error: "Error obteniendo el ledger." });
    }
  });

  app.post("/api/ledger", async (req, res) => {
    const { cropName, quantity, amount, currency, signature, timestamp, id } = req.body;
    
    const newLog = {
      id: id || `tx-${Date.now()}`,
      timestamp: timestamp || new Date().toISOString(),
      cropName: cropName || "Compra de Cultivo",
      quantity: Number(quantity) || 1,
      amount: Number(amount) || 0,
      currency: currency || "SOL",
      signature: signature || Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
      status: "EXITOSO" as const
    };

    let usdValue = newLog.amount;
    if (newLog.currency === "SOL") {
      usdValue = newLog.amount * 150.0;
    }
    
    try {
      const { error } = await withTimeout(
        Promise.resolve(supabase.from('ledger').insert([newLog as any])),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout guardando ledger en Supabase.'
      );
      if (error) throw error;
      
      const newVol = Number((mockVolumenSalesUsd + usdValue).toFixed(2));
      mockVolumenSalesUsd = newVol;
      await withTimeout(
        Promise.resolve(supabase.from('store_metrics').upsert([{ id: 'main', totalSalesUsd: newVol }])),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout actualizando métricas en Supabase.'
      );
      
      res.status(201).json({ log: newLog, totalSalesUsd: newVol });
    } catch (error: any) {
       console.error("Supabase /api/ledger POST error:", error);
       res.status(500).json({ error: "Error guardando el pago." });
    }
  });

  app.delete("/api/ledger", async (req, res) => {
    try {
      await withTimeout(
        Promise.resolve(supabase.from('ledger').delete().neq('id', 'clear_all')),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout limpiando ledger en Supabase.'
      );
      await withTimeout(
        Promise.resolve(supabase.from('store_metrics').upsert([{ id: 'main', totalSalesUsd: 0 }])),
        SUPABASE_QUERY_TIMEOUT_MS,
        'Timeout reiniciando métricas en Supabase.'
      );
      mockVolumenSalesUsd = 0;
      
      res.json({ success: true, totalSalesUsd: 0.00 });
    } catch (error: any) {
      console.error("Supabase /api/ledger DELETE error:", error);
      res.status(500).json({ error: "Error borrando el ledger." });
    }
  });

  // Gemini Scan Helper with exponential retries and fallback model
  async function generateBotanicalContentWithRetry(client: any, imgPart: any, textPart: any, schema: any) {
    const maxAttempts = 2; // Reduced to avoid vercel timeout
    let lastError: any = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const model = attempt === 1 ? "gemini-2.5-flash" : "gemini-1.5-flash";
      console.log(`🤖 [Botanical Analysis] Attempt ${attempt}/${maxAttempts} using model: ${model}`);
      try {
        const response = await client.models.generateContent({
          model: model,
          contents: { parts: [imgPart, textPart] },
          config: {
            systemInstruction: "Eres un asesor agrónomo especializado experto en botánica. Devuelve exclusivamente el esquema JSON solicitado sin textos aclaratorios, markdown fuera del JSON ni introducciones.",
            responseMimeType: "application/json",
            responseSchema: schema,
          },
        });
        if (response && response.text) {
          return response;
        }
        throw new Error("Respuesta vacia");
      } catch (err: any) {
        lastError = err;
        console.log(`[Botanical Analysis] Model ${model} returned error:`, err?.message || err);
        // If we still have attempts, sleep short to avoid vercel limits
        if (attempt < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }
    }
    console.error("Gemini failed after retries:", lastError);
    return null;
  }

  // Scan Plant Endpoint
  app.post("/api/scan-plant", async (req, res) => {
    const { base64Image, mimeType, isPresetSeed, presetIndex, targetElement } = req.body || {};

    // Guardar imagen en el bucket publico de Supabase Storage si se provee.
    let savedImagePath = "";
    if (base64Image && /^data:image\/[a-zA-Z0-9+.-]+;base64,/.test(base64Image)) {
      try {
        savedImagePath = await withTimeout(
          uploadScanImageToSupabase(base64Image, mimeType),
          3500,
          "La subida a Supabase Storage tardó demasiado."
        );
        console.log(`📸 Imagen de escaneo guardada exitosamente en Supabase Storage (${PLANT_IMAGES_BUCKET}): ${savedImagePath}`);
      } catch (err) {
        console.error(`Error al guardar la imagen en Supabase Storage (${PLANT_IMAGES_BUCKET}):`, err);
      }
    }

    // Local quick sandbox preview presets
    if (isPresetSeed) {
      const idx = Number(presetIndex) >= 0 && Number(presetIndex) < PRESETS_BOTANICAL.length ? Number(presetIndex) : 0;
      const item = PRESETS_BOTANICAL[idx];
      return res.json({
        success: true,
        data: item,
        method: "Pregenerado",
      });
    }

    // Direct element override or selective mock pathway
    if (targetElement && targetElement !== "Auto-detectar") {
      const normalizedTarget = targetElement.toLowerCase()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove accents (e.g. raíz -> raiz)
        .replace("clorofilia", "clorofila");

      const matchedPreset = PRESETS_BOTANICAL.find(p => {
        const pElement = (p.detectedElement || "").toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace("clorofilia", "clorofila");
        return pElement === normalizedTarget;
      });

      if (matchedPreset) {
        console.log(`🎯 [Filtro Óptico] Retornando preset pre-integrado exacto para la estructura: ${targetElement}`);
        return res.json({
          success: true,
          data: {
            ...matchedPreset,
            image: savedImagePath || base64Image || matchedPreset.image,
            detectedElement: targetElement // Preserve the exact title requested by the user
          },
          method: "Análisis Óptico Directo",
        });
      }
    }

    const client = getGeminiClient();
    if (!client) {
      console.log("Fallback modo simulación por falta de API Key.");
      let selectedPreset = PRESETS_BOTANICAL[Math.floor(Math.random() * PRESETS_BOTANICAL.length)];
      
      // If a targetElement was requested, try to find a match
      if (targetElement && targetElement !== "Auto-detectar") {
        const normalizedTarget = targetElement.toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace("clorofilia", "clorofila");

        const found = PRESETS_BOTANICAL.find(p => {
          const pElement = (p.detectedElement || "").toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace("clorofilia", "clorofila");
          return pElement === normalizedTarget;
        });
        if (found) {
          selectedPreset = found;
        }
      }

      const item = { ...selectedPreset };
      item.image = savedImagePath || getFallbackImageByPlantName(item.name);
      return res.json({
        success: true,
        data: item,
        method: "Respaldo Local",
        warning: "GEMINI_API_KEY no configurada o no válida. Cargada ficha botánica clasificada para " + (item.detectedElement || "Flora")
      });
    }

    if (!base64Image) {
      return res.status(400).json({ error: "Falta el archivo de imagen base64." });
    }

    try {
      const cleanBase64 = base64Image.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, "");
      const imgPart = {
        inlineData: {
          mimeType: mimeType || "image/jpeg",
          data: cleanBase64,
        },
      };

      const textPart = {
        text: "Analiza y examina detalladamente esta imagen vegetal. Identifica rigurosamente tanto la planta como su estructura o elemento visible principal. Devuelve estrictamente un objeto JSON en español que cumpla con el esquema requerido, asegurando que 'detectedElement' corresponda exactamente a uno de estos once términos según corresponda al aspecto visible en la imagen." +
          (targetElement && targetElement !== "Auto-detectar" ? ` Nota especial: Enfoca prioritariamente la identificación en la estructura vegetal clasificada como: "${targetElement}".` : ""),
      };

      const responseSchema = {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Nombre común de la planta en español" },
          scientificName: { type: Type.STRING, description: "Nombre científico en latín" },
          origin: { type: Type.STRING, description: "Origen geográfico de la planta" },
          uses: { type: Type.STRING, description: "Para qué sirve y sus principales utilidades (comestible, medicinal, etc.) en español" },
          description: { type: Type.STRING, description: "Breve descripción botánica clara y cautivadora en español" },
          difficulty: { type: Type.STRING, description: "Dificultad de cultivo recomendado: 'Fácil', 'Moderado' o 'Difícil'" },
          suggestedPriceSol: { type: Type.NUMBER, description: "Precio sugerido de venta en SOL por ración (entre 0.01 y 0.1)" },
          suggestedPriceUsdc: { type: Type.NUMBER, description: "Precio sugerido en USDC (entre 0.5 y 3.0)" },
          suggestedPriceUsdt: { type: Type.NUMBER, description: "Precio sugerido en USDT (entre 0.5 y 3.0)" },
          category: { type: Type.STRING, description: "Categoría de cultivo: 'Hortalizas', 'Medicinales', 'Frutas', 'Hierbas' o 'Otro'" },
          watering: { type: Type.STRING, description: "Consejos de riego específicos para esta planta en español" },
          sunlight: { type: Type.STRING, description: "Requerimientos de luz solar y clima y exposición ideales en español" },
          idealSowingSeason: { type: Type.STRING, description: "Temporada o época ideal del año recomendada para sembrar en español" },
          harvestTimeDays: { type: Type.STRING, description: "Tiempo estimado (días, semanas, o meses) hasta ver la primera cosecha útil en español" },
          soilType: { type: Type.STRING, description: "Tipo de suelo, sustrato o tierra ideales para el crecimiento en español" },
          phRecommended: { type: Type.STRING, description: "Nivel de pH del suelo recomendado u óptimo" },
          companionPlants: { type: Type.STRING, description: "Plantas compañeras ideales que benefician su crecimiento en español" },
          pestPrevention: { type: Type.STRING, description: "Métodos ecológicos o remedios caseros para prevenir sus plagas habituales en español" },
          detectedElement: { type: Type.STRING, description: "El elemento o estructura vegetal detectado principalmente en la foto. Debe ser estrictamente uno de los siguientes: 'Plantas', 'Frutas', 'Frutos', 'Hojas', 'Clorofila', 'Raíz', 'Tallo', 'Flor', 'Semilla', 'Savia', 'Estomas'." },
        },
        required: [
          "name",
          "scientificName",
          "origin",
          "uses",
          "description",
          "difficulty",
          "suggestedPriceSol",
          "suggestedPriceUsdc",
          "suggestedPriceUsdt",
          "category",
          "watering",
          "sunlight",
          "idealSowingSeason",
          "harvestTimeDays",
          "soilType",
          "phRecommended",
          "companionPlants",
          "pestPrevention",
          "detectedElement",
        ],
      };

      const response = await withTimeout(
        generateBotanicalContentWithRetry(client, imgPart, textPart, responseSchema),
        8000,
        "El análisis de Gemini tardó demasiado."
      );

      if (response && response.text) {
        const parsedData = JSON.parse(response.text.trim());
        // Preserve user scanned local image path when available, otherwise fall back to Unsplash
        parsedData.image = savedImagePath || getFallbackImageByPlantName(parsedData.name);
        res.json({
          success: true,
          data: parsedData,
          method: "Gemini AI",
        });
      } else {
        throw new Error("No text response from Gemini");
      }
    } catch (error: any) {
      console.log("ℹ️ [Gemini Status] Nota: Las peticiones a la API de Gemini están muy congestionadas en este momento. Se ha activado la ficha botánica pre-integrada del invernadero local de forma automática.");
      const randomIndex = Math.floor(Math.random() * PRESETS_BOTANICAL.length);
      const item = { ...PRESETS_BOTANICAL[randomIndex] };
      // Always assign savedImagePath if available, then Unsplash fallback, never the huge base64
      item.image = savedImagePath || getFallbackImageByPlantName(item.name);
      res.json({
        success: true,
        data: item,
        method: "Simulado",
        error: error.message || "Servicio temporalmente congestionado",
      });
    }
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(REAL_PORT, "0.0.0.0", () => {
      console.log(`🚀 Servidor full-stack corriendo en http://localhost:${REAL_PORT}`);
    });
  }
}

startServer();
