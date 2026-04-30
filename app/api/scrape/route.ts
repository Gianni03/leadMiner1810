import { NextResponse } from "next/server";
import { scrapeContacts } from "@/lib/scraper";

export async function POST(request: Request) {
  const { url } = await request.json();
  
  if (!url) {
    return NextResponse.json(
      { error: "URL is required" },
      { status: 400 }
    );
  }
  
  try {
    const results = await scrapeContacts(url);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Scraping error:", error);
    return NextResponse.json(
      { error: "Failed to scrape URL" },
      { status: 500 }
    );
  }
}