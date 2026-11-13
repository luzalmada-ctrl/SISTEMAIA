# Instrucciones de Despliegue en Vercel

## Variables de Entorno Necesarias

Debes configurar estas variables de entorno en Vercel para el servicio **api**:

1. Ve a tu proyecto en Vercel
2. Navega a Settings > Environment Variables
3. Selecciona el servicio "api"
4. Agrega las siguientes variables:

### Variables del API (servicio api):
```
SUPABASE_URL=https://ugpzcuwwanzerdnaftuq.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncHpjdXd3YW56ZXJkbmFmdHVxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5NDQ5NjgzOSwiZXhwIjoyMTEwMDcyODM5fQ.cPcP7FGI3BKjJzrEi2OMHrMbvseobQp-XwJy3yPOAw8
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVncHpjdXd3YW56ZXJkbmFmdHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQ0OTY4MzksImV4cCI6MjExMDA3MjgzOX0.-ikdZJ1d5ItztJk1ojQS9nRQXjak583JGOysYB8smbs
JWT_SECRET=cambia-esto-por-una-clave-segura-larga-y-aleatoria
NODE_ENV=production
PORT=3001
CORS_ORIGIN=*
```

**IMPORTANTE:** Cambia `JWT_SECRET` por una clave segura en producción. Puedes generar una con:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

## Solución del error "Failed to fetch"

El error "Failed to fetch" al iniciar sesión se debe a que:

1. **El frontend no puede conectar con el backend** - Verifica que las variables de entorno estén configuradas en Vercel
2. **Los rewrites en vercel.json** - Ya han sido corregidos para usar `/api/:path*` en lugar de `/api/(.*)`
3. **Detección automática de entorno** - El frontend ahora detecta automáticamente si está en Vercel y usa rutas relativas

## Pasos para corregir el despliegue:

1. **Configura las variables de entorno** en Vercel (como se indica arriba)
2. **Redespliega el proyecto** desde Vercel
3. **Verifica que el servicio API esté funcionando** visitando `https://tu-proyecto.vercel.app/api/health`
4. **Prueba el login** en la aplicación

## Troubleshooting

Si sigues teniendo problemas:

1. Revisa los logs del servicio API en Vercel (Functions > api)
2. Verifica que la URL del health check responda: `https://tu-proyecto.vercel.app/api/health`
3. Asegúrate de que el binding de servicio está configurado correctamente en `vercel.json`
4. Verifica que CORS_ORIGIN permite tu dominio de Vercel (o usa `*` para desarrollo)
