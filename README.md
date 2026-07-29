# AulaNova

Primera base funcional de una aula virtual autohospedada para administradores, docentes y alumnos.

## Desarrollo local

```bash
npm install
npx prisma generate
npm run dev
```

La aplicación se abre en `http://localhost:3000`.

## Variables de entorno

Copia `.env.example` a `.env` y reemplaza todas las credenciales. Nunca publiques el archivo `.env`.

## Despliegue en EasyPanel

1. Crea un proyecto llamado `aula-nova`.
2. Añade un servicio PostgreSQL llamado `aula-db` y crea la base `aula_virtual`.
3. Añade MinIO como servicio de almacenamiento y crea el bucket privado `aula-recursos`.
4. Crea un servicio App desde este repositorio. EasyPanel detectará el `Dockerfile`.
5. Configura el puerto de proxy `3000` y asigna el dominio de la plataforma.
6. Añade las variables indicadas en `.env.example` usando los nombres internos de los servicios.
7. Configura la comprobación de salud en `/api/health`.
8. Antes del primer lanzamiento, ejecuta `npx prisma migrate deploy` con acceso a la base de datos.
9. Activa copias de seguridad externas tanto para PostgreSQL como para el almacenamiento de archivos.

## Estado de esta iteración

- Panel principal adaptable a escritorio y móvil.
- Vistas contextuales de administrador, docente y alumno.
- Registro público de alumnos e inicio de sesión seguro.
- Sesiones firmadas mediante cookies HTTP-only y cierre de sesión.
- Búsqueda de aulas.
- Agenda, estadísticas, progreso y próximas actividades.
- Flujo inicial para crear aulas, registrar usuarios o matricularse.
- Modelo relacional completo en Prisma.
- Imagen Docker optimizada para EasyPanel.

La creación de aulas, persistencia de formularios académicos y carga real de archivos forman parte de la siguiente iteración.
