# SISTEMAIA — Revisión de entregas SolidWorks

Monorepo para administrar alumnos, tareas, rúbricas, calificación de archivos
SolidWorks y retroalimentación personalizada.

## Estructura

```
apps/
  web/    Frontend Svelte (Vite SPA) -> deploy estático en Vercel
  api/    Backend Node.js + Express -> deploy serverless en Vercel
supabase/
  schema.sql   Tablas, RLS y políticas
```

## Stack

- **Frontend:** Svelte 4 + Vite, router por hash, fetch contra el API.
- **Backend:** Node.js + Express. Autenticación propia con **bcrypt**
  (contraseñas hasheadas) + JWT. Datos vía `@supabase/supabase-js`.
- **Base de datos:** Supabase (PostgreSQL + Storage para archivos .SLDPRT/.SLDASM/.PDF).
- **Balance de cargas:** `src/loadBalancer.js` implementa un balanceador
  least-connections con health checks; `src/index.js` lo activa con
  `node:cluster` cuando `CLUSTER_WORKERS > 1` (en Vercel el escalado es
  automático por instancia serverless).

## Nota sobre autenticación

El sistema usa **solamente el backend API** para autenticación (login/registro).
No se utiliza Supabase Auth. El registro de usuarios es público (por defecto
rol 'teacher') y el login se hace vía `/api/auth/login` con JWT.

## Puesta en marcha local

```bash
npm install
cp .env.example .env   # completa las variables
# En Supabase: crea el proyecto y ejecuta supabase/schema.sql en el SQL Editor
# Luego crea el primer admin (ver abajo)

npm run dev:api   # http://localhost:3001
npm run dev:web   # http://localhost:5173
```

### Crear el primer usuario admin

```bash
node apps/api/scripts/create-admin.js admin@correo.com "TuPassword123"
```

## Despliegue en Vercel (monorepo, 2 proyectos)

1. Importa el repo **dos veces** en Vercel:
   - **Proyecto Web:** Root Directory `apps/web`, Framework Vite.
     Env: `VITE_API_URL=https://<tu-api>.vercel.app`
   - **Proyecto API:** Root Directory `apps/api`, Framework "Other".
     Vercel detecta `api/index.js` como función serverless.
     Env: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`,
     `JWT_SECRET`.
2. En Supabase habilita RLS y ajusta las políticas de `schema.sql` si usas
   llaves anon en el cliente (el backend usa service role, que bypasea RLS).

## Flujo de uso

1. Crea alumnos (`/alumnos`).
2. Crea una rúbrica con criterios y puntajes (`/rubricas`).
3. Crea una tarea asignando esa rúbrica (`/tareas`) y registra entregas
   (`/entregas`) con la URL del archivo subido a Supabase Storage.
4. En `/entregas` abre una entrega, califica cada criterio y genera la
   retroalimentación personalizada con el botón **Generar borrador**;
   edítala si quieres y guarda.
