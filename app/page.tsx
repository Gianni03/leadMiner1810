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

export default function Home() {
  const [url, setUrl] = useState("");
  const [results, setResults] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setIsLoading(true);
    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error("Error scraping:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filtrar resultados por búsqueda
  const filteredResults = useMemo(() => {
    if (!searchTerm) return results;
    const term = searchTerm.toLowerCase();
    return results.filter((contact) => 
      contact.nombre?.toLowerCase().includes(term) ||
      contact.email?.toLowerCase().includes(term) ||
      contact.cargo?.toLowerCase().includes(term) ||
      contact.organizacion?.toLowerCase().includes(term)
    );
  }, [results, searchTerm]);

  // Exportar a CSV
  const exportCSV = () => {
    if (filteredResults.length === 0) return;
    
    const headers = ["Nombre", "Email", "Cargo", "Organización", "Instagram", "X", "LinkedIn", "Facebook", "Teléfono", "URL Fuente"];
    const rows = filteredResults.map((c) => [
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

  // Exportar a JSON
  const exportJSON = () => {
    if (filteredResults.length === 0) return;
    
    const jsonContent = JSON.stringify(filteredResults, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `leadminer-contacts-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
  };

  // Copiar al portapapeles
  const copyToClipboard = async () => {
    if (filteredResults.length === 0) return;
    
    const text = filteredResults
      .map((c) => `${c.nombre || ""}\t${c.email || ""}\t${c.cargo || ""}\t${c.organizacion || ""}\t${c.instagram || ""}\t${c.x || ""}\t${c.linkedin || ""}\t${c.facebook || ""}`)
      .join("\n");
    
    await navigator.clipboard.writeText(text);
    alert("Copiado al portapapeles!");
  };

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">LeadMiner 1810</h1>
      
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-4 mb-4">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://ejemplo.com/concejales"
            className="flex-1 p-2 border rounded"
            required
          />
          <button
            type="submit"
            disabled={isLoading || !url}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
          >
            {isLoading ? "Analizando..." : "Analizar Sitio"}
          </button>
        </div>
      </form>
      
      {/* Botones de exportación */}
      {results.length > 0 && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={exportCSV}
            className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
          >
            Exportar CSV
          </button>
          <button
            onClick={exportJSON}
            className="px-3 py-1 bg-purple-500 text-white rounded text-sm hover:bg-purple-600"
          >
            Exportar JSON
          </button>
          <button
            onClick={copyToClipboard}
            className="px-3 py-1 bg-orange-500 text-white rounded text-sm hover:bg-orange-600"
          >
            Copiar al portapapeles
          </button>
          <span className="ml-auto text-sm text-gray-600">
            {filteredResults.length} de {results.length} contactos
          </span>
        </div>
      )}
      
      {/* Buscador */}
      {results.length > 0 && (
        <div className="mb-4">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, email, cargo u organización..."
            className="w-full p-2 border rounded"
          />
        </div>
      )}
      
      {/* Tabla de resultados */}
      <div className="overflow-x-auto">
        {filteredResults.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {results.length === 0 
              ? "Ingresá una URL y hacé clic en 'Analizar Sitio' para comenzar" 
              : "No se encontraron resultados para la búsqueda"}
          </div>
        ) : (
          <table className="min-w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border text-left">Nombre</th>
                <th className="p-2 border text-left">Email</th>
                <th className="p-2 border text-left">Cargo</th>
                <th className="p-2 border text-left">Instagram</th>
                <th className="p-2 border text-left">X</th>
                <th className="p-2 border text-left">LinkedIn</th>
                <th className="p-2 border text-left">Facebook</th>
                <th className="p-2 border text-left">Teléfono</th>
                <th className="p-2 border text-left">URL Fuente</th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="p-2 border">{row.nombre || "-"}</td>
                  <td className="p-2 border">{row.email || "-"}</td>
                  <td className="p-2 border">{row.cargo || "-"}</td>
                  <td className="p-2 border">
                    {row.instagram ? <a href={row.instagram} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link</a> : "-"}
                  </td>
                  <td className="p-2 border">
                    {row.x ? <a href={row.x} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link</a> : "-"}
                  </td>
                  <td className="p-2 border">
                    {row.linkedin ? <a href={row.linkedin} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link</a> : "-"}
                  </td>
                  <td className="p-2 border">
                    {row.facebook ? <a href={row.facebook} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">Link</a> : "-"}
                  </td>
                  <td className="p-2 border">{row.telefono || "-"}</td>
                  <td className="p-2 border">
                    {row.urlFuente ? <a href={row.urlFuente} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline text-xs">Fuente</a> : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </main>
  );
}