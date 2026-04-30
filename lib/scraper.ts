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

export async function scrapeContacts(url: string): Promise<ScrapedContact[]> {
  // Implementación pendiente
  return [];
}