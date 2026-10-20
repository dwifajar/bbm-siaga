
import { NextResponse } from "next/server";
import { getDatabase } from "@netlify/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDatabase();

    const stations = await db.sql`
      SELECT
        s.id,
        s.name,
        s.address,
        s.city,
        s.latitude,
        s.longitude,
        s.created_at,
        s.updated_at
      FROM public.stations AS s
      ORDER BY s.name ASC
    `;

    const products = await db.sql`
      SELECT
        station_id,
        fuel_type,
        availability,
        updated_at
      FROM public.station_fuel_products
      ORDER BY station_id, fuel_type
    `;

    return NextResponse.json({
      success: true,
      stations,
      products,
    });
  } catch (error) {
    console.error("BBM Siaga stations API failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Gagal membaca data SPBU.",
      },
      { status: 500 }
    );
  }
}
