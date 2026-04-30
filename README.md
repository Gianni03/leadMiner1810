# 🔍 LeadMiner 1810

> Herramienta interna para prospección comercial - Political Contact Scraper

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org)
[![Playwright](https://img.shields.io/badge/Playwright-1.42-green)](https://playwright.dev)
[![Tailwind](https://img.shields.io/badge/Tailwind-4-cyan)](https://tailwindcss.com)

---

## 📋 Descripción

**LeadMiner 1810** es una aplicación web interna desarrollada para **Plataforma 1810** que permite:

- 🌐 Ingresar una URL pública (listados de concejales, legisladores, funcionarios)
- 🤖 Ejecutar scraping automático usando **Playwright**
- 📊 Extraer contactos públicos relevantes (nombres, emails, redes sociales, teléfonos)
- 📋 Exportar datos en **CSV**, **JSON** o copiar al portapapeles

**Solo datos públicos visibles**. Sin logins, sin bypass, sin captchas.

---

## 🚀 Features

### ✅ Implementado

- **Scraper automático** - Detecta y extrae contactos de páginas gubernamentales
- **Perfiles individuales** - Navega a perfiles para obtener datos adicionales (emails, teléfonos)
- **Múltiples tipos de scraping**:
  - ⚡ Auto Detect (detección automática)
  - 🎴 Cards (contenedores tipo card)
  - 📊 Table (tablas HTML)
  - 🔗 Links + Profiles (página + perfiles)
- **Exportación**:
  - 📥 CSV (UTF-8)
  - 📥 JSON
  - 📋 Copiar al portapapeles
- **UI moderna** - Diseño visual con gradientes, cards y animaciones
- **Filtro de búsqueda** - Buscar por nombre, email, cargo u organización
- **Eliminar contactos** - Quitar contactos no deseados antes de exportar
- **Límite configurable** - Hasta 50 perfiles por ejecución

### 📝 Roadmap (v2)

- [ ] Batch multi-URL (varios sitios a la vez)
- [ ] Guardar datasets por provincia
- [ ] Deduplicación automática
- [ ] Scoring de leads

---

## 🛠️ Stack Técnico

| Capa | Tecnología |
|------|------------|
| **Frontend** | Next.js 16, React, TailwindCSS 4 |
| **Backend** | Next.js API Routes |
| **Scraping** | Playwright |
| **Lenguaje** | TypeScript |
| **Estilos** | TailwindCSS + CSS Modules |

---

## 📦 Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/plataforma1810/leadminer1810.git
cd leadminer1810

# 2. Instalar dependencias
npm install

# 3. Instalar navegadores de Playwright
npx playwright install

# 4. (Opcional) Instalar dependencias del sistema
sudo npx playwright install-deps

# 5. Ejecutar
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 🔧 Configuración

### Variables de entorno

Crea un archivo `.env.local`:

```env
# Opcional: User agent personalizado
NEXT_PUBLIC_USER_AGENT=Mozilla/5.0 (compatible; LeadMiner/1.0)

# Opcional: Timeout de scraping (ms)
SCRAPE_TIMEOUT=15000
```

---

## 🎯 Cómo Usar

1. **Ingresá una URL** - Ej: `https://www.concejorosario.gov.ar/actividad-legislativa/concejalas-y-concejales/`

2. **Elegí el tipo de scraping**:
   - **Auto Detect**: Detecta automáticamente la estructura
   - **Cards**: Para sitios con tarjetas de perfiles
   - **Table**: Para listados en tablas
   - **Links + Profiles**: Para páginas con enlaces a perfiles individuales

3. **Hacé clic en "Analizar Sitio"** - El scraper extraerá los datos

4. **Filtrá y limpiá**:
   - Usá el buscador para encontrar contactos específicos
   - Eliminá contactos no deseados con el botón ✕

5. **Exportá**:
   - 📥 **CSV** - Para导入 a Excel o Google Sheets
   - 📥 **JSON** - Para integrar con otras herramientas
   - 📋 **Copiar** - Para pegar en documentos

---

## ⚠️ Notas Importantes

- **Solo datos públicos**: Esta herramienta solo extrae información visible públicamente
- **Respetar velocidad**: Hay delays configurados para evitar bloqueos
- **Límite inicial**: Máximo 50 perfiles por ejecución
- **Uso interno**: Esta herramienta es para uso interno de Plataforma 1810

---

## 📄 Licencia

 Uso interno - Plataforma 1810

---

## 👨‍💻 Desarrollo

Desarrollado con ❤️ por el equipo de Plataforma 1810

Built with Next.js + Playwright + TailwindCSS