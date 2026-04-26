# Casa del Kumis — Sistema de gestión interna

Sistema desarrollado para reemplazar software de terceros como Siigo o Alegra, con los que la empresa dependía de precios externos y condiciones que no controlaba. La idea era tener una herramienta propia, adaptada a cómo opera la cadena, sin ataduras a suscripciones ni límites de funcionalidades ajenas.

El proyecto cubre el ciclo completo: punto de venta, administración de sucursales, gestión de usuarios, carga de vouchers físicos con extracción por OCR y conciliación contra reportes bancarios y de Redeban.

---

## Contexto

Casa del Kumis maneja múltiples sucursales y procesa a diario un volumen considerable de transacciones con datafono. El problema era que los vouchers físicos se acumulaban y cruzarlos manualmente contra los reportes del banco y de Redeban era lento y propenso a errores. Este sistema automatiza ese proceso.

---

## Estructura del repositorio

```
casa-del-kumis/
├── backend/        # API REST (NestJS + Prisma + PostgreSQL)
├── frontend/       # Panel administrativo (React + Vite + Tailwind)

Casa-del-kumis-POS/
└── casa-kumis-pos/ # Punto de venta (Next.js + Supabase)
```

---

## Funcionalidades

**Panel administrativo**

- Dashboard con KPIs por sucursal
- Carga de vouchers físicos con procesamiento OCR (Tesseract.js / Google Cloud Vision)
- Conciliación automatizada: voucher vs. reporte Redeban vs. extracto bancario
- Importación y análisis de extractos bancarios en XLS/XLSX
- Administración de sucursales, usuarios y roles
- Configuración de parámetros del sistema (tasas, retenciones, variables globales)

**Punto de venta**

- Apertura y cierre de turno
- Pantalla de venta con carrito
- Control de inventario por sucursal
- Generación e impresión de tickets
- Reportes de ventas por turno y por cliente
- Acceso controlado por rol y sucursal

---

## Stack

**Backend**

- NestJS 11 con arquitectura modular por dominio
- Prisma 5 como ORM, con migraciones versionadas
- PostgreSQL como base de datos principal
- Autenticación JWT con control de acceso basado en roles (RBAC)
- Tesseract.js y Google Cloud Vision para OCR
- Playwright y Sharp para procesamiento de imágenes
- Multer para carga de archivos
- XLSX para parseo de extractos bancarios
- Swagger para documentación de la API

**Frontend administrativo**

- React 18 con Vite
- TypeScript en todo el proyecto
- Tailwind CSS
- React Router con guards de autenticación y rol

**POS**

- Next.js 14
- Supabase para autenticación y base de datos
- TypeScript + Tailwind CSS

---

## Arquitectura del backend

El backend está organizado por módulos de dominio:

```
src/
├── auth/               # JWT, guards, decoradores de roles
├── users/              # Usuarios y gestión de roles
├── sucursales/         # Sedes de la cadena
├── vouchers/           # Carga de imágenes y OCR
├── banco/              # Extractos bancarios
├── redeban/            # Parser de reportes Redeban
├── conciliacion/       # Motor de cruce entre las tres fuentes
├── dashboard/          # Métricas y KPIs
├── parametros-sistema/ # Configuración global
└── infra/db/           # Módulo Prisma compartido
```

El flujo de conciliación funciona así:

```
Imagen de voucher fisico
        |
        v
   OCR (Tesseract / Google Vision)
        |
        v
  Datos extraidos (monto, fecha, autorizacion, sucursal)
        |
        v
  Cruce con reporte Redeban (XLS)
        |
        v
  Cruce con extracto bancario (XLS/XLSX)
        |
        v
  Resultado: coincidente / pendiente / con diferencia
```

---

## Instalación local

Requisitos: Node.js 20+, PostgreSQL 15+.

**Backend**

```bash
cd backend
npm install
cp .env.example .env
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

API disponible en `http://localhost:3000`.
Documentación en `http://localhost:3000/api`.

**Frontend**

```bash
cd frontend
npm install
cp .env.development.example .env.development
npm run dev
```

**POS**

```bash
cd casa-kumis-pos
npm install
npm run dev
```

---

## Notas

Los archivos de uploads en el repositorio son datos reales de prueba usados durante el desarrollo. En un entorno de producción estos no deberían estar versionados — están incluidos aquí únicamente con fines de portafolio.
