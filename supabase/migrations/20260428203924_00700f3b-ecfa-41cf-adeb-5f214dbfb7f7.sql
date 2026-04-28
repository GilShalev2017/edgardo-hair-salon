CREATE TYPE public.treatment_type AS ENUM (
  'men_haircut',
  'women_haircut',
  'children_haircut',
  'fringe_bangs',
  'highlights',
  'men_coloring',
  'women_coloring'
);

CREATE TYPE public.hair_length AS ENUM ('short', 'long');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stylist_id UUID NOT NULL DEFAULT auth.uid(),
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT clients_full_name_length CHECK (char_length(full_name) BETWEEN 1 AND 160),
  CONSTRAINT clients_phone_length CHECK (char_length(phone) BETWEEN 3 AND 40),
  CONSTRAINT clients_email_length CHECK (email IS NULL OR char_length(email) <= 255),
  CONSTRAINT clients_stylist_phone_unique UNIQUE (stylist_id, phone)
);

CREATE TABLE public.colors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stylist_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  brand TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT colors_name_length CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT colors_code_length CHECK (char_length(code) BETWEEN 1 AND 80),
  CONSTRAINT colors_brand_length CHECK (brand IS NULL OR char_length(brand) <= 120)
);

CREATE TABLE public.bleach_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stylist_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  strength TEXT,
  brand TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT bleach_name_length CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT bleach_strength_length CHECK (strength IS NULL OR char_length(strength) <= 80),
  CONSTRAINT bleach_brand_length CHECK (brand IS NULL OR char_length(brand) <= 120)
);

CREATE TABLE public.treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stylist_id UUID NOT NULL DEFAULT auth.uid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  treatment_type public.treatment_type NOT NULL,
  hair_length public.hair_length,
  notes TEXT,
  color_ids UUID[] NOT NULL DEFAULT '{}',
  bleach_material_id UUID REFERENCES public.bleach_materials(id) ON DELETE SET NULL,
  price NUMERIC(10,2),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT treatments_notes_length CHECK (notes IS NULL OR char_length(notes) <= 2000),
  CONSTRAINT treatments_price_positive CHECK (price IS NULL OR price >= 0)
);

CREATE TABLE public.sms_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stylist_id UUID NOT NULL DEFAULT auth.uid(),
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT sms_templates_name_length CHECK (char_length(name) BETWEEN 1 AND 120),
  CONSTRAINT sms_templates_message_length CHECK (char_length(message) BETWEEN 1 AND 1000)
);

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bleach_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sms_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stylists can view their own clients" ON public.clients FOR SELECT TO authenticated USING (auth.uid() = stylist_id);
CREATE POLICY "Stylists can create their own clients" ON public.clients FOR INSERT TO authenticated WITH CHECK (auth.uid() = stylist_id);
CREATE POLICY "Stylists can update their own clients" ON public.clients FOR UPDATE TO authenticated USING (auth.uid() = stylist_id) WITH CHECK (auth.uid() = stylist_id);
CREATE POLICY "Stylists can delete their own clients" ON public.clients FOR DELETE TO authenticated USING (auth.uid() = stylist_id);

CREATE POLICY "Stylists can view their own colors" ON public.colors FOR SELECT TO authenticated USING (auth.uid() = stylist_id);
CREATE POLICY "Stylists can create their own colors" ON public.colors FOR INSERT TO authenticated WITH CHECK (auth.uid() = stylist_id);
CREATE POLICY "Stylists can update their own colors" ON public.colors FOR UPDATE TO authenticated USING (auth.uid() = stylist_id) WITH CHECK (auth.uid() = stylist_id);
CREATE POLICY "Stylists can delete their own colors" ON public.colors FOR DELETE TO authenticated USING (auth.uid() = stylist_id);

CREATE POLICY "Stylists can view their own bleach materials" ON public.bleach_materials FOR SELECT TO authenticated USING (auth.uid() = stylist_id);
CREATE POLICY "Stylists can create their own bleach materials" ON public.bleach_materials FOR INSERT TO authenticated WITH CHECK (auth.uid() = stylist_id);
CREATE POLICY "Stylists can update their own bleach materials" ON public.bleach_materials FOR UPDATE TO authenticated USING (auth.uid() = stylist_id) WITH CHECK (auth.uid() = stylist_id);
CREATE POLICY "Stylists can delete their own bleach materials" ON public.bleach_materials FOR DELETE TO authenticated USING (auth.uid() = stylist_id);

CREATE POLICY "Stylists can view their own treatments" ON public.treatments FOR SELECT TO authenticated USING (auth.uid() = stylist_id);
CREATE POLICY "Stylists can create their own treatments" ON public.treatments FOR INSERT TO authenticated WITH CHECK (auth.uid() = stylist_id);
CREATE POLICY "Stylists can update their own treatments" ON public.treatments FOR UPDATE TO authenticated USING (auth.uid() = stylist_id) WITH CHECK (auth.uid() = stylist_id);
CREATE POLICY "Stylists can delete their own treatments" ON public.treatments FOR DELETE TO authenticated USING (auth.uid() = stylist_id);

CREATE POLICY "Stylists can view their own SMS templates" ON public.sms_templates FOR SELECT TO authenticated USING (auth.uid() = stylist_id);
CREATE POLICY "Stylists can create their own SMS templates" ON public.sms_templates FOR INSERT TO authenticated WITH CHECK (auth.uid() = stylist_id);
CREATE POLICY "Stylists can update their own SMS templates" ON public.sms_templates FOR UPDATE TO authenticated USING (auth.uid() = stylist_id) WITH CHECK (auth.uid() = stylist_id);
CREATE POLICY "Stylists can delete their own SMS templates" ON public.sms_templates FOR DELETE TO authenticated USING (auth.uid() = stylist_id);

CREATE INDEX clients_stylist_name_idx ON public.clients (stylist_id, lower(full_name));
CREATE INDEX clients_stylist_phone_idx ON public.clients (stylist_id, phone);
CREATE INDEX treatments_stylist_client_date_idx ON public.treatments (stylist_id, client_id, occurred_at DESC);
CREATE INDEX treatments_color_ids_idx ON public.treatments USING GIN (color_ids);

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_colors_updated_at BEFORE UPDATE ON public.colors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_bleach_materials_updated_at BEFORE UPDATE ON public.bleach_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_treatments_updated_at BEFORE UPDATE ON public.treatments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sms_templates_updated_at BEFORE UPDATE ON public.sms_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();