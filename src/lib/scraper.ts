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
  partido?: string;
  localidad?: string;
  provincia?: string;
  urlFuente?: string;
  // Propiedades internas (no se exportan)
  _profileScraped?: boolean;
};

// Regex para clasificar links
const EMAIL_REGEX = /mailto:([^\"]+)/i;
const INSTAGRAM_REGEX = /instagram\.com\/([^\"/]+)/i;
const X_REGEX = /(twitter\.com|x\.com)\/([^\"/]+)/i;
const LINKEDIN_REGEX = /linkedin\.com\/([^\"/]+)/i;
const FACEBOOK_REGEX = /facebook\.com\/([^\"/]+)/i;

// Función auxiliar para extraer links y clasificarlos
export async function extractLinks(page: Page): Promise<{
  links: Array<{ text: string; href: string }>;
  emails: string[];
  instagramLinks: string[];
  xLinks: string[];
  linkedinLinks: string[];
  facebookLinks: string[];
}> {
  const links = await page.$$eval("a", (elements) =>
    elements.map((el) => ({
      text: el.textContent?.trim() || "",
      href: el.getAttribute("href") || "",
    }))
  );

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

// Función auxiliar para extraer datos de un perfil individual
export async function scrapeProfile(page: Page, profileUrl: string): Promise<ScrapedContact> {
  console.log(`  Visitando perfil: ${profileUrl}`);
  
  await page.goto(profileUrl, { waitUntil: "domcontentloaded", timeout: 15000 });
  await page.waitForTimeout(2000); // Delay para evitar bloqueos
  
  // Extraer TODOS los links del perfil (incluyendo mailto:)
  const allLinks = await page.$$eval("a", (elements) =>
    elements.map((el) => ({
      text: el.textContent?.trim() || "",
      href: el.getAttribute("href") || "",
    }))
  );
  
  // Buscar emails (mailto: y textos que parezcan emails)
  const emails = allLinks
    .filter((link) => link.href.startsWith("mailto:"))
    .map((link) => link.href.replace("mailto:", ""));
  
  // También buscar textos que parezcan emails
  const pageText = await page.textContent("body") || "";
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const textEmails = pageText.match(emailRegex) || [];
  const allEmails = [...emails, ...textEmails].filter(Boolean);
  
  // Extraer redes sociales
  const instagramLinks = allLinks
    .filter((link) => link.href.includes("instagram.com"))
    .map((link) => link.href);
  
  const xLinks = allLinks
    .filter((link) => link.href.includes("twitter.com") || link.href.includes("x.com"))
    .map((link) => link.href);
  
  const linkedinLinks = allLinks
    .filter((link) => link.href.includes("linkedin.com"))
    .map((link) => link.href);
  
  const facebookLinks = allLinks
    .filter((link) => link.href.includes("facebook.com"))
    .map((link) => link.href);
  
  // Extraer teléfono (buscar patrones de teléfono)
  const telefonoMatch = pageText.match(/(?:teléfono|tel|cel|móvil|mobile)?[:\s]?(\+?54?[\s-]?)?(\d{2,4}[\s-]?\d{3,4}[\s-]?\d{3,4})/i);
  const telefono = telefonoMatch ? telefonoMatch[0] : undefined;
  
  // Extraer nombre del perfil (priorizar h1, luego h2, luego otros)
  const nameElements = await page.$$eval(
    "h1, h2, h3, [class*='name'], [class*='titular'], .profile-name",
    (elements) => elements.map((el) => el.textContent?.trim() || "")
  );
  const nombre = nameElements.find((n) => n && n.length > 3 && !isValidName(n) === false) || "Sin nombre";
  
  // Extraer cargo del perfil (buscar cerca del nombre)
  const roleElements = await page.$$eval(
    "p, span, [class*='cargo'], [class*='role'], [class*='position']",
    (elements) => elements.map((el) => el.textContent?.trim() || "")
  );
  const cargo = roleElements.find((text) => 
    text.length > 3 && (
      /concejal/i.test(text) ||
      /legislador/i.test(text) ||
      /intendente/i.test(text) ||
      /senador/i.test(text) ||
      /diputad/i.test(text) ||
      /secretario/i.test(text) ||
      /bloque/i.test(text) ||
      /partido/i.test(text)
    )
  );
  
  // Extraer organización (título de la página)
  const organization = await page.title();
  
  console.log(`  -> Nombre: ${nombre}, Email: ${allEmails[0] || "N/A"}, Cargo: ${cargo || "N/A"}`);
  
  return {
    nombre: nombre !== "Sin nombre" ? nombre : undefined,
    cargo,
    organizacion: organization || undefined,
    email: allEmails[0] || undefined,
    instagram: instagramLinks[0] || undefined,
    x: xLinks[0] || undefined,
    linkedin: linkedinLinks[0] || undefined,
    facebook: facebookLinks[0] || undefined,
    telefono,
    urlFuente: profileUrl,
  };
}

// Función para filtrar nombres válidos (no títulos de página, no menús, no elementos de UI)
function isValidName(name: string): boolean {
  if (!name || name.length < 3) return false;
  
  // Excluir títulos de páginas gubernamentales específicos (no TODOS los nombres con estas palabras)
  const exactForbiddenPatterns = [
    "Concejo Municipal de",
    "Municipalidad de",
    "Legislatura de",
    "Gobierno de",
    "Actividad Legislativa",
    "Concejal en funciones",
  ];
  
  for (const pattern of exactForbiddenPatterns) {
    if (name.startsWith(pattern)) return false;
  }
  
  // Excluir elementos de UI (palabras completas, no partial matches)
  const uiPatterns = [
    "menu",
    "secondary",
    "nav",
    "sidebar",
    "toggle",
    "expand",
    "collapse",
    "cerrar",
    "abrir",
    "buscar",
    "volver",
    "atrás",
  ];
  
  for (const pattern of uiPatterns) {
    // Usar word boundary para evitar falsos positivos
    const regex = new RegExp(`\\b${pattern}\\b`, "i");
    if (regex.test(name)) return false;
  }
  
  // Excluir nombres muy cortos (menos de 4 caracteres)
  if (name.length < 4) return false;
  
  // Aceptar cualquier otro nombre como válido
  return true;
}

export async function scrapeContacts(url: string, type: string = "auto"): Promise<ScrapedContact[]> {
  let browser: Browser | null = null;
  const contacts: ScrapedContact[] = [];
  
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Paso 1: Raspar la página principal
    console.log(`Iniciando scraping (tipo: ${type})...`);
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(1500);
    
    // Extraer links de la página principal
    const { links, emails, instagramLinks, xLinks, linkedinLinks, facebookLinks } =
      await extractLinks(page);
    
    // Extraer nombres de contenedores específicos (cards, articles, li)
    const containerSelectors = [
      ".card",
      ".profile",
      ".concejal",
      "article",
      "li",
      ".item",
      ".persona",
      "[class*='concejal']",
      "[class*='legislador']",
    ];
    
    // Intentar extraer nombres de contenedores primero
    let nameElements: string[] = [];
    
    for (const selector of containerSelectors) {
      try {
        const elements = await page.$$eval(selector, (els) =>
          els.map((el) => {
            // Buscar nombre dentro del contenedor (h1-h3, strong, .title)
            const nameEl = el.querySelector("h1, h2, h3, strong, .title, .name, [class*='name']");
            return nameEl?.textContent?.trim() || "";
          }).filter(Boolean)
        );
        if (elements.length > 0) {
          nameElements = elements;
          break;
        }
      } catch {
        // Selector no válido, intentar siguiente
      }
    }
    
    // Si no hay nombres en contenedores, buscar en elementos sueltos
    if (nameElements.length === 0) {
      nameElements = await page.$$eval(
        "h1, h2, h3, .title, .name, strong",
        (elements) => elements.map((el) => el.textContent?.trim() || "")
      );
    }
    
    // Filtrar nombres válidos
    const validNames = nameElements.filter(isValidName);
    
    // Extraer roles de los contenedores o de párrafos cerca de los nombres
    const roleElements = await page.$$eval(
      "p, span, .cargo, .role, .position",
      (elements) => elements.map((el) => el.textContent?.trim() || "")
    );
    const validRoles = roleElements.filter((role) => 
      role.length > 3 && (
        /concejal/i.test(role) ||
        /legislador/i.test(role) ||
        /intendente/i.test(role) ||
        /senador/i.test(role) ||
        /diputad/i.test(role) ||
        /secretario/i.test(role)
      )
    );
    
    // Detectar links de perfiles - más flexible
    // Buscar links que parezcan ser de personas (no del sitio general)
    const siteUrl = new URL(url);
    const siteHost = siteUrl.host;
    
    // DEBUG: mostrar TODOS los links de la página
    console.log("=== TODOS LOS LINKS DE LA PÁGINA (primeros 30) ===");
    links.slice(0, 30).forEach((link, i) => {
      console.log(`${i}: [${link.text.substring(0, 40)}] -> ${link.href}`);
    });
    console.log("=== FIN LINKS ===\n");
    
    // Filtrar links de perfiles - PRIORIZAR team-showcase (perfiles de consejales)
    // Los perfiles de esta web están en /team-showcase/nombre-apellido/
    // Los URLs pueden tener #more-xxxx al final, hay que quitarlos
    const profileUrls = links
      .map((link) => link.href.split("#more-")[0]) // Eliminar #more-xxxx
      .filter((href) => {
        // PRIORIDAD 1: team-showcase (perfiles de consejales)
        if (href.includes("team-showcase")) {
          return true;
        }
        // PRIORIDAD 2: otras URLs de perfiles
        if (href.includes("/concejal") || href.includes("/legislador") || 
            href.includes("/perfil") || href.includes("/biografia") ||
            href.includes("/autor") || href.includes("/integrante")) {
          return true;
        }
        return false;
      })
      .filter((href, index, self) => self.indexOf(href) === index); // Eliminar duplicados
    
    // Convertir a absolutos
    const profileLinks = profileUrls.map((href) => {
      if (href.startsWith("/")) {
        return `${siteUrl.origin}${href}`;
      }
      return href;
    });
    
    console.log("Perfiles detectados:", profileLinks);
    
// Crear contactos iniciales (página principal)
    // Guardamos las redes de la página principal para usarlas como fallback
    const pageEmails = emails;
    const pageInstagrams = instagramLinks;
    const pageX = xLinks;
    const pageLinkedin = linkedinLinks;
    const pageFacebook = facebookLinks;
    
    const names = nameElements.filter(Boolean);
    const roles = roleElements.filter(Boolean).slice(0, names.length);
    
    for (let i = 0; i < names.length; i++) {
      contacts.push({
        nombre: names[i],
        cargo: roles[i] || undefined,
        organizacion: await page.title() || undefined,
        // Las redes de la página principal son fallback - se sobrescribirán con datos del perfil
        email: pageEmails[i] || undefined,
        instagram: pageInstagrams[i] || undefined,
        x: pageX[i] || undefined,
        linkedin: pageLinkedin[i] || undefined,
        facebook: pageFacebook[i] || undefined,
        urlFuente: url,
        // Flag para saber si ya scrapeamos el perfil
        _profileScraped: false,
      });
    }
    
    // Si no hay nombres, crear un contacto genérico
    if (contacts.length === 0 && (emails.length > 0 || instagramLinks.length > 0)) {
      contacts.push({
        nombre: "Contacto sin nombre",
        organizacion: await page.title() || undefined,
        email: emails[0] || undefined,
        instagram: instagramLinks[0] || undefined,
        x: xLinks[0] || undefined,
        linkedin: linkedinLinks[0] || undefined,
        facebook: facebookLinks[0] || undefined,
        urlFuente: url,
      });
    }
    
// Paso 2: Raspar perfiles individuales (si hay links)
    if (profileLinks.length > 0) {
      // Tomar hasta 50 perfiles únicos (eliminar duplicados por URL base)
      const uniqueProfileUrls = [...new Set(profileLinks)];
      console.log(`Raspando ${Math.min(uniqueProfileUrls.length, 50)} perfiles individuales...`);
      
      for (const profileUrl of uniqueProfileUrls.slice(0, 50)) { // Limitar a 50 perfiles
        try {
          const profileData = await scrapeProfile(page, profileUrl);
          
          // PRIORIZAR datos del perfil sobre los de la página principal
          // Buscar coincidencia por nombre en los contactos existentes
          const existingContactIndex = contacts.findIndex(
            (contact) => {
              if (!contact.nombre || !profileData.nombre) return false;
              // Coincidencia por nombre parcial o completo
              const contactNameLower = contact.nombre.toLowerCase();
              const profileNameLower = profileData.nombre.toLowerCase();
              return contactNameLower.includes(profileNameLower) || 
                     profileNameLower.includes(contactNameLower);
            }
          );
          
          if (existingContactIndex >= 0) {
            // SOBRESCRIBIR todos los datos del perfil (prioridad total)
            // Esto incluye: email, instagram, x, linkedin, facebook, telefono
            contacts[existingContactIndex] = {
              ...contacts[existingContactIndex],
              nombre: profileData.nombre || contacts[existingContactIndex].nombre,
              cargo: profileData.cargo || contacts[existingContactIndex].cargo,
              email: profileData.email || contacts[existingContactIndex].email,
              instagram: profileData.instagram || contacts[existingContactIndex].instagram,
              x: profileData.x || contacts[existingContactIndex].x,
              linkedin: profileData.linkedin || contacts[existingContactIndex].linkedin,
              facebook: profileData.facebook || contacts[existingContactIndex].facebook,
              telefono: profileData.telefono || contacts[existingContactIndex].telefono,
              organizacion: profileData.organizacion || contacts[existingContactIndex].organizacion,
              urlFuente: profileUrl, // Actualizar URL fuente al perfil
              _profileScraped: true,
            };
          } else if (profileData.nombre && isValidName(profileData.nombre)) {
            // Agregar nuevo contacto del perfil
            contacts.push({
              ...profileData,
              urlFuente: profileUrl,
              _profileScraped: true,
            });
          }
        } catch (error) {
          console.error(`Error raspando perfil ${profileUrl}:`, error);
        }
        await page.waitForTimeout(1000); // Delay entre perfiles
      }
    }
  } catch (error) {
    console.error("Error en scrapeContacts:", error);
    return [];
  } finally {
    if (browser) await browser.close();
  }
  
  console.log("Contactos extraídos:", contacts);
  return contacts;
}