import { NextResponse } from "next/server";
import { getBBMSiagaDB } from "../../lib/d1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();
  const requestedLimit = Number(url.searchParams.get("limit") ?? "20");
  const limit = Number.isInteger(requestedLimit)
    ? Math.min(50, Math.max(1, requestedLimit))
    : 20;

  if (query.length < 2) {
    return NextResponse.json({
      success: true,
      stations: [],
      message: "Untuk mencari, kirim parameter q dengan minimal 2 karakter. Daftar lokasi lengkap tersedia sebagai data statis.",
    });
  }

  try {
    const db = getBBMSiagaDB();
    const pattern = `%${query}%`;
    const result = await db.prepare(`
      SELECT id, name, address, city, latitude, longitude, brand, data_source
      FROM stations
      WHERE name LIKE ?
         OR COALESCE(address, '') LIKE ?
         OR COALESCE(city, '') LIKE ?
      ORDER BY name COLLATE NOCASE
      LIMIT ?
    `).bind(pattern, pattern, pattern, limit).all();

    return NextResponse.json(
      { success: true, stations: result.results },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("BBM Siaga station search failed:", error);
    return NextResponse.json(
      { success: false, message: "Pencarian SPBU gagal. Silakan coba kembali." },
      { status: 500 }
    );
  }
}
