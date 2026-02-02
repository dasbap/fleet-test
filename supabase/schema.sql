-- =====================================================
-- E-SAMBA DATABASE SCHEMA
-- Execute this SQL in your Supabase SQL Editor
-- =====================================================

-- 1. ENUM TYPES
-- =====================================================
CREATE TYPE public.app_role AS ENUM ('organizer', 'manager', 'driver', 'mechanic');
CREATE TYPE public.vehicle_status AS ENUM ('active', 'maintenance', 'blocked', 'inactive');
CREATE TYPE public.incident_status AS ENUM ('reported', 'validated', 'in_progress', 'resolved', 'rejected');
CREATE TYPE public.incident_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.shift_status AS ENUM ('active', 'closed', 'cancelled');
CREATE TYPE public.collection_mode AS ENUM ('cash', 'momo', 'orange', 'mixed');

-- 2. ORGANIZATIONS TABLE
-- =====================================================
CREATE TABLE public.orgs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orgs ENABLE ROW LEVEL SECURITY;

-- 3. FLEETS TABLE
-- =====================================================
CREATE TABLE public.fleets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.fleets ENABLE ROW LEVEL SECURITY;

-- 4. PROFILES TABLE (extends auth.users)
-- =====================================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 5. USER ROLES TABLE (separate from profiles for security)
-- =====================================================
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    org_id UUID REFERENCES public.orgs(id) ON DELETE CASCADE,
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, role, org_id, fleet_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 6. FLEET MEMBERSHIPS TABLE
-- =====================================================
CREATE TABLE public.fleet_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE CASCADE NOT NULL,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, fleet_id)
);

ALTER TABLE public.fleet_memberships ENABLE ROW LEVEL SECURITY;

-- 7. VEHICLES TABLE
-- =====================================================
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE CASCADE NOT NULL,
    plate_number TEXT NOT NULL,
    brand TEXT,
    model TEXT,
    year INTEGER,
    current_km INTEGER DEFAULT 0,
    status vehicle_status DEFAULT 'active',
    status_reason TEXT,
    daily_target DECIMAL(10,2) DEFAULT 0,
    score INTEGER DEFAULT 100,
    qr_code TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (fleet_id, plate_number)
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

-- 8. DRIVER VEHICLE ASSIGNMENTS
-- =====================================================
CREATE TABLE public.driver_vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    unassigned_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    UNIQUE (driver_id, vehicle_id, is_active)
);

ALTER TABLE public.driver_vehicle_assignments ENABLE ROW LEVEL SECURITY;

-- 9. DRIVER SHIFTS TABLE
-- =====================================================
CREATE TABLE public.driver_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE CASCADE NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    start_km INTEGER NOT NULL,
    end_km INTEGER,
    status shift_status DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.driver_shifts ENABLE ROW LEVEL SECURITY;

-- 10. DRIVER SHIFT CLOSURES TABLE
-- =====================================================
CREATE TABLE public.driver_shift_closures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID REFERENCES public.driver_shifts(id) ON DELETE CASCADE NOT NULL,
    driver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    end_km INTEGER NOT NULL,
    total_revenue DECIMAL(10,2) NOT NULL,
    collection_mode collection_mode NOT NULL,
    cash_amount DECIMAL(10,2) DEFAULT 0,
    momo_amount DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.driver_shift_closures ENABLE ROW LEVEL SECURITY;

-- 11. INCIDENTS TABLE
-- =====================================================
CREATE TABLE public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE CASCADE NOT NULL,
    reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    validated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    severity incident_severity DEFAULT 'medium',
    status incident_status DEFAULT 'reported',
    location TEXT,
    photo_urls TEXT[],
    validation_notes TEXT,
    reported_at TIMESTAMPTZ DEFAULT NOW(),
    validated_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;

-- 12. MAINTENANCE JOBS TABLE
-- =====================================================
CREATE TABLE public.maintenance_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_id UUID REFERENCES public.incidents(id) ON DELETE SET NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
    fleet_id UUID REFERENCES public.fleets(id) ON DELETE CASCADE NOT NULL,
    assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT,
    priority incident_severity DEFAULT 'medium',
    status TEXT DEFAULT 'pending',
    estimated_cost DECIMAL(10,2),
    actual_cost DECIMAL(10,2),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.maintenance_jobs ENABLE ROW LEVEL SECURITY;

-- 13. AUDIT LOGS TABLE
-- =====================================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    org_id UUID REFERENCES public.orgs(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    table_name TEXT,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- SECURITY DEFINER FUNCTIONS
-- =====================================================

-- Function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.user_roles
        WHERE user_id = _user_id
          AND role = _role
    )
$$;

-- Function to get user's fleet IDs
CREATE OR REPLACE FUNCTION public.get_user_fleet_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT fleet_id FROM public.fleet_memberships WHERE user_id = _user_id
    UNION
    SELECT fleet_id FROM public.user_roles WHERE user_id = _user_id AND fleet_id IS NOT NULL
$$;

-- Function to get user's org IDs
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT org_id FROM public.user_roles WHERE user_id = _user_id AND org_id IS NOT NULL
$$;

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- PROFILES POLICIES
CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

-- USER ROLES POLICIES (only organizers can manage)
CREATE POLICY "Users can view own roles"
    ON public.user_roles FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Organizers can manage roles in their org"
    ON public.user_roles FOR ALL
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'organizer') 
        AND org_id IN (SELECT public.get_user_org_ids(auth.uid()))
    );

-- ORGS POLICIES
CREATE POLICY "Members can view their org"
    ON public.orgs FOR SELECT
    TO authenticated
    USING (id IN (SELECT public.get_user_org_ids(auth.uid())));

CREATE POLICY "Organizers can update their org"
    ON public.orgs FOR UPDATE
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'organizer')
        AND id IN (SELECT public.get_user_org_ids(auth.uid()))
    );

-- FLEETS POLICIES
CREATE POLICY "Members can view their fleets"
    ON public.fleets FOR SELECT
    TO authenticated
    USING (id IN (SELECT public.get_user_fleet_ids(auth.uid())));

CREATE POLICY "Organizers can manage fleets in their org"
    ON public.fleets FOR ALL
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'organizer')
        AND org_id IN (SELECT public.get_user_org_ids(auth.uid()))
    );

-- VEHICLES POLICIES
CREATE POLICY "Fleet members can view vehicles"
    ON public.vehicles FOR SELECT
    TO authenticated
    USING (fleet_id IN (SELECT public.get_user_fleet_ids(auth.uid())));

CREATE POLICY "Managers can manage vehicles"
    ON public.vehicles FOR ALL
    TO authenticated
    USING (
        (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'manager'))
        AND fleet_id IN (SELECT public.get_user_fleet_ids(auth.uid()))
    );

-- DRIVER SHIFTS POLICIES
CREATE POLICY "Drivers can view own shifts"
    ON public.driver_shifts FOR SELECT
    TO authenticated
    USING (driver_id = auth.uid());

CREATE POLICY "Drivers can manage own shifts"
    ON public.driver_shifts FOR INSERT
    TO authenticated
    WITH CHECK (driver_id = auth.uid());

CREATE POLICY "Managers can view fleet shifts"
    ON public.driver_shifts FOR SELECT
    TO authenticated
    USING (
        (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'manager'))
        AND fleet_id IN (SELECT public.get_user_fleet_ids(auth.uid()))
    );

-- SHIFT CLOSURES POLICIES
CREATE POLICY "Drivers can manage own closures"
    ON public.driver_shift_closures FOR ALL
    TO authenticated
    USING (driver_id = auth.uid());

CREATE POLICY "Managers can view fleet closures"
    ON public.driver_shift_closures FOR SELECT
    TO authenticated
    USING (
        (public.has_role(auth.uid(), 'organizer') OR public.has_role(auth.uid(), 'manager'))
        AND vehicle_id IN (
            SELECT id FROM public.vehicles 
            WHERE fleet_id IN (SELECT public.get_user_fleet_ids(auth.uid()))
        )
    );

-- INCIDENTS POLICIES
CREATE POLICY "Fleet members can view incidents"
    ON public.incidents FOR SELECT
    TO authenticated
    USING (fleet_id IN (SELECT public.get_user_fleet_ids(auth.uid())));

CREATE POLICY "Drivers can report incidents"
    ON public.incidents FOR INSERT
    TO authenticated
    WITH CHECK (
        reported_by = auth.uid()
        AND fleet_id IN (SELECT public.get_user_fleet_ids(auth.uid()))
    );

CREATE POLICY "Mechanics can validate incidents"
    ON public.incidents FOR UPDATE
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'mechanic')
        AND fleet_id IN (SELECT public.get_user_fleet_ids(auth.uid()))
    );

-- MAINTENANCE JOBS POLICIES
CREATE POLICY "Fleet members can view maintenance jobs"
    ON public.maintenance_jobs FOR SELECT
    TO authenticated
    USING (fleet_id IN (SELECT public.get_user_fleet_ids(auth.uid())));

CREATE POLICY "Mechanics can manage maintenance jobs"
    ON public.maintenance_jobs FOR ALL
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'mechanic')
        AND fleet_id IN (SELECT public.get_user_fleet_ids(auth.uid()))
    );

-- AUDIT LOGS POLICIES (only organizers can view)
CREATE POLICY "Organizers can view audit logs"
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        public.has_role(auth.uid(), 'organizer')
        AND org_id IN (SELECT public.get_user_org_ids(auth.uid()))
    );

-- =====================================================
-- TRIGGERS FOR AUTO-PROFILE CREATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX idx_vehicles_fleet_id ON public.vehicles(fleet_id);
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_driver_shifts_driver_id ON public.driver_shifts(driver_id);
CREATE INDEX idx_driver_shifts_vehicle_id ON public.driver_shifts(vehicle_id);
CREATE INDEX idx_incidents_fleet_id ON public.incidents(fleet_id);
CREATE INDEX idx_incidents_status ON public.incidents(status);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_fleet_memberships_user_id ON public.fleet_memberships(user_id);
