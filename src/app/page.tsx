"use client";

import { useState, useMemo } from "react";

type ScrapingType = "auto" | "cards" | "table" | "links";

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
  provincia?: string;
  ciudad?: string;
  partido?: string;
  urlFuente?: string;
  _profileScraped?: boolean;
};

type SortKey = keyof Contact;
type SortDir = "asc" | "desc";

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [scrapingType, setScrapingType] = useState<ScrapingType>("auto");
  const [results, setResults] = useState<Contact[]>([]);
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("nombre");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [copied, setCopied] = useState(false);

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
    let filtered = results.filter((_, index) => !excludedIndices.has(index));
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((c) => 
        c.nombre?.toLowerCase().includes(term) ||
        c.email?.toLowerCase().includes(term) ||
        c.cargo?.toLowerCase().includes(term) ||
        c.organizacion?.toLowerCase().includes(term) ||
        c.provincia?.toLowerCase().includes(term) ||
        c.ciudad?.toLowerCase().includes(term) ||
        c.partido?.toLowerCase().includes(term)
      );
    }
    // Sort
    return [...filtered].sort((a, b) => {
      const aVal = String(a[sortKey] ?? "");
      const bVal = String(b[sortKey] ?? "");
      const cmp = aVal.localeCompare(bVal, "es", { sensitivity: "base" });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [results, searchTerm, excludedIndices, sortKey, sortDir]);

  const stats = useMemo(() => {
    const visible = results.filter((_, i) => !excludedIndices.has(i));
    return {
      total: visible.length,
      withEmail: visible.filter(r => r.email).length,
      withPhone: visible.filter(r => r.telefono).length,
      withSocial: visible.filter(r => r.instagram || r.x || r.linkedin || r.facebook).length,
    };
  }, [results, excludedIndices]);

  const exportCSV = () => {
    if (filteredResults.length === 0) return;
    const headers = ["nombre","email","cargo","organizacion","instagram","x","linkedin","facebook","telefono","provincia","ciudad","partido","url_fuente"];
    const rows = filteredResults.map((c) => [
      c.nombre || "", c.email || "", c.cargo || "", c.organizacion || "",
      c.instagram || "", c.x || "", c.linkedin || "", c.facebook || "",
      c.telefono || "", c.provincia || "", c.ciudad || "", c.partido || "",
      c.urlFuente || "",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leadminer-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const exportJSON = () => {
    if (filteredResults.length === 0) return;
    const clean = filteredResults.map(({ _profileScraped, ...rest }: any) => rest);
    const jsonContent = JSON.stringify(clean, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leadminer-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  const copyToClipboard = async () => {
    if (filteredResults.length === 0) return;
    const headers = ["nombre","email","cargo","organizacion","instagram","x","linkedin","facebook","telefono","provincia","ciudad","partido"];
    const rows = filteredResults.map((c) => [
      c.nombre || "", c.email || "", c.cargo || "", c.organizacion || "",
      c.instagram || "", c.x || "", c.linkedin || "", c.facebook || "",
      c.telefono || "", c.provincia || "", c.ciudad || "", c.partido || ""
    ]);
    const text = [headers.join("\t"), ...rows.map(r => r.join("\t"))].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const excludeContact = (contact: Contact) => {
    const originalIndex = results.indexOf(contact);
    if (originalIndex >= 0) {
      setExcludedIndices(prev => new Set([...prev, originalIndex]));
    }
  };

  const clearExcluded = () => setExcludedIndices(new Set());

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-[1400px] mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="LeadMiner 1810" className="h-10 w-auto" />
            <div className="border-l border-gray-200 pl-3">
              <h1 className="text-lg font-bold text-gray-900">LeadMiner 1810</h1>
              <p className="text-[11px] text-gray-400 font-medium tracking-wider uppercase">Political Contact Scraper</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400">Solo datos públicos</span>
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-[1400px] mx-auto px-6 py-6 w-full">
        {/* Search Bar */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-3 items-center">
            <div className="flex-1 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🌐</span>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Ingresá la URL del listado de contactos públicos..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm text-gray-900 placeholder-gray-400"
                required
              />
            </div>
            <select
              value={scrapingType}
              onChange={(e) => setScrapingType(e.target.value as ScrapingType)}
              className="px-3 py-3 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-700 cursor-pointer"
            >
              <option value="auto">Auto Detect</option>
              <option value="cards">Cards</option>
              <option value="table">Table</option>
              <option value="links">Links + Profiles</option>
            </select>
            <button
              type="submit"
              disabled={isLoading || !url}
              className="px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2 whitespace-nowrap"
            >
              {isLoading ? <><LoadingSpinner /> Analizando...</> : "Analizar Sitio"}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-400">
            {scrapingType === "auto" && "Detecta automáticamente la estructura de la página"}
            {scrapingType === "cards" && "Para sitios con tarjetas de perfiles"}
            {scrapingType === "table" && "Para listados en tablas HTML"}
            {scrapingType === "links" && "Raspa página principal + perfiles individuales"}
          </p>
        </form>

        {/* Results Section */}
        {results.length > 0 && (
          <>
            {/* Stats Bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm font-semibold text-gray-900">{stats.total} contactos</span>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{stats.withEmail} con email</span>
                  <span className="text-gray-300">·</span>
                  <span>{stats.withPhone} con teléfono</span>
                  <span className="text-gray-300">·</span>
                  <span>{stats.withSocial} con redes</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {excludedIndices.size > 0 && (
                  <button onClick={clearExcluded} className="px-3 py-1.5 text-xs text-gray-600 bg-gray-100 rounded hover:bg-gray-200 transition">
                    Restaurar ({excludedIndices.size})
                  </button>
                )}
                <button onClick={exportCSV} className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-600 rounded hover:bg-emerald-700 transition">
                  CSV
                </button>
                <button onClick={exportJSON} className="px-3 py-1.5 text-xs font-medium text-white bg-violet-600 rounded hover:bg-violet-700 transition">
                  JSON
                </button>
                <button onClick={copyToClipboard} className="px-3 py-1.5 text-xs font-medium text-white bg-amber-600 rounded hover:bg-amber-700 transition">
                  {copied ? "✓ Copiado" : "Copiar"}
                </button>
              </div>
            </div>

            {/* Search Filter */}
            <div className="mb-4 relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">🔍</span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Filtrar por nombre, email, cargo..."
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-gray-900 placeholder-gray-400"
              />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
              )}
            </div>

            {/* Data Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("nombre")}>
                        Nombre <SortIcon column="nombre" />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("email")}>
                        Email <SortIcon column="email" />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("cargo")}>
                        Cargo / Bloque <SortIcon column="cargo" />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("provincia")}>
                        Provincia <SortIcon column="provincia" />
                      </th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600">Partido</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 w-12">IG</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 w-12">X</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 w-12">IN</th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 w-12">FB</th>
                      <th className="px-4 py-3 text-left font-semibold text-gray-600 cursor-pointer hover:text-gray-900 select-none" onClick={() => handleSort("telefono")}>
                        Teléfono <SortIcon column="telefono" />
                      </th>
                      <th className="px-4 py-3 text-center font-semibold text-gray-600 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredResults.map((contact, index) => (
                      <tr key={index} className="hover:bg-blue-50/50 transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                              {(contact.nombre || "?").charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{contact.nombre || "—"}</div>
                              {contact.organizacion && (
                                <div className="text-xs text-gray-400 truncate max-w-[200px]">{contact.organizacion}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {contact.email ? (
                            <a href={`mailto:${contact.email}`} className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-mono">
                              {contact.email}
                            </a>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          {contact.cargo ? (
                            <span className="inline-block px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded">
                              {contact.cargo}
                            </span>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {contact.provincia || <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {contact.partido ? (
                            <span className="inline-block px-2 py-0.5 bg-orange-50 text-orange-700 text-xs rounded">{contact.partido}</span>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {contact.instagram ? (
                            <a href={contact.instagram} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-6 h-6 bg-gradient-to-br from-purple-500 to-pink-500 text-white rounded text-[10px] font-bold hover:opacity-80 transition">IG</a>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {contact.x ? (
                            <a href={contact.x} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-6 h-6 bg-gray-900 text-white rounded text-[10px] font-bold hover:opacity-80 transition">X</a>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {contact.linkedin ? (
                            <a href={contact.linkedin} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-6 h-6 bg-blue-700 text-white rounded text-[10px] font-bold hover:opacity-80 transition">in</a>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {contact.facebook ? (
                            <a href={contact.facebook} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-6 h-6 bg-blue-600 text-white rounded text-[10px] font-bold hover:opacity-80 transition">fb</a>
                          ) : <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600 font-mono">
                          {contact.telefono || <span className="text-gray-200">—</span>}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => excludeContact(contact)}
                            className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100 text-xs"
                            title="Excluir"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {results.length === 0 && !isLoading && (
          <div className="text-center py-24">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⛏️</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-1">Ready to mine</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto">
              Ingresá una URL con un listado público de contactos y extraé los datos automáticamente.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-[1400px] mx-auto px-6 py-3 flex items-center justify-between text-xs text-gray-400">
          <span>LeadMiner 1810 · Herramienta interna</span>
          <span>Solo datos públicos · Sin logins · Sin bypass</span>
        </div>
      </footer>
    </div>
  );
}
