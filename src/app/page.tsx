"use client";

import { useState, useMemo } from "react";

type Contact = {
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

type Contact = {
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

type ScrapingType = "auto" | "cards" | "table" | "links";

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

function SocialBadge({ type, url }: { type: string; url?: string }) {
  if (!url) return <span className="text-gray-300">—</span>;
  
  const icons: Record<string, string> = {
    instagram: "📸",
    x: "𝕏",
    linkedin: "💼",
    facebook: "📘",
  };
  
  const colors: Record<string, string> = {
    instagram: "bg-pink-100 text-pink-700 hover:bg-pink-200",
    x: "bg-gray-100 text-gray-800 hover:bg-gray-200",
    linkedin: "bg-blue-100 text-blue-700 hover:bg-blue-200",
    facebook: "bg-blue-100 text-blue-600 hover:bg-blue-200",
  };
  
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${colors[type] || "bg-gray-100"}`}
    >
      {icons[type]} {type}
    </a>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [scrapingType, setScrapingType] = useState<ScrapingType>("auto");
  const [results, setResults] = useState<Contact[]>([]);
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setIsLoading(true);
    setResults([]);
    setExcludedIndices(new Set());
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, type: scrapingType }),
      });
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await response.json();
        setResults(data.results || []);
      } else {
        console.error("API returned non-JSON response");
        alert("Error del servidor. Probá de nuevo.");
      }
    } catch (error) {
      console.error("Error scraping:", error);
      alert("Error de conexión. Verificá la URL.");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    let filtered = results;
    // Filtrar excluidos
    filtered = results.filter((_, index) => !excludedIndices.has(index));
    // Filtrar búsqueda
    if (!searchTerm) return filtered;
    const term = searchTerm.toLowerCase();
    return filtered.filter((contact) => 
      contact.nombre?.toLowerCase().includes(term) ||
      contact.email?.toLowerCase().includes(term) ||
      contact.cargo?.toLowerCase().includes(term) ||
      contact.organizacion?.toLowerCase().includes(term)
    );
  }, [results, searchTerm, excludedIndices]);

  const exportCSV = () => {
    if (visibleContacts.length === 0) return;
    
    const headers = ["Nombre", "Email", "Cargo", "Organización", "Instagram", "X", "LinkedIn", "Facebook", "Teléfono", "URL Fuente"];
    const rows = visibleContacts.map((c) => [
      c.nombre || "",
      c.email || "",
      c.cargo || "",
      c.organizacion || "",
      c.instagram || "",
      c.x || "",
      c.linkedin || "",
      c.facebook || "",
      c.telefono || "",
      c.urlFuente || "",
    ]);
    
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leadminer-contacts-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportJSON = () => {
    if (visibleContacts.length === 0) return;
    
    const jsonContent = JSON.stringify(visibleContacts, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leadminer-contacts-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  const excludeContact = (index: number) => {
    // Calcular el índice real en el array original
    const originalIndex = results.findIndex((_, i) => {
      const filtered = filteredResults;
      return filtered[index] === results[i];
    });
    if (originalIndex >= 0) {
      setExcludedIndices(prev => new Set([...prev, originalIndex]));
    }
  };

  const clearExcluded = () => {
    setExcludedIndices(new Set());
  };

  // Contactos filtrados (sin los excluidos)
  const visibleContacts = useMemo(() => {
    return results.filter((_, index) => !excludedIndices.has(index));
  }, [results, excludedIndices]);

const copyToClipboard = async () => {
    if (visibleContacts.length === 0) return;
    
    const text = visibleContacts
      .map((c) => `${c.nombre || ""}\t${c.email || ""}\t${c.cargo || ""}\t${c.organizacion || ""}\t${c.instagram || ""}\t${c.x || ""}\t${c.linkedin || ""}\t${c.facebook || ""}`)
      .join("\n");
    
    await navigator.clipboard.writeText(text);
    alert("¡Copiado al portapapeles! 📋");
  };

  const stats = useMemo(() => {
    const contacts = results.filter((_, i) => !excludedIndices.has(i));
    const total = contacts.length;
    const withEmail = contacts.filter(r => r.email).length;
    const withPhone = contacts.filter(r => r.telefono).length;
    const withSocial = contacts.filter(r => r.instagram || r.x || r.linkedin || r.facebook).length;
    return { total, withEmail, withPhone, withSocial };
  }, [results, excludedIndices]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <header className="bg-white/80 backdrop-blur-md shadow-lg shadow-blue-100/50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img src="/logo.png" alt="LeadMiner 1810" className="h-12 w-auto" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                LeadMiner 1810
              </h1>
              <p className="text-xs text-gray-400 font-medium tracking-wide">POLITICAL CONTACT SCRAPER</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
              ✓ Solo datos públicos
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-xl shadow-blue-100/30 p-6 mb-8 border border-white/50">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🔍</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Nueva búsqueda</h2>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🌐</span>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://ejemplo.com/concerales"
                    className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-0 transition-all duration-200 text-gray-900 placeholder-gray-400"
                    required
                  />
                </div>
              </div>
              <div className="lg:w-56">
                <select
                  value={scrapingType}
                  onChange={(e) => setScrapingType(e.target.value as ScrapingType)}
                  className="w-full px-4 py-4 bg-white border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:bg-white focus:ring-0 transition-all duration-200 cursor-pointer text-gray-900"
                >
                  <option value="auto">⚡ Auto Detect</option>
                  <option value="cards">🎴 Cards</option>
                  <option value="table">📊 Table</option>
                  <option value="links">🔗 Links + Profiles</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={isLoading || !url}
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:from-gray-400 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner />
                    Analizando...
                  </>
                ) : (
                  <>🚀 Analizar Sitio</>
                )}
              </button>
            </div>
            
            <p className="mt-3 text-xs text-gray-400 italic">
              {scrapingType === "auto" && "✨ Detecta automáticamente la mejor estrategia de extracción"}
              {scrapingType === "cards" && "🎴 Busca contenedores tipo card con información de personas"}
              {scrapingType === "table" && "📊 Extrae datos estructurados de tablas HTML"}
              {scrapingType === "links" && "🔗 Raspa página principal + perfiles individuales"}
            </p>
          </form>
        </div>
        
        {results.length > 0 && (
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl shadow-lg shadow-blue-100/30 p-4 mb-6 border border-white/50">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
              <div className="flex flex-wrap gap-3">
                <div className="px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-lg text-sm font-medium">
                  📊 {stats.total} contactos
                </div>
                <div className="px-4 py-2 bg-green-50 text-green-700 border border-green-200 rounded-lg text-sm">
                  ✉️ {stats.withEmail} con email
                </div>
                <div className="px-4 py-2 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-sm">
                  📱 {stats.withPhone} con teléfono
                </div>
                <div className="px-4 py-2 bg-pink-50 text-pink-700 border border-pink-200 rounded-lg text-sm">
                  📱 {stats.withSocial} con redes
                </div>
              </div>
              
              <div className="flex gap-2 items-center">
                {excludedIndices.size > 0 && (
                  <button
                    onClick={clearExcluded}
                    className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all text-sm font-medium"
                  >
                    🔄 Limpiar ({excludedIndices.size})
                  </button>
                )}
                <button
                  onClick={exportCSV}
                  className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:from-green-600 hover:to-emerald-600 transition-all text-sm font-medium shadow-md"
                >
                  📥 CSV
                </button>
                <button
                  onClick={exportJSON}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all text-sm font-medium shadow-md"
                >
                  📥 JSON
                </button>
                <button
                  onClick={copyToClipboard}
                  className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all text-sm font-medium shadow-md"
                >
                  📋 Copiar
                </button>
              </div>
            </div>
          </div>
        )}
        
        {results.length > 0 && (
          <div className="mb-6 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔎</span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, email, cargo u organización..."
              className="w-full pl-12 pr-4 py-4 bg-white border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all shadow-sm"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
        )}
        
        {filteredResults.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredResults.map((contact, index) => (
              <div
                key={index}
                className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg shadow-blue-100/20 p-5 border border-white/50 hover:shadow-xl hover:shadow-blue-100/40 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">
                      {contact.nombre || "Sin nombre"}
                    </h3>
                    {contact.cargo && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                        {contact.cargo}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => excludeContact(index)}
                    className="text-gray-400 hover:text-red-500 transition-colors p-1"
                    title="Eliminar contacto"
                  >
                    ✕
                  </button>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {(contact.nombre || "?").charAt(0).toUpperCase()}
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  {contact.email && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>✉️</span>
                      <a href={`mailto:${contact.email}`} className="text-blue-600 hover:underline truncate">
                        {contact.email}
                      </a>
                    </div>
                  )}
                  {contact.telefono && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <span>📱</span>
                      <span>{contact.telefono}</span>
                    </div>
                  )}
                  {contact.organizacion && (
                    <div className="flex items-center gap-2 text-gray-500 text-xs">
                      <span>🏛️</span>
                      <span className="truncate">{contact.organizacion}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4 pt-3 border-t border-gray-100">
                  <SocialBadge type="instagram" url={contact.instagram} />
                  <SocialBadge type="x" url={contact.x} />
                  <SocialBadge type="linkedin" url={contact.linkedin} />
                  <SocialBadge type="facebook" url={contact.facebook} />
                </div>
                
                {contact.urlFuente && (
                  <a
                    href={contact.urlFuente}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-3 text-xs text-gray-400 hover:text-blue-500 transition"
                  >
                    📎 Ver fuente →
                  </a>
                )}
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-5xl">🔍</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">¡Empezá tu primera búsqueda!</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Ingresá una URL de una lista de concejales, legisladores o funcionarios públicos y descubrí contactos potenciales.
            </p>
          </div>
        ) : (
          <div className="text-center py-16 bg-white/50 rounded-xl">
            <span className="text-4xl mb-4 block">🔍</span>
            <p className="text-gray-500">No se encontraron resultados para "{searchTerm}"</p>
            <button
              onClick={() => setSearchTerm("")}
              className="mt-4 text-blue-600 hover:underline"
            >
              Limpiar búsqueda
            </button>
          </div>
        )}
      </main>

      <footer className="bg-white/50 backdrop-blur-sm border-t border-white/50 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-6 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src="/logo.png" alt="" className="h-6" />
            <span className="font-semibold text-gray-700">LeadMiner 1810</span>
          </div>
          <p className="text-xs text-gray-400">
            Herramienta interna • Solo datos públicos visibles • Sin logins, sin bypass
          </p>
        </div>
      </footer>
    </div>
  );
}