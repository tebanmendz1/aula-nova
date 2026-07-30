# AulaNova

Plataforma de aula virtual autohospedada para administradores, docentes y alumnos. Incluye autenticación, aulas, matrículas por código, módulos, lecciones, archivos privados en MinIO, actividades, entregas, calificaciones, cuestionarios, foros, simulaciones interactivas embebidas, calendario, anuncios, progreso y notificaciones.

Las tareas usan un flujo de borrador y envío definitivo: el alumno puede editar mientras trabaja, la entrega queda bloqueada al enviarse y el docente puede calificarla, dar retroalimentación o reabrirla. El centro de actividades muestra estados, vencimientos y pendientes por rol.

Las simulaciones se añaden como recurso de tipo **Simulación interactiva** usando una URL embebible o cargando un paquete SCORM `.zip`/`.rar` que contenga `imsmanifest.xml` en su raíz. AulaNova valida el manifiesto, extrae el paquete en MinIO y lo ejecuta en una ventana aislada dentro del aula. El límite es 50 MB comprimidos y 150 MB extraídos.

## Desarrollo y validación

```bash
npm install
npx prisma generate
npm run dev
npm test
npm run build
```

## EasyPanel

- Aplicación: repositorio GitHub, Dockerfile, puerto interno `3000` y protocolo de destino **HTTP**.
- PostgreSQL: use el host interno que muestra EasyPanel y el puerto 5432.
- MinIO/S3: use el host interno y puerto real del servicio; cree el bucket privado `aula-recursos`.
- Dominio: HTTPS público activado; destino HTTP, puerto 3000, path `/`.
- Health check: método GET, path `/api/health`, puerto 3000, intervalo 10 segundos, timeout 4 segundos, periodo inicial 45 segundos y 6 reintentos. La imagen también incluye este health check, por lo que EasyPanel debe mantener el contenedor anterior hasta que el nuevo esté saludable.

El contenedor ejecuta `prisma migrate deploy` antes de iniciar Next.js. El despliegue correcto termina con `Ready` y `/api/health` responde HTTP 200.

## Variables de producción

```dotenv
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_NAME=AulaNova
APP_URL=https://TU-DOMINIO
DATABASE_URL=postgresql://USUARIO:CONTRASEÑA@HOST_POSTGRES:5432/BASE?sslmode=disable
AUTH_SECRET=SECRETO_ALEATORIO_DE_64_BYTES
INITIAL_ADMIN_EMAIL=admin@tudominio.com
REQUIRE_EMAIL_VERIFICATION=true
SMTP_HOST=smtp.proveedor.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=usuario
SMTP_PASSWORD=contraseña
MAIL_FROM=AulaNova <no-reply@tudominio.com>
S3_ENDPOINT=http://HOST_MINIO:9000
S3_REGION=us-east-1
S3_BUCKET=aula-recursos
S3_ACCESS_KEY=usuario-minio
S3_SECRET_KEY=contraseña-minio
```

Nunca guarde secretos en Git. Sin SMTP, las cuentas se verifican automáticamente. Para exigir verificación configure SMTP y `REQUIRE_EMAIL_VERIFICATION=true`.

## Primer acceso

1. Defina `INITIAL_ADMIN_EMAIL` antes del primer registro.
2. Registre exactamente ese correo en `/registro`; será el administrador inicial.
3. Desde **Usuarios**, asigne el rol docente y active o suspenda cuentas.
4. Los docentes crean aulas y comparten el código; los alumnos se matriculan desde **Mis aulas**.

## Operación y respaldo

- Programe copias externas diarias de PostgreSQL y MinIO.
- Conserve al menos siete respaldos y pruebe restauraciones periódicamente.
- Antes de actualizar: respaldo, despliegue, prueba de health, login y descarga de archivo.
- Para revertir, redespliegue el commit anterior; no revierta la base sin respaldo.
- Revise logs de autenticación, SMTP y S3.

## Seguridad

Cookies HTTP-only, JWT firmado, bcrypt, tokens hasheados con vencimiento, Zod, acceso por aula, archivos privados, límites de intentos y cabeceras CSP/anti-frame. `npm audit` actualmente señala dependencias internas de Next 15 y propone degradar a Next 9.3.3; no aplique esa corrección automática. Evalúe la siguiente actualización estable compatible del framework.
