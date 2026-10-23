import { NextResponse } from "next/server";
import { getBBMSiagaDB } from "../../lib/d1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const validFuels = ["Pertalite", "Solar", "Pertamax"] as const;
const validAvailability = ["available", "limited", "unavailable", "unknown"] as const;
const validQueues = ["none", "short", "medium", "long", "unknown"] as const;

type ReportRow = {
  id: number;
  station_id: number;
  fuel_type: string;
  availability: string;
  queue_level: string;
  notes: string | null;
  reported_at: string;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const stationId = Number(url.searchParams.get("station_id"));
  if (!Number.isSafeInteger(stationId) || stationId <= 0) {
    return NextResponse.json(
      { success: false, message: "Parameter station_id wajib diisi." },
      { status: 400 }
    );
  }

  try {
    const db = getBBMSiagaDB();
    const result = await db.prepare(`
      SELECT r.id, r.station_id, r.fuel_type, r.availability,
             r.queue_level, r.notes, r.reported_at
      FROM fuel_reports AS r
      WHERE r.station_id = ?
        AND r.id = (
          SELECT r2.id
          FROM fuel_reports AS r2
          WHERE r2.station_id = r.station_id
            AND r2.fuel_type = r.fuel_type
          ORDER BY r2.reported_at DESC, r2.id DESC
          LIMIT 1
        )
      ORDER BY r.fuel_type
    `).bind(stationId).all<ReportRow>();

    return NextResponse.json(
      { success: true, reports: result.results },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("BBM Siaga reports GET failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal membaca laporan SPBU." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const stationId = Number(body.station_id);
    const fuelType = body.fuel_type;
    const availability = body.availability;
    const queueLevel = body.queue_level ?? "unknown";
    const notes = typeof body.notes === "string" ? body.notes.trim() : null;
    const reporterName = typeof body.reporter_name === "string" ? body.reporter_name.trim() : null;

    if (
      !Number.isSafeInteger(stationId) || stationId <= 0 ||
      typeof fuelType !== "string" || !validFuels.includes(fuelType as (typeof validFuels)[number]) ||
      typeof availability !== "string" || !validAvailability.includes(availability as (typeof validAvailability)[number]) ||
      typeof queueLevel !== "string" || !validQueues.includes(queueLevel as (typeof validQueues)[number]) ||
      (notes !== null && notes.length > 500) ||
      (reporterName !== null && reporterName.length > 80)
    ) {
      return NextResponse.json(
        { success: false, message: "Data laporan tidak valid." },
        { status: 400 }
      );
    }

    const db = getBBMSiagaDB();
    const station = await db.prepare("SELECT id FROM stations WHERE id = ? LIMIT 1")
      .bind(stationId).first<{ id: number }>();
    if (!station) {
      return NextResponse.json(
        { success: false, message: "SPBU tidak ditemukan. Laporan belum disimpan." },
        { status: 404 }
      );
    }

    const inserted = await db.prepare(`
      INSERT INTO fuel_reports
        (station_id, fuel_type, availability, queue_level, notes, reporter_name, reported_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(stationId, fuelType, availability, queueLevel, notes, reporterName).run();

    const reportId = Number(inserted.meta?.last_row_id ?? 0);
    const report = reportId
      ? await db.prepare(`
          SELECT id, station_id, fuel_type, availability, queue_level, notes, reported_at
          FROM fuel_reports WHERE id = ? LIMIT 1
        `).bind(reportId).first<ReportRow>()
      : null;

    return NextResponse.json(
      {
        success: true,
        message: "Laporan tersimpan dan langsung menjadi laporan terbaru untuk jenis BBM ini.",
        report,
        displayedImmediately: true,
        verifiedByOfficialSource: false,
      },
      { status: 201, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("BBM Siaga report API failed:", error);
    return NextResponse.json(
      { success: false, message: "Laporan gagal disimpan. Silakan coba kembali." },
      { status: 500 }
    );
  }
}
