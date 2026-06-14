CREATE TABLE public.crops (
  id text PRIMARY KEY,
  name text,
  "scientificName" text,
  origin text,
  uses text,
  description text,
  difficulty text,
  image text,
  "priceSol" numeric,
  "priceUsdc" numeric,
  "priceUsdt" numeric,
  stock numeric,
  "isForSale" boolean,
  category text,
  watering text,
  sunlight text,
  "idealSowingSeason" text,
  "harvestTimeDays" text,
  "soilType" text,
  "phRecommended" text,
  "companionPlants" text,
  "pestPrevention" text,
  "detectedElement" text
);

CREATE TABLE public.ledger (
  id text PRIMARY KEY,
  timestamp text,
  "cropName" text,
  quantity numeric,
  amount numeric,
  currency text,
  signature text,
  status text
);

CREATE TABLE public.store_metrics (
  id text PRIMARY KEY,
  "totalSalesUsd" numeric
);

INSERT INTO public.store_metrics (id, "totalSalesUsd") VALUES ('main', 0) ON CONFLICT DO NOTHING;

-- Si tienes problemas con "violates row-level security policy", ejecuta esto:
ALTER TABLE public.crops DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_metrics DISABLE ROW LEVEL SECURITY;
