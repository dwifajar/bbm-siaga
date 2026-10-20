
import { NextResponse } from "next/server";
import { getDatabase } from "@netlify/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDatabase();

    const rows = await db.sql<{
      stations: number;
      station_fuel_products: number;
      fuel_reports: number;
      app_settings: number;
    }>`
      SELECT
        (SELECT COUNT(*)::int FROM public.stations) AS stations,
        (SELECT COUNT(*)::int FROM public.station_fuel_products) AS station_fuel_products,
        (SELECT COUNT(*)::int FROM public.fuel_reports) AS fuel_reports,
        (SELECT COUNT(*)::int FROM public.app_settings) AS app_settings
    `;

    return NextResponse.json({
      success: true,
      message: "Koneksi database berhasil.",
      counts: rows[0],
    });
  } catch (error) {
    console.error("BBM Siaga database check failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Pemeriksaan database gagal.",
      },
      { status: 500 }
    );
  }
}
