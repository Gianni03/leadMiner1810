// Scraper que corre en el browser del usuario (client-side)
// Usa la API de scraping directamente

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
  urlFuente?: string;
};

// Regex para clasificar links
const EMAIL_REGEX = /mailto:([^\"]+)/i;
const INSTAGRAM_REGEX = /instagram\.com\/([^\"/]+)/i;
const X_REGEX = /(twitter\.com|x\.com)\/([^\"/]+)/i;
const LINKEDIN_REGEX = /linkedin\.com\/([^\"/]+)/i;
const FACEBOOK_REGEX = /facebook\.com\/([^\"/]+)/i;

// Función para filtrar nombres válidos
function isValidName(name: string): boolean {
  if (!name || name.length < 3) return false;
  
  const exactForbiddenPatterns = [
    "Concejo Municipal de",
    "Municipalidad de",
    "Legislatura de",
    "Gobierno de",
    "Actividad Francesa",
  ];
  
  for (const pattern of exactForbiddenPatterns) {
    if (name.startsWith(pattern)) return false;
  }
  
  const uiPatterns = ["menu", "secondary", "nav", "sidebar", "toggle", "cerrar", "abrir", "buscar"];
  
  for (const pattern of uiPatterns) {
    const regex = new RegExp(`\\b${pattern}\\b`, "i");
    if (regex.test(name)) return false;
  }
  
  if (name.length < 4) return false;
  
  return true;
}

// Extraer links y clasificarlos
function extractLinks(document: Document) {
  const links = Array.from(document.querySelectorAll("a")).map((el) => ({
    text: el.textContent?.trim() || "",
    href: el.getAttribute("href") || "",
  }));

  const emails = links
    .map((link) => link.href.match(EMAIL_REGEX)?.[1] || "")
    .filter(Boolean);

  const instagramLinks = links
    .map((link) => link.href.match(INSTAGRAM_REGEX)?.[0] || "")
    .filter(Boolean);

  const xLinks = links
    .map((link) => link.href.match(X_REGEX)?.[0] || "")
    .filter(Boolean);

  const linkedinLinks = links
    .map((link) => link.href.match(LINKEDIN_REGEX)?.[0] || "")
    .filter(Boolean);

  const facebookLinks = links
    .map((link) => link.href.match(FACEBOOK_REGEX)?.[0] || "")
    .filter(Boolean);

  return { links, emails, instagramLinks, xLinks, linkedinLinks, facebookLinks };
}

// Scraping principal - corre en el browser
export async function scrapeContactsClient(url: string): Promise<ScrapedContact[]> {
  const contacts: ScrapedContact[] = [];
  
  try {
    // Intentar con fetch directo primero
    let html = "";
    let fetchSuccess = false;
    
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
          "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
        },
        mode: "cors",
      });
      
      if (response.ok) {
        html = await response.text();
        fetchSuccess = true;
      }
    } catch (e) {
      console.log("Direct fetch failed, trying CORS proxy...", e);
    }
    
    // Si fetch directo falló por CORS, intentar con proxy público
    if (!fetchSuccess) {
      // Usar un proxy CORS público
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      try {
        const response = await fetch(proxyUrl);
        const data = await response.json();
        if (data.contents) {
          html = data.contents;
          fetchSuccess = true;
        }
      } catch (e) {
        console.log("Proxy also failed:", e);
      }
    }
    
    if (!html) {
      throw new Error("No se pudo obtener el HTML de la página");
    }
    
    // Crear un DOM parser
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    
    // Extraer links
    const { links, emails, instagramLinks, xLinks, linkedinLinks, facebookLinks } = extractLinks(doc);
    
    // Extraer nombres de contenedores
    const containerSelectors = [".card", ".profile", ".concejal", "article", "li", ".item", ".persona"];
    
    let nameElements: string[] = [];
    
    for (const selector of containerSelectors) {
      try {
        const elements = doc.querySelectorAll(selector);
        const found: string[] = [];
        elements.forEach((el) => {
          const nameEl = el.querySelector("h1, h2, h3, strong, .title, .name");
          if (nameEl?.textContent?.trim()) {
            found.push(nameEl.textContent.trim());
          }
        });
        if (found.length > 0) {
          nameElements = found;
          break;
        }
      } catch {
        // Continue
      }
    }
    
    // Si no hay nombres en contenedores, buscar sueltos
    if (nameElements.length === 0) {
      nameElements = Array.from(doc.querySelectorAll("h1, h2, h3, .title, .name, strong"))
        .map((el) => el.textContent?.trim() || "")
        .filter(Boolean);
    }
    
    // Filtrar nombres válidos
    const validNames = nameElements.filter(isValidName);
    
    // Extraer roles
    const roleElements = Array.from(doc.querySelectorAll("p, span, .cargo, .role"))
      .map((el) => el.textContent?.trim() || "")
      .filter((role) => role.length > 3 && /concejal|legislador|intendente|senador|diputado/i.test(role));
    
    // Detectar links de perfiles
    const siteUrl = new URL(url);
    const profileLinks = links
      .map((link) => link.href.split("#more-")[0])
      .filter((href) => {
        if (href.includes("team-showcase")) return true;
        if (href.includes("/concejal") || href.includes("/legislador") || href.includes("/perfil")) return true;
        return false;
      })
      .filter((href, index, self) => self.indexOf(href) === index)
      .map((href) => {
        if (href.startsWith("/")) return `${siteUrl.origin}${href}`;
        return href;
      });
    
    // Crear contactos iniciales
    for (let i = 0; i < validNames.length; i++) {
      contacts.push({
        nombre: validNames[i],
        cargo: roleElements[i] || undefined,
        organizacion: doc.title || undefined,
        email: emails[i] || undefined,
        instagram: instagramLinks[i] || undefined,
        x: xLinks[i] || undefined,
        linkedin: linkedinLinks[i] || undefined,
        facebook: facebookLinks[i] || undefined,
        urlFuente: url,
      });
    }
    
    // Si no hay nombres pero hay emails, crear contacto genérico
    if (contacts.length === 0 && emails.length > 0) {
      contacts.push({
        nombre: "Contacto sin nombre",
        organizacion: doc.title || undefined,
        email: emails[0] || undefined,
        instagram: instagramLinks[0] || undefined,
        x: xLinks[0] || undefined,
        linkedin: linkedinLinks[0] || undefined,
        facebook: facebookLinks[0] || undefined,
        urlFuente: url,
      });
    }
    
    console.log("Contactos extraídos (client):", contacts);
    return contacts;
  } catch (error: unknown) {
    console.error("Error en scrapeContactsClient:", error);
    const errorMessage = error instanceof Error ? error.message : "Error desconocido";
    alert(`Error al hacer scraping: ${errorMessage}\nVerificá que la URL sea correcta y públicamente accesible.`);
    return [];
  }
}

// Función que combina: intentar scraping del servidor, si falla usar cliente
export async function scrapeContacts(url: string, useClient: boolean = false): Promise<ScrapedContact[]> {
  if (useClient) {
    return scrapeContactsClient(url);
  }
  
  // Intentar del servidor primero (solo funciona en desarrollo)
  try {
    const response = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.results?.length > 0) {
        return data.results;
      }
    }
  } catch (error) {
    console.log("Server scrape failed, trying client:", error);
  }
  
  // Fallback: usar scraping del cliente
  return scrapeContactsClient(url);
}