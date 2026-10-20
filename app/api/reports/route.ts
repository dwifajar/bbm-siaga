import { NextResponse } from "next/server";
import { getDatabase } from "@netlify/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validFuels = ["Pertalite", "Solar", "Pertamax"] as const;
const validAvailability = ["available", "limited", "unavailable", "unknown"] as const;
const validQueues = ["none", "short", "medium", "long", "unknown"] as const;

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const stationId = Number(body.station_id);
    const fuelType = body.fuel_type;
    const availability = body.availability;
    const queueLevel = body.queue_level ?? "unknown";
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;
    const reporterName = typeof body.reporter_name === "string" ? body.reporter_name.trim() : null;

    if (
      !Number.isSafeInteger(stationId) ||
      stationId <= 0 ||
      !validFuels.includes(fuelType) ||
      !validAvailability.includes(availability) ||
      !validQueues.includes(queueLevel) ||
      (notes !== null && notes.length > 500) ||
      (reporterName !== null && reporterName.length > 80)
    ) {
      return NextResponse.json(
        { success: false, message: "Data laporan tidak valid." },
        { status: 400 }
      );
    }

    const db = getDatabase();

    const stations = await db.sql`
      SELECT id
      FROM public.stations
      WHERE id = ${stationId}
      LIMIT 1
    `;

    if (stations.length === 0) {
      return NextResponse.json(
        { success: false, message: "SPBU tidak ditemukan. Laporan tidak disimpan." },
        { status: 404 }
      );
    }

    const inserted = await db.sql`
      INSERT INTO public.fuel_reports (
        station_id,
        fuel_type,
        availability,
        queue_level,
        notes,
        reporter_name
      )
      VALUES (
        ${stationId},
        ${fuelType},
        ${availability},
        ${queueLevel},
        ${notes},
        ${reporterName}
      )
      RETURNING id, station_id, fuel_type, availability, queue_level, reported_at
    `;

    return NextResponse.json(
      {
        success: true,
        message: "Laporan tersimpan dan langsung menjadi laporan terbaru untuk jenis BBM ini.",
        report: inserted[0],
        displayedImmediately: true,
        verifiedByOfficialSource: false,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("BBM Siaga report API failed:", error);
    return NextResponse.json(
      { success: false, message: "Laporan gagal disimpan. Silakan coba kembali." },
      { status: 500 }
    );
  }
}
