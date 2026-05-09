import { chromium, Browser, Page } from "playwright";

export type ScrapedContact = {
  nombre?: string;
  cargo?: string;
  organizacion?: string;
  email?: string;
  instagram?: string;
  x?: string;
  linkedin?: string;
  facebook?: string;
  telefono?: string;
  provincia?: string;
  ciudad?: string;
  partido?: string;
  urlFuente?: string;
  _profileScraped?: boolean;
};

// Regex
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const INSTAGRAM_REGEX = /instagram\.com\/([^\"/#]+)/i;
const X_REGEX = /(twitter\.com|x\.com)\/([^\"/#]+)/i;
const LINKEDIN_REGEX = /linkedin\.com\/([^\"/#]+)/i;
const FACEBOOK_REGEX = /facebook\.com\/([^\"/#]+)/i;

// Mapeo de dominios y keywords a provincia/ciudad
const PROVINCIA_MAP: Record<string, string> = {
  "tucuman": "Tucumán",
  "catamarca": "Catamarca",
  "santiago del estero": "Santiago del Estero",
  "corrientes": "Corrientes",
  "entre rios": "Entre Ríos",
  "entrerios": "Entre Ríos",
  "misiones": "Misiones",
  "chaco": "Chaco",
  "formosa": "Formosa",
  "salta": "Salta",
  "jujuy": "Jujuy",
  "la rioja": "La Rioja",
  "san juan": "San Juan",
  "sanjuan": "San Juan",
  "mendoza": "Mendoza",
  "neuquen": "Neuquén",
  "rio negro": "Río Negro",
  "rionegro": "Río Negro",
  "chubut": "Chubut",
  "santa cruz": "Santa Cruz",
  "santacruz": "Santa Cruz",
  "tierra del fuego": "Tierra del Fuego",
  "tierradelfuego": "Tierra del Fuego",
  "cordoba": "Córdoba",
  "santa fe": "Santa Fe",
  "santafe": "Santa Fe",
  "buenos aires": "Buenos Aires",
  "buenosaires": "Buenos Aires",
  "caba": "Ciudad Autónoma de Buenos Aires",
  "capital federal": "Ciudad Autónoma de Buenos Aires",
  "la pampa": "La Pampa",
  "lapampa": "La Pampa",
};

const CIUDAD_MAP: Record<string, string> = {
  "rosario": "Rosario",
  "cordoba": "Córdoba",
  "mendoza": "Mendoza",
  "tucuman": "San Miguel de Tucumán",
  "mar del plata": "Mar del Plata",
  "salta": "Salta",
  "santa fe": "Santa Fe",
  "corrientes": "Corrientes",
  "posadas": "Posadas",
  "neuquen": "Neuquén",
  "formosa": "Formosa",
  "san salvador de jujuy": "San Salvador de Jujuy",
  "resistencia": "Resistencia",
  "santiago del estero": "Santiago del Estero",
  "la plata": "La Plata",
  "parana": "Paraná",
  "rawson": "Rawson",
  "viedma": "Viedma",
  "rio gallegos": "Río Gallegos",
  "ushuaia": "Ushuaia",
  "catamarca": "San Fernando del Valle de Catamarca",
  "san juan": "San Juan",
  "san luis": "San Luis",
  "bariloche": "Bariloche",
};

// Inferir provincia y ciudad a partir de la URL y el texto del sitio
function inferLocation(url: string, organization?: string): { provincia?: string; ciudad?: string } {
  const lowerUrl = url.toLowerCase();
  const lowerOrg = (organization || "").toLowerCase();
  const searchIn = `${lowerUrl} ${lowerOrg}`;

  let provincia: string | undefined;
  let ciudad: string | undefined;

  // Buscar provincia en la URL y organización
  for (const [key, value] of Object.entries(PROVINCIA_MAP)) {
    if (searchIn.includes(key)) {
      provincia = value;
      break;
    }
  }

  // Buscar ciudad en la URL y organización
  for (const [key, value] of Object.entries(CIUDAD_MAP)) {
    if (searchIn.includes(key)) {
      ciudad = value;
      break;
    }
  }

  return { provincia, ciudad };
}

// Filtrar nombres válidos
function isValidName(name: string): boolean {
  if (!name || name.length < 3) return false;

  const forbidden = [
    "Concejo Municipal de", "Municipalidad de", "Legislatura de",
    "Gobierno de", "Actividad Legislativa", "Diputados y Diputadas",
    "Concejales", "Autoridades", "Bloques", "Comisiones",
  ];
  for (const p of forbidden) {
    if (name.startsWith(p) || name === p) return false;
  }

  const ui = ["menu", "secondary", "nav", "sidebar", "toggle", "expand",
    "collapse", "cerrar", "abrir", "buscar", "volver", "atrás", "inicio",
    "contacto", "sesión", "canal", "twitter", "facebook", "instagram"];
  for (const p of ui) {
    if (new RegExp(`\\b${p}\\b`, "i").test(name)) return false;
  }

  if (name.length < 4) return false;
  if (/^\d+$/.test(name)) return false; // Solo números
  
  return true;
}

// Detectar si un elemento contiene datos de una persona (email o nombre+cargo)
function looksLikePersonCard(el: Element): { nombre: string; email: string; cargo: string } | null {
  const text = el.textContent || "";
  const emails = text.match(EMAIL_REGEX) || [];
  
  // Buscar nombre
  const nameEl = el.querySelector("h1, h2, h3, h4, strong, b, .name, .title, [class*='nombre'], [class*='name'], [class*='titulo']");
  const nombre = nameEl?.textContent?.trim() || "";
  
  // Buscar cargo/bloque/partido
  const cargoEl = el.querySelector(".cargo, .role, .bloque, [class*='cargo'], [class*='bloque'], [class*='role'], [class*='partido']");
  let cargo = cargoEl?.textContent?.trim() || "";
  
  // Si no hay cargo explícito, buscar texto que parezca cargo después del nombre
  if (!cargo && nombre) {
    const textAfterName = text.replace(nombre, "").trim();
    const cargoMatch = textAfterName.match(/(bloque\s+[^\n,]+|partido\s+[^\n,]+|concejal[^\n,]*|diputad[^\n,]*|legislador[^\n,]*|intendente[^\n,]*|senador[^\n,]*)/i);
    if (cargoMatch) cargo = cargoMatch[1].trim();
  }
  
  // Solo considerar si tiene nombre válido o email
  if (!nombre && emails.length === 0) return null;
  if (nombre && !isValidName(nombre) && emails.length === 0) return null;
  
  return { nombre, email: emails[0] || "", cargo };
}

// Extraer datos de un card individual
function extractCardData(el: Element): ScrapedContact | null {
  const personData = looksLikePersonCard(el);
  if (!personData) return null;
  
  const links = Array.from(el.querySelectorAll("a")).map(a => ({
    href: a.getAttribute("href") || "",
    text: a.textContent?.trim() || ""
  }));
  
  const emailFromLink = links.find(l => l.href.startsWith("mailto:"))?.href.replace("mailto:", "") || "";
  
  return {
    nombre: personData.nombre || undefined,
    cargo: personData.cargo || undefined,
    email: personData.email || emailFromLink || undefined,
    instagram: links.find(l => l.href.includes("instagram.com"))?.href || undefined,
    x: links.find(l => l.href.includes("twitter.com") || l.href.includes("x.com"))?.href || undefined,
    linkedin: links.find(l => l.href.includes("linkedin.com"))?.href || undefined,
    facebook: links.find(l => l.href.includes("facebook.com"))?.href || undefined,
    telefono: links.find(l => l.href.startsWith("tel:"))?.href.replace("tel:", "") || undefined,
  };
}

// Detectar paginación y navegar por todas las páginas
async function scrapeWithPagination(page: Page, url: string): Promise<ScrapedContact[]> {
  const allContacts: ScrapedContact[] = [];
  const pageTitle = await page.title();
  
  // Función para extraer contactos de la página actual
  async function extractFromCurrentPage(): Promise<ScrapedContact[]> {
    const contacts: ScrapedContact[] = [];
    
    // Estrategia 1: Buscar cards con selectores conocidos
    const cardSelectors = [
      ".autoridad-little", ".card", ".profile", ".concejal", ".diputado",
      ".legislador", ".persona", ".member", ".item", ".list-item",
      "[class*='autoridad']", "[class*='diputad']", "[class*='concejal']",
      "[class*='legislador']", "[class*='card']", "[class*='profile']",
      "[class*='member']", "[class*='persona']",
    ];
    
    for (const selector of cardSelectors) {
      try {
        const elements = await page.$$(selector);
        if (elements.length >= 2) { // Al menos 2 para ser una lista
          for (const el of elements) {
            const data = await el.evaluate(extractCardData);
            if (data && (data.nombre || data.email)) {
              const loc = inferLocation(url, pageTitle || undefined);
              data.organizacion = pageTitle || undefined;
              data.provincia = loc.provincia;
              data.ciudad = loc.ciudad;
              data.urlFuente = url;
              contacts.push(data);
            }
          }
          if (contacts.length > 0) {
            console.log(`Cards con "${selector}": ${contacts.length}`);
            return contacts;
          }
        }
      } catch {
        // Continue
      }
    }
    
    // Estrategia 2: Auto-detectar patrones repetitivos
    // Buscar elementos que se repiten y contienen emails
    const autoContacts = await page.evaluate(() => {
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const allDivs = document.querySelectorAll("div, li, article, section, tr");
      const candidates: Map<string, { count: number; elements: Element[] }> = new Map();
      
      for (const el of allDivs) {
        const text = el.textContent || "";
        const emails = text.match(emailRegex) || [];
        
        // Si tiene exactamente 1 email y no es un contenedor gigante
        if (emails.length === 1 && text.length < 500) {
          const className = el.className?.toString().substring(0, 50) || el.tagName;
          if (!candidates.has(className)) {
            candidates.set(className, { count: 0, elements: [] });
          }
          const c = candidates.get(className)!;
          c.count++;
          c.elements.push(el);
        }
      }
      
      // Buscar la clase que más se repite con emails
      let bestMatch: { count: number; elements: Element[] } | null = null;
      for (const [, value] of candidates) {
        if (value.count >= 3 && (!bestMatch || value.count > bestMatch.count)) {
          bestMatch = value;
        }
      }
      
      if (bestMatch) {
        return bestMatch.elements.map(el => {
          const text = el.textContent || "";
          const emails = text.match(emailRegex) || [];
          const nameEl = el.querySelector("h1, h2, h3, h4, strong, b, .name, .title, [class*='nombre'], [class*='name']");
          const links = Array.from(el.querySelectorAll("a")).map(a => ({
            href: a.getAttribute("href") || "",
          }));
          
          return {
            nombre: nameEl?.textContent?.trim() || "",
            email: emails[0] || "",
            instagram: links.find(l => l.href.includes("instagram.com"))?.href || "",
            x: links.find(l => l.href.includes("twitter.com") || l.href.includes("x.com"))?.href || "",
            linkedin: links.find(l => l.href.includes("linkedin.com"))?.href || "",
            facebook: links.find(l => l.href.includes("facebook.com"))?.href || "",
            text: text.substring(0, 150).replace(/\s+/g, " ").trim(),
          };
        }).filter(c => c.nombre || c.email);
      }
      
      return [];
    });
    
    if (autoContacts.length > 0) {
      console.log(`Auto-detectados: ${autoContacts.length} contactos`);
      const loc = inferLocation(url, pageTitle || undefined);
      for (const c of autoContacts) {
        contacts.push({
          nombre: c.nombre || undefined,
          email: c.email || undefined,
          instagram: c.instagram || undefined,
          x: c.x || undefined,
          linkedin: c.linkedin || undefined,
          facebook: c.facebook || undefined,
          organizacion: pageTitle || undefined,
          provincia: loc.provincia,
          ciudad: loc.ciudad,
          urlFuente: url,
        });
      }
      return contacts;
    }
    
    // Estrategia 3: Extraer emails directamente del texto
    const pageText = await page.evaluate(() => document.body.innerText);
    const pageEmails = pageText.match(EMAIL_REGEX) || [];
    
    if (pageEmails.length > 0) {
      console.log(`Emails encontrados en texto: ${pageEmails.length}`);
      const loc = inferLocation(url, pageTitle || undefined);
      for (const email of pageEmails) {
        contacts.push({
          nombre: "Contacto sin nombre",
          email,
          organizacion: pageTitle || undefined,
          provincia: loc.provincia,
          ciudad: loc.ciudad,
          urlFuente: url,
        });
      }
    }
    
    return contacts;
  }
  
  // Extraer de la primera página
  const firstPageContacts = await extractFromCurrentPage();
  allContacts.push(...firstPageContacts);
  
  // Buscar paginación y navegar
  const paginationSelectors = [
    ".pagination a", ".page-numbers a", ".pager a", ".nav-links a",
    "[class*='pagin'] a", "ul.page-numbers li a", ".next", ".page-next a",
    "a.next", "a[rel='next']", ".pagination .next a",
  ];
  
  let hasNextPage = true;
  let pagesScraped = 1;
  const maxPages = 10; // Límite de páginas
  
  while (hasNextPage && pagesScraped < maxPages) {
    hasNextPage = false;
    
    for (const sel of paginationSelectors) {
      try {
        // Buscar botón "siguiente" o link de la próxima página
        const nextLinks = await page.$$(sel);
        for (const link of nextLinks) {
          const text = await link.textContent() || "";
          const href = await link.getAttribute("href") || "";
          
          // Detectar si es "siguiente" o un número mayor a la página actual
          if (text.toLowerCase().includes("next") || text.toLowerCase().includes("siguiente") || 
              text.includes("»") || text.includes(">") ||
              (href && !href.includes("#") && parseInt(text) === pagesScraped + 1)) {
            await link.click();
            await page.waitForTimeout(2000); // Esperar a que cargue
            
            const moreContacts = await extractFromCurrentPage();
            if (moreContacts.length > 0) {
              allContacts.push(...moreContacts);
              pagesScraped++;
              hasNextPage = true;
              console.log(`Página ${pagesScraped}: +${moreContacts.length} contactos`);
            }
            break;
          }
        }
        if (hasNextPage) break;
      } catch {
        // Continue
      }
    }
  }
  
  console.log(`Total páginas scrapeadas: ${pagesScraped}`);
  return allContacts;
}

// Extraer datos de un perfil individual
async function scrapeProfile(page: Page, profileUrl: string): Promise<ScrapedContact> {
  console.log(`  Visitando perfil: ${profileUrl}`);
  
  await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(1500);
  
  const pageText = await page.evaluate(() => document.body.innerText) || "";
  const allEmails = pageText.match(EMAIL_REGEX) || [];
  
  // Buscar emails en mailto: links
  const mailtoEmails = await page.$$eval("a[href^='mailto:']", els =>
    els.map(el => el.getAttribute("href")?.replace("mailto:", "") || "")
  ).catch(() => [] as string[]);
  
  const emails = [...mailtoEmails, ...allEmails].filter((e, i, a) => a.indexOf(e) === i);
  
  // Redes sociales
  const links = await page.$$eval("a", els =>
    els.map(el => ({ href: el.getAttribute("href") || "" }))
  ).catch(() => [] as Array<{ href: string }>);
  
  const instagram = links.find(l => l.href.includes("instagram.com"))?.href || undefined;
  const x = links.find(l => l.href.includes("twitter.com") || l.href.includes("x.com"))?.href || undefined;
  const linkedin = links.find(l => l.href.includes("linkedin.com"))?.href || undefined;
  const facebook = links.find(l => l.href.includes("facebook.com"))?.href || undefined;
  
  // Teléfono
  const telLinks = links.find(l => l.href.startsWith("tel:"));
  const telefono = telLinks?.href.replace("tel:", "") || undefined;
  
  // Nombre
  const nameElements = await page.$$eval(
    "h1, h2, h3, [class*='name'], [class*='titulo']",
    els => els.map(el => el.textContent?.trim() || "").filter(n => n.length > 3)
  ).catch(() => [] as string[]);
  const nombre = nameElements.find(n => isValidName(n)) || nameElements[0] || undefined;
  
  // Cargo
  const roleElements = await page.$$eval(
    "p, span, [class*='cargo'], [class*='role'], [class*='bloque']",
    els => els.map(el => el.textContent?.trim() || "")
  ).catch(() => [] as string[]);
  const cargo = roleElements.find(t => 
    t.length > 3 && /concejal|legislador|intendente|senador|diputad|secretario|bloque|partido/i.test(t)
  ) || undefined;
  
  const organization = await page.title();
  const loc = inferLocation(profileUrl, organization || undefined);
  
  console.log(`  -> ${nombre || "?"} | ${emails[0] || "N/A"} | ${cargo || "N/A"}`);
  
  return {
    nombre,
    cargo,
    organizacion: organization || undefined,
    provincia: loc.provincia,
    ciudad: loc.ciudad,
    email: emails[0] || undefined,
    instagram,
    x,
    linkedin,
    facebook,
    telefono,
    urlFuente: profileUrl,
  };
}

// Deduplicar contactos por email: quedarse con el que tenga más datos
function deduplicateByEmails(contacts: ScrapedContact[]): ScrapedContact[] {
  const byEmail = new Map<string, ScrapedContact>();
  const noEmail: ScrapedContact[] = [];
  
  for (const c of contacts) {
    if (!c.email) {
      noEmail.push(c);
      continue;
    }
    const key = c.email.toLowerCase().trim();
    const existing = byEmail.get(key);
    if (!existing) {
      byEmail.set(key, c);
      continue;
    }
    // Quedarse con el que tenga más campos llenos
    const countFields = (contact: ScrapedContact) => {
      return [contact.nombre, contact.email, contact.cargo, contact.organizacion,
              contact.provincia, contact.ciudad, contact.partido,
              contact.instagram, contact.x, contact.linkedin, contact.facebook,
              contact.telefono].filter(Boolean).length;
    };
    if (countFields(c) > countFields(existing)) {
      byEmail.set(key, c);
    }
  }
  
  return [...byEmail.values(), ...noEmail];
}

// Función principal
export async function scrapeContacts(url: string, type: string = "auto"): Promise<ScrapedContact[]> {
  let browser: Browser | null = null;
  const contacts: ScrapedContact[] = [];
  
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Configurar user agent realista
    await page.setExtraHTTPHeaders({
      "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
    });
    
    console.log(`Iniciando scraping (tipo: ${type})...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1500);
    
    // Paso 1: Extraer contactos de todas las páginas (con paginación)
    const pageContacts = await scrapeWithPagination(page, url);
    contacts.push(...pageContacts);
    
    // Paso 2: Detectar links de perfiles para scraping profundo
    const links = await page.$$eval("a", els =>
      els.map(el => ({
        text: el.textContent?.trim() || "",
        href: el.getAttribute("href") || "",
      }))
    ).catch(() => [] as Array<{ text: string; href: string }>);
    
    const siteUrl = new URL(url);
    const profileUrls = links
      .map(l => l.href.split("#")[0]) // Limpiar anchors
      .filter(href => {
        if (href.includes("team-showcase")) return true;
        if (/\/(concejal|legislador|diputad|perfil|biografia|autor|integrante|miembro)/i.test(href)) return true;
        return false;
      })
      .filter((href, i, a) => a.indexOf(href) === i && href.length > 0);
    
    const profileLinks = profileUrls.map(href => {
      if (href.startsWith("/")) return `${siteUrl.origin}${href}`;
      if (href.startsWith("http")) return href;
      return `${siteUrl.origin}/${href}`;
    });
    
    // Paso 3: Raspar perfiles individuales
    if (profileLinks.length > 0) {
      const unique = [...new Set(profileLinks)];
      console.log(`Raspando ${Math.min(unique.length, 50)} perfiles...`);
      
      for (const profileUrl of unique.slice(0, 50)) {
        try {
          const profileData = await scrapeProfile(page, profileUrl);
          
          // Buscar contacto existente por nombre
          const idx = contacts.findIndex(c => {
            if (!c.nombre || !profileData.nombre) return false;
            const a = c.nombre.toLowerCase();
            const b = profileData.nombre.toLowerCase();
            return a.includes(b) || b.includes(a);
          });
          
          if (idx >= 0) {
            // Sobrescribir con datos del perfil (prioridad total)
            contacts[idx] = {
              ...contacts[idx],
              nombre: profileData.nombre || contacts[idx].nombre,
              cargo: profileData.cargo || contacts[idx].cargo,
              email: profileData.email || contacts[idx].email,
              instagram: profileData.instagram || contacts[idx].instagram,
              x: profileData.x || contacts[idx].x,
              linkedin: profileData.linkedin || contacts[idx].linkedin,
              facebook: profileData.facebook || contacts[idx].facebook,
              telefono: profileData.telefono || contacts[idx].telefono,
              organizacion: profileData.organizacion || contacts[idx].organizacion,
              provincia: profileData.provincia || contacts[idx].provincia,
              ciudad: profileData.ciudad || contacts[idx].ciudad,
              partido: profileData.partido || contacts[idx].partido,
              urlFuente: profileUrl,
              _profileScraped: true,
            };
          } else if (profileData.nombre && isValidName(profileData.nombre)) {
            contacts.push({ ...profileData, urlFuente: profileUrl, _profileScraped: true });
          }
        } catch (error) {
          console.error(`Error perfil ${profileUrl}:`, error);
        }
        await page.waitForTimeout(800);
      }
    }
  } catch (error) {
    console.error("Error en scrapeContacts:", error);
    return [];
  } finally {
    if (browser) await browser.close();
  }
  
  console.log(`Total contactos extraídos: ${contacts.length}`);
  
  // Deduplicación: por email, quedarse con el que tenga más datos
  const deduplicated = deduplicateByEmails(contacts);
  console.log(`Después de deduplicación: ${deduplicated.length} contactos`);
  
  return deduplicated;
}
