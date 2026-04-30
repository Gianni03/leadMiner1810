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

export async function scrapeContacts(url: string): Promise<ScrapedContact[]> {
  // Mock data para probar el flujo completo
  if (url.includes("mock")) {
    return [
      {
        nombre: "Juan Pérez",
        cargo: "Concejal",
        organizacion: "Municipalidad de Córdoba",
        email: "juan.perez@cordoba.gob.ar",
        instagram: "https://instagram.com/juanperez",
        x: "https://x.com/juanperez",
        linkedin: "https://linkedin.com/in/juanperez",
        urlFuente: url,
      },
      {
        nombre: "María Gómez",
        cargo: "Legisladora",
        organizacion: "Gobierno de CABA",
        email: "maria.gomez@buenosaires.gob.ar",
        instagram: "https://instagram.com/mariagomez",
        urlFuente: url,
      },
    ];
  }

  // Lógica real (por ahora devuelve vacío)
  let browser: Browser | null = null;
  try {
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 10000 });
    await page.waitForTimeout(1000);
    
    const { links, emails, instagramLinks, xLinks, linkedinLinks, facebookLinks } =
      await extractLinks(page);
    
    console.log("Links encontrados:", links.length);
    console.log("Emails:", emails);
    console.log("Instagram:", instagramLinks);
    
    return [];
  } catch (error) {
    console.error("Error en scrapeContacts:", error);
    return [];
  } finally {
    if (browser) await browser.close();
  }
}