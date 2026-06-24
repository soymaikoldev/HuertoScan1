-- Supabase Schema for Solana Garden

-- 1. Create Crops Table
CREATE TABLE IF NOT EXISTS public.crops (
    "id" TEXT PRIMARY KEY,
    "name" TEXT NOT NULL,
    "scientificName" TEXT,
    "origin" TEXT,
    "uses" TEXT,
    "description" TEXT,
    "difficulty" TEXT,
    "image" TEXT,
    "priceSol" NUMERIC,
    "priceUsdc" NUMERIC,
    "priceUsdt" NUMERIC,
    "stock" INTEGER,
    "isForSale" BOOLEAN DEFAULT false,
    "category" TEXT,
    "watering" TEXT,
    "sunlight" TEXT,
    "idealSowingSeason" TEXT,
    "harvestTimeDays" TEXT,
    "soilType" TEXT,
    "phRecommended" TEXT,
    "companionPlants" TEXT,
    "pestPrevention" TEXT,
    "detectedElement" TEXT
);

-- 2. Create Ledger Table
CREATE TABLE IF NOT EXISTS public.ledger (
    "id" TEXT PRIMARY KEY,
    "timestamp" TEXT NOT NULL,
    "cropName" TEXT NOT NULL,
    "quantity" INTEGER DEFAULT 1,
    "amount" NUMERIC NOT NULL,
    "currency" TEXT NOT NULL,
    "signature" TEXT,
    "status" TEXT
);

-- 3. Create Store Metrics Table
CREATE TABLE IF NOT EXISTS public.store_metrics (
    "id" TEXT PRIMARY KEY,
    "totalSalesUsd" NUMERIC NOT NULL DEFAULT 0
);

-- 4. Enable Row Level Security (RLS) but allow anonymous access for development
ALTER TABLE public.crops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_metrics ENABLE ROW LEVEL SECURITY;

-- 5. Create policies to allow all actions for anonymous users (for development)
DROP POLICY IF EXISTS "Allow anonymous read crops" ON public.crops;
CREATE POLICY "Allow anonymous read crops" ON public.crops FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous insert crops" ON public.crops;
CREATE POLICY "Allow anonymous insert crops" ON public.crops FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anonymous update crops" ON public.crops;
CREATE POLICY "Allow anonymous update crops" ON public.crops FOR UPDATE USING (true);
DROP POLICY IF EXISTS "Allow anonymous delete crops" ON public.crops;
CREATE POLICY "Allow anonymous delete crops" ON public.crops FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow anonymous read ledger" ON public.ledger;
CREATE POLICY "Allow anonymous read ledger" ON public.ledger FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous insert ledger" ON public.ledger;
CREATE POLICY "Allow anonymous insert ledger" ON public.ledger FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anonymous delete ledger" ON public.ledger;
CREATE POLICY "Allow anonymous delete ledger" ON public.ledger FOR DELETE USING (true);

DROP POLICY IF EXISTS "Allow anonymous read metrics" ON public.store_metrics;
CREATE POLICY "Allow anonymous read metrics" ON public.store_metrics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anonymous insert metrics" ON public.store_metrics;
CREATE POLICY "Allow anonymous insert metrics" ON public.store_metrics FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anonymous update metrics" ON public.store_metrics;
CREATE POLICY "Allow anonymous update metrics" ON public.store_metrics FOR UPDATE USING (true);

-- 6. Storage Bucket setup for 'imagenes'
-- Important: You must run this in the Supabase SQL Editor
INSERT INTO storage.buckets (id, name, public) VALUES ('imagenes', 'imagenes', true) ON CONFLICT DO NOTHING;

-- Storage RLS Policies
DROP POLICY IF EXISTS "Allow public read imagenes" ON storage.objects;
CREATE POLICY "Allow public read imagenes" ON storage.objects FOR SELECT USING (bucket_id = 'imagenes');
DROP POLICY IF EXISTS "Allow public insert imagenes" ON storage.objects;
CREATE POLICY "Allow public insert imagenes" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'imagenes');
DROP POLICY IF EXISTS "Allow public update imagenes" ON storage.objects;
CREATE POLICY "Allow public update imagenes" ON storage.objects FOR UPDATE USING (bucket_id = 'imagenes');
DROP POLICY IF EXISTS "Allow public delete imagenes" ON storage.objects;
CREATE POLICY "Allow public delete imagenes" ON storage.objects FOR DELETE USING (bucket_id = 'imagenes');

