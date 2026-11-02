CREATE TYPE public.app_role AS ENUM ('super_admin','manager','cashier','kitchen','waiter');
CREATE TYPE public.order_status AS ENUM ('pending','accepted','preparing','ready','delivered','cancelled');
CREATE TYPE public.order_source AS ENUM ('qr','manual');
CREATE TYPE public.promo_type AS ENUM ('banner','flash','plus_one','free_drink','limited');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  full_name TEXT,
  monthly_salary NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id);
$$;

CREATE OR REPLACE FUNCTION public.can_manage(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','manager'));
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.can_manage(auth.uid()));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "manager profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE POLICY "roles read" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.can_manage(auth.uid()));

CREATE TABLE public.staff_credentials (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.staff_credentials TO service_role;
ALTER TABLE public.staff_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.face_credentials (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label TEXT,
  descriptor DOUBLE PRECISION[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.face_credentials TO service_role;
ALTER TABLE public.face_credentials ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  emoji TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.categories TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "categories public read" ON public.categories FOR SELECT TO anon USING (is_visible);
CREATE POLICY "categories staff read" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories manage" ON public.categories FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  price NUMERIC(12,2) NOT NULL DEFAULT 0,
  old_price NUMERIC(12,2),
  cost_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  badge TEXT,
  is_visible BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_new BOOLEAN NOT NULL DEFAULT false,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "products public read" ON public.products FOR SELECT TO anon USING (is_visible);
CREATE POLICY "products staff read" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products manage" ON public.products FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  type public.promo_type NOT NULL DEFAULT 'banner',
  media_type TEXT NOT NULL DEFAULT 'text',
  media_url TEXT,
  display_seconds INT NOT NULL DEFAULT 5,
  discount_percent INT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT promotions_media_type_check CHECK (media_type IN ('text','image','video'))
);
GRANT SELECT ON public.promotions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.promotions TO authenticated;
GRANT ALL ON public.promotions TO service_role;
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promotions public read" ON public.promotions FOR SELECT TO anon USING (is_active);
CREATE POLICY "promotions staff read" ON public.promotions FOR SELECT TO authenticated USING (true);
CREATE POLICY "promotions manage" ON public.promotions FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE TRIGGER trg_promotions_updated BEFORE UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_no BIGSERIAL,
  table_number TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  notes TEXT,
  status public.order_status NOT NULL DEFAULT 'pending',
  source public.order_source NOT NULL DEFAULT 'qr',
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  order_type TEXT NOT NULL DEFAULT 'dine_in',
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT orders_order_type_check CHECK (order_type IN ('dine_in','delivery'))
);
GRANT INSERT, SELECT ON public.orders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.orders_order_no_seq TO anon, authenticated, service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "orders guest create" ON public.orders FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "orders staff read" ON public.orders FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "orders staff insert" ON public.orders FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "orders staff update" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "orders manager delete" ON public.orders FOR DELETE TO authenticated USING (public.can_manage(auth.uid()));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX idx_orders_status ON public.orders (status);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(12,2) NOT NULL DEFAULT 0,
  unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.order_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.order_items TO authenticated;
GRANT ALL ON public.order_items TO service_role;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "order_items guest create" ON public.order_items FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "order_items staff read" ON public.order_items FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "order_items staff write" ON public.order_items FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "order_items manager delete" ON public.order_items FOR DELETE TO authenticated USING (public.can_manage(auth.uid()));
CREATE INDEX idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX idx_order_items_created_at ON public.order_items (created_at DESC);

CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  spent_on DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expenses TO authenticated;
GRANT ALL ON public.expenses TO service_role;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "expenses staff read" ON public.expenses FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "expenses manage" ON public.expenses FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  salary_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  salary_period TEXT NOT NULL DEFAULT 'monthly',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT employees_period_check CHECK (salary_period IN ('daily','monthly'))
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.employees TO authenticated;
GRANT ALL ON public.employees TO service_role;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employees staff read" ON public.employees FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "employees manage" ON public.employees FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));
CREATE TRIGGER trg_employees_updated BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  restaurant_name TEXT NOT NULL DEFAULT 'Lazzat Fast Food',
  logo_url TEXT,
  address TEXT,
  phone TEXT,
  working_hours TEXT,
  delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  deduct_salaries BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT settings_singleton CHECK (id = 1)
);
GRANT SELECT ON public.settings TO anon;
GRANT SELECT, INSERT, UPDATE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.settings FOR SELECT TO anon USING (true);
CREATE POLICY "settings staff read" ON public.settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings manage" ON public.settings FOR ALL TO authenticated
  USING (public.can_manage(auth.uid())) WITH CHECK (public.can_manage(auth.uid()));

CREATE TABLE public.feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT,
  phone TEXT,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  message TEXT NOT NULL CHECK (char_length(message) BETWEEN 1 AND 2000),
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback TO authenticated;
GRANT ALL ON public.feedback TO service_role;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can leave feedback" ON public.feedback FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Staff can read feedback" ON public.feedback FOR SELECT TO authenticated USING (public.is_staff(auth.uid()));
CREATE POLICY "Staff can update feedback" ON public.feedback FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY "Managers can delete feedback" ON public.feedback FOR DELETE TO authenticated USING (public.can_manage(auth.uid()));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_manage(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_manage(uuid) TO authenticated, service_role;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;
ALTER TABLE public.orders REPLICA IDENTITY FULL;

CREATE POLICY "product images read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'product-images');
CREATE POLICY "product images manage" ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'product-images' AND public.can_manage(auth.uid()))
WITH CHECK (bucket_id = 'product-images' AND public.can_manage(auth.uid()));
CREATE POLICY "media public read" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
CREATE POLICY "media manager insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND public.can_manage(auth.uid()));
CREATE POLICY "media manager update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND public.can_manage(auth.uid())) WITH CHECK (bucket_id = 'media' AND public.can_manage(auth.uid()));
CREATE POLICY "media manager delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND public.can_manage(auth.uid()));

INSERT INTO public.settings (id, restaurant_name, address, phone, working_hours, delivery_fee, tax_percent)
VALUES (1, 'Lazzat Fast Food', 'Toshkent sh., Amir Temur ko''chasi 12', '+998 90 123 45 67', '10:00 - 23:00', 0, 0);

INSERT INTO public.categories (name, slug, emoji, sort_order) VALUES
 ('Lavash','lavash','🌯',1),
 ('Tandir Lavash','tandir-lavash','🔥',2),
 ('Katta Xoddok','katta-xoddok','🌭',3),
 ('Kichik Xoddok','kichik-xoddok','🌭',4),
 ('Burger','burger','🍔',5),
 ('Hot Dog','hot-dog','🌭',6),
 ('Ichimliklar','ichimliklar','🥤',7),
 ('Fries','fries','🍟',8),
 ('Souslar','souslar','🥫',9);

INSERT INTO public.products (category_id, name, description, price, old_price, cost_price, badge, is_popular, is_new, sort_order)
SELECT c.id, v.name, v.descr, v.price, v.old_price, v.cost, v.badge, v.pop, v.isnew, v.ord
FROM (VALUES
 ('lavash','Klassik Lavash','Mol go''shti, pomidor, bodring, maxsus sous',32000,38000,18000,NULL,true,false,1),
 ('lavash','Pishloqli Lavash','Ikki xil pishloq va tovuq go''shti bilan',36000,42000,20000,'+1',true,false,2),
 ('lavash','Achchiq Lavash','Achchiq sous va jalapeño bilan',34000,NULL,19000,NULL,false,true,3),
 ('tandir-lavash','Tandir Lavash Mol','Tandirda pishirilgan non ichida mol go''shti',42000,48000,24000,NULL,true,false,1),
 ('tandir-lavash','Tandir Lavash Tovuq','Tandir noni va marinadlangan tovuq',39000,NULL,22000,NULL,false,true,2),
 ('katta-xoddok','Katta Xoddok Klassik','Uzun bulochka, ikki sosiska, sous',30000,35000,16000,'+1',true,false,1),
 ('katta-xoddok','Katta Xoddok Pishloqli','Erigan chedder pishloq bilan',34000,NULL,18000,NULL,false,false,2),
 ('kichik-xoddok','Kichik Xoddok','Kichik porsiya, tez tayyor',18000,22000,9000,NULL,true,false,1),
 ('kichik-xoddok','Kichik Xoddok Achchiq','Achchiq ketchup va xantal',19000,NULL,9500,NULL,false,true,2),
 ('burger','Cheeseburger','Mol kotleti, chedder, tuzlangan bodring',38000,45000,21000,NULL,true,false,1),
 ('burger','Double Burger','Ikkita kotlet, ikki qavat pishloq',52000,60000,29000,'+1',true,false,2),
 ('burger','Chicken Burger','Xrustashiy tovuq filesi',35000,NULL,19000,NULL,false,true,3),
 ('hot-dog','Hot Dog Klassik','Sosiska, ketchup, mayonez',16000,20000,8000,NULL,true,false,1),
 ('hot-dog','Hot Dog Pishloqli','Pishloq sousi bilan',20000,NULL,10000,NULL,false,false,2),
 ('ichimliklar','Coca-Cola 0.5L','Sovuq gazlangan ichimlik',10000,12000,5000,NULL,true,false,1),
 ('ichimliklar','Fanta 0.5L','Apelsin ta''mli',10000,NULL,5000,NULL,false,false,2),
 ('ichimliklar','Ayron 0.5L','Tabiiy uy ayroni',9000,NULL,4000,NULL,false,true,3),
 ('fries','Fri Kartoshka Kichik','Xrustashiy fri kartoshka',14000,17000,6000,NULL,true,false,1),
 ('fries','Fri Kartoshka Katta','Katta porsiya fri',20000,24000,9000,'+1',false,false,2),
 ('fries','Cheese Fries','Pishloq sousi bilan fri',24000,NULL,11000,NULL,false,true,3),
 ('souslar','Cheese Sous','Erigan pishloq sousi',5000,NULL,2000,NULL,false,false,1),
 ('souslar','Barbekyu Sous','Tutunli BBQ ta''mi',4000,6000,1500,NULL,false,false,2),
 ('souslar','Achchiq Sous','Kuchli achchiq sous',4000,NULL,1500,NULL,false,true,3)
) AS v(slug,name,descr,price,old_price,cost,badge,pop,isnew,ord)
JOIN public.categories c ON c.slug = v.slug;

INSERT INTO public.promotions (title, description, type, media_type, display_seconds, discount_percent, is_active, ends_at) VALUES
 ('Har kuni 20% chegirma','Barcha lavashlarga 20% chegirma. Faqat bugun!','banner','text',5,20,true, now() + interval '7 days'),
 ('Flash Sale: Burgerlar','2 soat davomida burgerlarga super narx','flash','text',5,30,true, now() + interval '2 days'),
 ('1+1 Xoddok','Bitta xoddok oling — ikkinchisi sovg''a','plus_one','text',5,NULL,true, now() + interval '10 days'),
 ('Bepul ichimlik','40 000 so''mdan yuqori buyurtmaga ichimlik sovg''a','free_drink','text',5,NULL,true, now() + interval '5 days');