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
    
    // ---- NUEVO ENFOQUE: Extraer datos de cada card individualmente ----
    // Buscar cards con más selectores (incluyendo sitios de diputados/legisladores)
    const cardSelectors = [
      ".autoridad-little",
      ".card",
      ".profile",
      ".concejal",
      ".diputado",
      ".legislador",
      ".persona",
      ".member",
      "article",
      ".item",
      "[class*='autoridad']",
      "[class*='diputad']",
      "[class*='concejal']",
      "[class*='legislador']",
      "[class*='card']",
      "[class*='profile']",
      "[class*='member']",
    ];
    
    let cardContacts: ScrapedContact[] = [];
    
    for (const selector of cardSelectors) {
      try {
        const cards = await page.$$eval(selector, (els) =>
          els.map((el) => {
            const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
            const text = el.textContent || "";
            const emails = text.match(emailRegex) || [];
            
            // Buscar nombre (h1-h4, strong, .name, .title, etc.)
            const nameEl = el.querySelector("h1, h2, h3, h4, strong, b, .name, .title, [class*='nombre'], [class*='name'], [class*='titulo']");
            const nombre = nameEl?.textContent?.trim() || "";
            
            // Buscar cargo/bloque
            const cargoEl = el.querySelector(".cargo, .role, .bloque, [class*='cargo'], [class*='bloque'], [class*='role']");
            const cargo = cargoEl?.textContent?.trim() || "";
            
            // Buscar links de redes sociales dentro del card
            const links = Array.from(el.querySelectorAll("a")).map(a => ({
              href: a.getAttribute("href") || "",
              text: a.textContent?.trim() || ""
            }));
            
            const instagram = links.find(l => l.href.includes("instagram.com"))?.href || "";
            const x = links.find(l => l.href.includes("twitter.com") || l.href.includes("x.com"))?.href || "";
            const linkedin = links.find(l => l.href.includes("linkedin.com"))?.href || "";
            const facebook = links.find(l => l.href.includes("facebook.com"))?.href || "";
            const telefono = links.find(l => l.href.startsWith("tel:"))?.href.replace("tel:", "") || "";
            
            return {
              nombre,
              cargo,
              email: emails[0] || "",
              instagram,
              x,
              linkedin,
              facebook,
              telefono,
              text: text.substring(0, 200).replace(/\s+/g, " ").trim(),
            };
          }).filter(c => c.nombre || c.email) // Solo cards con nombre o email
        );
        
        if (cards.length > 0) {
          console.log(`Cards encontradas con selector "${selector}": ${cards.length}`);
          const pageTitle = await page.title();
          cardContacts = cards.map(c => ({
            nombre: c.nombre || undefined,
            cargo: c.cargo || undefined,
            email: c.email || undefined,
            instagram: c.instagram || undefined,
            x: c.x || undefined,
            linkedin: c.linkedin || undefined,
            facebook: c.facebook || undefined,
            telefono: c.telefono || undefined,
            organizacion: pageTitle || undefined,
            urlFuente: url,
          }));
          break; // Si encontramos cards, no seguimos buscando
        }
      } catch {
        // Selector no válido, intentar siguiente
      }
    }
    
    // Si encontramos cards, usar esos datos
    if (cardContacts.length > 0) {
      contacts.push(...cardContacts);
    } else {
      // Fallback: buscar nombres y emails por separado
      const nameElements = await page.$$eval(
        "h1, h2, h3, h4, strong, .title, .name",
        (elements) => elements.map((el) => el.textContent?.trim() || "")
      );
      const validNames = nameElements.filter(isValidName);
      
      // Buscar emails en el texto de la página
      const pageText = await page.evaluate(() => document.body.innerText);
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
      const pageEmails = pageText.match(emailRegex) || [];
      
      // Asociar nombres con emails por índice
      for (let i = 0; i < validNames.length; i++) {
        contacts.push({
          nombre: validNames[i],
          cargo: undefined,
          organizacion: await page.title() || undefined,
          email: pageEmails[i] || emails[i] || undefined,
          instagram: instagramLinks[i] || undefined,
          x: xLinks[i] || undefined,
          linkedin: linkedinLinks[i] || undefined,
          facebook: facebookLinks[i] || undefined,
          urlFuente: url,
        });
      }
      
      // Si no hay nombres pero hay emails, crear contactos con email
      if (contacts.length === 0 && pageEmails.length > 0) {
        for (const email of pageEmails) {
          contacts.push({
            nombre: "Contacto sin nombre",
            organizacion: await page.title() || undefined,
            email,
            urlFuente: url,
          });
        }
      }
    }
// Paso 2: Detectar links de perfiles para scraping profundo
    const siteUrl = new URL(url);
    const profileUrls = links
      .map((link) => link.href.split("#more-")[0])
      .filter((href) => {
        if (href.includes("team-showcase")) return true;
        if (href.includes("/concejal") || href.includes("/legislador") || 
            href.includes("/perfil") || href.includes("/biografia") ||
            href.includes("/diputad") || href.includes("/autor") || 
            href.includes("/integrante")) return true;
        return false;
      })
      .filter((href, index, self) => self.indexOf(href) === index);
    
    const profileLinks = profileUrls.map((href) => {
      if (href.startsWith("/")) return `${siteUrl.origin}${href}`;
      return href;
    });
    
    // Paso 3: Raspar perfiles individuales (si hay links)
    if (profileLinks.length > 0) {
      const uniqueProfileUrls = [...new Set(profileLinks)];
      console.log(`Raspando ${Math.min(uniqueProfileUrls.length, 50)} perfiles individuales...`);
      
      for (const profileUrl of uniqueProfileUrls.slice(0, 50)) {
        try {
          const profileData = await scrapeProfile(page, profileUrl);
          
          const existingContactIndex = contacts.findIndex(
            (contact) => {
              if (!contact.nombre || !profileData.nombre) return false;
              const contactNameLower = contact.nombre.toLowerCase();
              const profileNameLower = profileData.nombre.toLowerCase();
              return contactNameLower.includes(profileNameLower) || 
                     profileNameLower.includes(contactNameLower);
            }
          );
          
          if (existingContactIndex >= 0) {
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
              urlFuente: profileUrl,
              _profileScraped: true,
            };
          } else if (profileData.nombre && isValidName(profileData.nombre)) {
            contacts.push({ ...profileData, urlFuente: profileUrl, _profileScraped: true });
          }
        } catch (error) {
          console.error(`Error raspando perfil ${profileUrl}:`, error);
        }
        await page.waitForTimeout(1000);
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