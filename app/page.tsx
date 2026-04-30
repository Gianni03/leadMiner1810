"use client";

import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [results, setResults] = useState<Array<Record<string, string>>>([]);
  const [isLoading, setIsLoading] = useState(false);

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

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold mb-6">LeadMiner 1810</h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
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
      
      <div className="overflow-x-auto">
        <table className="min-w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2 border">Nombre</th>
              <th className="p-2 border">Email</th>
              <th className="p-2 border">Instagram</th>
              <th className="p-2 border">X</th>
              <th className="p-2 border">LinkedIn</th>
              <th className="p-2 border">Cargo</th>
              <th className="p-2 border">URL Fuente</th>
            </tr>
          </thead>
          <tbody>
            {results.map((row, index) => (
              <tr key={index} className="hover:bg-gray-50">
                <td className="p-2 border">{row.nombre || "-"}</td>
                <td className="p-2 border">{row.email || "-"}</td>
                <td className="p-2 border">{row.instagram ? <a href={row.instagram} className="text-blue-500">Link</a> : "-"}</td>
                <td className="p-2 border">{row.x ? <a href={row.x} className="text-blue-500">Link</a> : "-"}</td>
                <td className="p-2 border">{row.linkedin ? <a href={row.linkedin} className="text-blue-500">Link</a> : "-"}</td>
                <td className="p-2 border">{row.cargo || "-"}</td>
                <td className="p-2 border">{row.urlFuente ? <a href={row.urlFuente} className="text-blue-500">Fuente</a> : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}