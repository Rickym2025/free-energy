-- 1. Tabella delle Aziende Clienti (Multi-tenant White-Label)
CREATE TABLE IF NOT EXISTS tenants (
    id TEXT PRIMARY KEY, -- Es: 'sipro-energy' o UUID
    company_name VARCHAR(255) NOT NULL,
    logo_url TEXT,
    brand_color_hex VARCHAR(7) DEFAULT '#0284c7', -- Colore primario (Sky-600 di default)
    notification_email TEXT,
    phone VARCHAR(50),
    address TEXT,
    credits INT NOT NULL DEFAULT 10000, -- Crediti iniziali inclusi
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Tabella dei Lead/Clienti Finali (Alimentata sia da Dashboard che da Widget esterno)
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    address TEXT NOT NULL,
    monthly_bill_euro NUMERIC(10, 2), -- Bolletta media mensile inserita dal cliente
    notes TEXT,
    status VARCHAR(50) DEFAULT 'nuovo' NOT NULL, -- 'nuovo', 'contattato', 'sopralluogo', 'preventivato', 'chiuso'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Tabella dei Report Fotovoltaici Generati
CREATE TABLE IF NOT EXISTS pv_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL, -- Collegabile opzionalmente a un lead
    address TEXT NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    roof_area_sqm NUMERIC(10, 2) NOT NULL, -- Calcolata con il tracciamento sulla mappa
    estimated_power_kwp NUMERIC(10, 2) NOT NULL, -- Potenza dell'impianto stimata (kWp)
    annual_production_kwh NUMERIC(10, 2) NOT NULL, -- Ricavato dalle API PVGIS
    estimated_cost_euro NUMERIC(10, 2), -- Costo indicativo dell'impianto
    annual_savings_euro NUMERIC(10, 2), -- Risparmio stimato in bolletta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 4. Tabella per la Valutazione dei CV (HR AI)
CREATE TABLE IF NOT EXISTS cv_candidates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    candidate_name VARCHAR(255) NOT NULL,
    applied_role VARCHAR(255) NOT NULL, -- Es: 'Installatore Senior', 'Elettricista'
    cv_file_url TEXT NOT NULL, -- URL del file PDF su storage Supabase
    score INT CHECK (score >= 0 AND score <= 100), -- Voto AI di compatibilità (0-100)
    ai_analysis_json JSONB, -- Feedback strutturato generato da OpenAI (Punti di forza, debolezza)
    status VARCHAR(50) DEFAULT 'da_valutare' NOT NULL, -- 'da_valutare', 'colloquio', 'assunto', 'scartato'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 5. Tabella delle Transazioni dei Crediti (Log storico e immutabile)
CREATE TABLE IF NOT EXISTS credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id TEXT REFERENCES tenants(id) ON DELETE CASCADE NOT NULL,
    amount INT NOT NULL, -- Positivo (ricarica) o Negativo (consumo modulo)
    description TEXT NOT NULL, -- Es: 'Generazione Report Via Roma', 'Screening CV Mario Rossi'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 6. Trigger automatico per l'aggiornamento in tempo reale del bilancio crediti del Tenant
CREATE OR REPLACE FUNCTION update_tenant_credits_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE tenants
    SET credits = credits + NEW.amount
    WHERE id = NEW.tenant_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_credits
AFTER INSERT ON credit_transactions
FOR EACH ROW
EXECUTE FUNCTION update_tenant_credits_on_transaction();
