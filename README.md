# My Liga MX

V1 de una aplicación móvil enfocada exclusivamente en la Liga MX. Está construida con Expo, React Native, TypeScript, Expo Router, TanStack Query y Supabase.

## Funcionalidades

- Registro, login, persistencia de sesión y logout con Supabase Auth.
- Selección y persistencia del equipo favorito.
- Inicio personalizado con próximo partido, último resultado, tabla resumida y noticias.
- Partidos por estado: todos, en vivo, próximos y finalizados.
- Detalle de partido con eventos y estadísticas cuando API-Football los entrega.
- Tabla de posiciones y detalle de equipos.
- Noticias de Liga MX o del equipo favorito mediante GNews.
- Perfil, preferencias de notificaciones y tema claro/oscuro/sistema.
- Estados de loading, error, vacío, refresh manual y fallback de imágenes.

## Stack y arquitectura

La UI vive en `app/` y los componentes reutilizables en `components/`. Las consultas pasan por hooks de TanStack Query (`src/hooks`) y servicios separados (`src/services`). El cliente móvil invoca funciones de Supabase; las claves de API-Football y GNews permanecen en Edge Functions.

## Requisitos

- Node.js compatible con Expo SDK 57.
- Cuenta de Supabase.
- Proyecto de API-Football con acceso a la Liga MX.
- Clave de GNews para noticias.
- Expo Go en el dispositivo móvil.

## Instalación local

```bash
npm install
copy .env.example .env
npm run start
```

Después de configurar Supabase, abre el QR desde Expo Go. Para verificar TypeScript:

```bash
npm run typecheck
```

## Variables de entorno

En `.env` del cliente:

- `EXPO_PUBLIC_SUPABASE_URL`: URL del proyecto Supabase.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: clave pública anon de Supabase.
- `EXPO_PUBLIC_LEAGUE_SEASON`: temporada que API-Football permite consultar; por defecto `2024`.

Las claves privadas no van en `.env` del cliente. Configúralas server-side:

```bash
supabase secrets set API_FOOTBALL_KEY=tu_clave
supabase secrets set GNEWS_API_KEY=tu_clave
supabase functions deploy football-proxy
supabase functions deploy news-proxy
```

## Configuración de Supabase

1. Crea un proyecto y habilita Email/Password en Authentication.
2. Ejecuta `supabase/migrations/001_profiles_preferences.sql` en el SQL Editor.
3. Despliega las dos Edge Functions de `supabase/functions`.
4. Copia la URL y la anon key a `.env`.

La migración crea `profiles`, `user_preferences`, trigger de alta de usuario y políticas RLS para que cada usuario solo pueda consultar/modificar sus propios registros.

## API-Football y temporadas

La liga está centralizada en `src/config.ts` con `leagueId = 262` y temporada `2024` durante desarrollo. El plan gratuito puede no permitir algunas temporadas, incluyendo 2026. La app conserva la arquitectura y muestra errores amigables si la temporada, el rate limit o el plan no están disponibles.

## Estructura principal

```text
app/                         Rutas Expo Router
components/                  UI reutilizable
src/config.ts                Liga, temporada y configuración
src/context/                 Sesión y perfil
src/hooks/                   Queries de TanStack Query
src/services/apiFootball/    Cliente, mappers y servicios de fútbol
src/services/news/           Servicio de noticias
src/services/profile/        Perfil y preferencias
src/theme/                   Tokens y tema
supabase/migrations/         SQL y RLS
supabase/functions/          Proxies seguros server-side
```

## Limitaciones conocidas

Sin Supabase y las claves server-side configuradas, la app arranca y permite revisar la navegación/UI, pero no puede autenticar ni consultar datos reales. La disponibilidad de fixtures, eventos, estadísticas, standings y temporadas depende del plan de API-Football. GNews puede devolver cero artículos, imágenes faltantes o límites de uso; esos casos tienen estados vacíos y fallback.

## Futuras mejoras

Tests de integración con fixtures de respuesta, caché offline más amplia, notificaciones push reales y observabilidad server-side son candidatos posteriores; no forman parte de esta V1.
