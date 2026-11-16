-- WIÑAPAY · esquema de Supabase (Postgres + PostGIS)
-- Ejecutar en el editor SQL de Supabase. Luego cargar datos con supabase/seed.sql
-- (generado por scripts/make_seed_sql.py desde src/data).
--
-- Seguridad: la app usa SOLO la clave "anon". Lectura pública de datos; los testimonios y las
-- iniciativas solo pueden insertarse como "pendiente" y con consentimiento. Aprobar o rechazar
-- se hace desde el panel de Supabase (rol de servicio), nunca desde la web pública.

create extension if not exists postgis;

-- ───────── Datos de territorio ─────────
create table if not exists distritos (
  id        text primary key,                       -- IDDIST del INEI (ej. 080101)
  nombre    text not null,
  capital   text,
  centroide double precision[] not null,            -- [lng, lat]
  bbox      double precision[] not null,            -- [x0, y0, x1, y1]
  geom      geometry(Polygon, 4326) not null
);
create index if not exists distritos_geom_idx on distritos using gist (geom);

create table if not exists manchas (
  id           integer primary key,
  distrito     text not null references distritos(id),
  area_ha      numeric(12, 1) not null check (area_ha > 0),
  es_de_prueba boolean not null default true,       -- true mientras no haya MCD64A1 real
  geom         geometry(Polygon, 4326) not null
);
create index if not exists manchas_geom_idx on manchas using gist (geom);
create index if not exists manchas_distrito_idx on manchas (distrito);

-- Una fila por zona (distrito o 'provincia') y agregación; las tres se guardan y reportan juntas.
create table if not exists serie_ndvi (
  zona_id         text not null,
  agregacion      text not null check (agregacion in ('media_anual', 'maximo_anual', 'estacion_seca')),
  serie           numeric[] not null,               -- un valor por año, 2001–2025
  media           numeric not null,
  pendiente_anual numeric not null,                 -- pendiente de Sen (NDVI/año)
  p               numeric not null check (p between 0 and 1),
  tau             numeric not null,
  n               integer not null,
  pixeles         integer not null,
  significativo   boolean not null,                 -- p < 0.05 sin corregir; la regla final vive en la app
  direccion       text not null,
  primary key (zona_id, agregacion)
);

-- ───────── Contenido ciudadano (moderación previa) ─────────
create table if not exists testimonios (
  id              uuid primary key default gen_random_uuid(),
  texto           text not null check (char_length(texto) between 20 and 800),
  nombre          text check (char_length(nombre) <= 60),   -- apodo opcional; no datos personales
  distrito        text references distritos(id),
  consentimiento  boolean not null check (consentimiento),
  estado          text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  creado          timestamptz not null default now()
);

create table if not exists iniciativas (
  id               uuid primary key default gen_random_uuid(),
  titulo           text not null check (char_length(titulo) between 5 and 120),
  organizacion     text check (char_length(organizacion) <= 120),
  distrito         text references distritos(id),
  descripcion      text not null check (char_length(descripcion) between 30 and 1200),
  contacto_privado text check (char_length(contacto_privado) <= 160),   -- solo para moderadores
  consentimiento   boolean not null check (consentimiento),
  estado           text not null default 'pendiente' check (estado in ('pendiente', 'aprobado', 'rechazado')),
  creado           timestamptz not null default now()
);
create index if not exists testimonios_estado_idx on testimonios (estado, creado desc);
create index if not exists iniciativas_estado_idx on iniciativas (estado, creado desc);

-- ───────── Vistas GeoJSON que consume /api/distritos y /api/manchas ─────────
create or replace view distritos_geojson with (security_invoker = true) as
select jsonb_build_object(
  'type', 'Feature',
  'id', id::int,
  'properties', jsonb_build_object('id', id, 'nombre', nombre, 'capital', capital, 'centroide', centroide, 'bbox', bbox),
  'geometry', st_asgeojson(geom)::jsonb
) as feature
from distritos;

create or replace view manchas_geojson with (security_invoker = true) as
select jsonb_build_object(
  'type', 'Feature',
  'id', id,
  'properties', jsonb_build_object('id', id, 'distrito', distrito, 'area_ha', area_ha, 'es_de_prueba', es_de_prueba),
  'geometry', st_asgeojson(geom)::jsonb
) as feature
from manchas;

-- ───────── RLS ─────────
alter table distritos    enable row level security;
alter table manchas      enable row level security;
alter table serie_ndvi   enable row level security;
alter table testimonios  enable row level security;
alter table iniciativas  enable row level security;

create policy "lectura publica" on distritos  for select to anon using (true);
create policy "lectura publica" on manchas    for select to anon using (true);
create policy "lectura publica" on serie_ndvi for select to anon using (true);

create policy "testimonios aprobados son publicos" on testimonios
  for select to anon using (estado = 'aprobado');
create policy "testimonios entran como pendientes" on testimonios
  for insert to anon with check (estado = 'pendiente' and consentimiento);

create policy "iniciativas aprobadas son publicas" on iniciativas
  for select to anon using (estado = 'aprobado');
create policy "iniciativas entran como pendientes" on iniciativas
  for insert to anon with check (estado = 'pendiente' and consentimiento);

-- ───────── Privilegios por columna (el contacto privado nunca sale por la API pública) ─────────
revoke all on distritos, manchas, serie_ndvi, testimonios, iniciativas from anon;
grant select on distritos, manchas, serie_ndvi to anon;
grant select on distritos_geojson, manchas_geojson to anon;

grant select (id, texto, nombre, distrito, creado, estado) on testimonios to anon;
grant insert (texto, nombre, distrito, consentimiento, estado) on testimonios to anon;

grant select (id, titulo, organizacion, distrito, descripcion, creado, estado) on iniciativas to anon;
grant insert (titulo, organizacion, distrito, descripcion, contacto_privado, consentimiento, estado) on iniciativas to anon;
