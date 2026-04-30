# AGENTS.md

## Proyecto: Political Contact Scraper (Playwright + Web UI)

## Objetivo

Construir una pequeña aplicación web interna para Plataforma 1810 que permita:

1. Ingresar una URL pública (ej: listado de concejales, municipios, legisladores).
2. Ejecutar scraping automático usando Playwright.
3. Detectar y extraer contactos públicos relevantes.
4. Mostrar resultados en tabla.
5. Exportar CSV / JSON / copiar al portapapeles.

Uso exclusivo interno para prospección comercial con datos públicos visibles.

---

# Stack recomendado

## Frontend
- Next.js 15+
- React
- TailwindCSS
- shadcn/ui

## Backend
- Next.js API Routes / Route Handlers

## Scraping Engine
- Playwright

## Export
- papaparse / csv-stringify

---

# Nombre interno del producto

Lead Miner 1810

---

# Flujo UX

## Pantalla principal

### Inputs

- URL objetivo
- Tipo de scraping:
  - Auto Detect
  - Cards
  - Table
  - Links + Profiles

### Botones

- Analizar sitio
- Extraer datos
- Exportar CSV
- Exportar JSON

---

# Campos que debe buscar

## Obligatorios

- Nombre
- Cargo / Rol (si existe)
- Organización
- Email

## Redes

- Instagram
- X / Twitter
- LinkedIn
- Facebook
- Sitio web

## Extras útiles

- Teléfono
- Partido / Bloque
- Localidad
- Provincia

---

# Reglas de scraping

## Solo datos públicos visibles.

No logins.  
No bypass.  
No captchas.

## Respetar velocidad

- Delay entre páginas: 500ms a 1500ms

## Máximo inicial

- 100 perfiles por ejecución

---

# Arquitectura

## Frontend

/app/page.tsx

Formulario + tabla resultados.

## Backend

/app/api/scrape/route.ts

Recibe URL y ejecuta scraper.

## Scraper Core

/lib/scraper.ts

Funciones Playwright reutilizables.

---

# Estrategia de extracción

## Paso 1: Abrir URL

await page.goto(url)

## Paso 2: Detectar estructura

Buscar:

- cards
- rows
- article
- li
- a[href]

## Paso 3: Extraer texto y links

Recolectar:

- innerText
- href

## Paso 4: Clasificar links

Regex:

### Email

mailto:

### Instagram

instagram.com

### X

twitter.com
x.com

### LinkedIn

linkedin.com

### Facebook

facebook.com

## Paso 5: Nombre probable

Prioridad:

h1, h2, h3, strong, .title

---

# UI tabla resultados

| Nombre | Email | Instagram | X | LinkedIn | Cargo | URL Fuente |

Con buscador y filtros.

---

# Exportación

## CSV

UTF-8

## JSON

Array limpio.

---

# Features v2

## Multi URL batch

Pegar varias URLs y scrapear lote.

## Provincias

Guardar datasets por provincia.

## Deduplicación

Eliminar emails repetidos.

## Scoring Lead

+ Email visible
+ Cargo visible
+ Redes activas

---

# Código base scraper.ts

```ts
import { chromium } from "playwright";

export async function scrapeContacts(url:string) {
  const browser = await chromium.launch({ headless:true });
  const page = await browser.newPage();

  await page.goto(url, { waitUntil:"networkidle" });

  const links = await page.$$eval("a", els =>
    els.map(el => ({
      text: el.textContent?.trim() || "",
      href: el.getAttribute("href") || ""
    }))
  );

  const textBlocks = await page.$$eval("h1,h2,h3,strong,p,span", els =>
    els.map(el => el.textContent?.trim()).filter(Boolean)
  );

  await browser.close();

  return {
    links,
    textBlocks
  };
}