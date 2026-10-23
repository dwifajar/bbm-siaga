import { NextResponse } from "next/server";
import { getBBMSiagaDB } from "../../lib/d1";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getBBMSiagaDB();
    const stationCount = await db.prepare("SELECT COUNT(*) AS count FROM stations")
      .first<{ count: number }>();
    const reportCount = await db.prepare("SELECT COUNT(*) AS count FROM fuel_reports")
      .first<{ count: number }>();
    return NextResponse.json({
      success: true,
      message: "Koneksi Cloudflare D1 berhasil.",
      counts: { stations: stationCount?.count ?? 0, fuel_reports: reportCount?.count ?? 0 },
    });
  } catch (error) {
    console.error("BBM Siaga D1 check failed:", error);
    return NextResponse.json(
      { success: false, message: "Koneksi database gagal." },
      { status: 500 }
    );
  }
}
