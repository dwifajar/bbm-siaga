"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";

type ApiStation = {
  id: number | string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
};

type ApiReport = {
  station_id: number | string;
  fuel_type: string;
  availability: string;
  queue_level: string;
  reported_at: string;
};

const fuelNames = ["Pertalite", "Solar", "Pertamax"];
const statusLabels: Record<string, string> = {
  available: "Tersedia",
  limited: "Terbatas",
  unavailable: "Kosong",
  unknown: "Belum dikonfirmasi",
};
const queueLabels: Record<string, string> = {
  none: "Tidak antre",
  short: "Antrean sepi",
  medium: "Antrean sedang",
  long: "Antrean panjang",
  unknown: "Antrean belum diketahui",
};

function formatTime(value?: string) {
  if (!value) return "Waktu laporan tidak tersedia";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Waktu laporan tidak tersedia"
    : date.toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" });
}

function makePopup(station: ApiStation, reports: ApiReport[]): HTMLElement {
  const root = document.createElement("div");
  root.className = "map-popup";

  const title = document.createElement("strong");
  title.textContent = station.name || "Lokasi BBM tanpa nama";
  root.appendChild(title);

  const address = [station.address, station.city].filter(Boolean).join(", ");
  if (address) {
    const addressText = document.createElement("span");
    addressText.textContent = address;
    root.appendChild(addressText);
  }

  const matchingReports = reports.filter(
    (report) => Number(report.station_id) === Number(station.id)
  );
  for (const fuel of fuelNames) {
    const report = matchingReports.find((item) => item.fuel_type === fuel);
    const line = document.createElement("span");
    if (!report) {
      line.textContent = `${fuel}: belum ada laporan stok atau antrean`;
    } else {
      line.textContent = `${fuel}: ${statusLabels[report.availability] ?? "Belum dikonfirmasi"} · ${queueLabels[report.queue_level] ?? "Antrean belum diketahui"}`;
    }
    root.appendChild(line);
    if (report) {
      const time = document.createElement("small");
      time.textContent = `Laporan pengguna: ${formatTime(report.reported_at)}`;
      root.appendChild(time);
    }
  }

  const note = document.createElement("small");
  note.textContent = "Lokasi dari OpenStreetMap. Stok dan antrean adalah laporan pengguna, bukan konfirmasi resmi.";
  root.appendChild(note);
  return root;
}

export default function StationMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const [loadMessage, setLoadMessage] = useState("Memuat lokasi SPBU…");
  const [stationCount, setStationCount] = useState(0);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      preferCanvas: true,
      scrollWheelZoom: true,
      wheelDebounceTime: 60,
      wheelPxPerZoomLevel: 100,
    }).setView([-2.5, 118], 4);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);
    const canvasRenderer = L.canvas({ padding: 0.4 });
    const controller = new AbortController();

    async function loadMapLocations() {
      try {
        // Coordinates are delivered as a static asset, not repeatedly read from D1.
        const response = await fetch("/data/stations.json", { signal: controller.signal });
        if (!response.ok) throw new Error("Gagal memuat data lokasi.");
        const stations: ApiStation[] = await response.json();
        if (!Array.isArray(stations)) throw new Error("Format lokasi tidak sesuai.");

        const usableStations = stations.filter((station) => {
          const latitude = Number(station.latitude);
          const longitude = Number(station.longitude);
          return station.latitude !== null && station.longitude !== null &&
            Number.isFinite(latitude) && Number.isFinite(longitude) &&
            latitude >= -90 && latitude <= 90 && longitude >= -180 && longitude <= 180;
        });
        const points: L.LatLng[] = [];

        for (const station of usableStations) {
          const point = L.latLng(Number(station.latitude), Number(station.longitude));
          points.push(point);
          const marker = L.circleMarker(point, {
            renderer: canvasRenderer,
            radius: 4,
            color: "#ffffff",
            weight: 1,
            fillColor: "#147748",
            fillOpacity: 0.84,
          });

          marker.bindPopup("Memuat laporan SPBU…");
          marker.on("popupopen", async () => {
            try {
              const reportResponse = await fetch(`/api/reports?station_id=${encodeURIComponent(String(station.id))}`, {
                cache: "no-store",
                signal: controller.signal,
              });
              if (!reportResponse.ok) throw new Error("Gagal membaca laporan");
              const data: { success?: boolean; reports?: ApiReport[] } = await reportResponse.json();
              if (!data.success || !Array.isArray(data.reports)) throw new Error("Format laporan tidak sesuai");
              marker.setPopupContent(makePopup(station, data.reports));
            } catch (error) {
              if (error instanceof Error && error.name === "AbortError") return;
              marker.setPopupContent(makePopup(station, []));
            }
          });
          markerLayer.addLayer(marker);
        }

        if (points.length > 0) {
          map.fitBounds(L.latLngBounds(points), { padding: [18, 18], maxZoom: 5 });
        } else {
          map.setView([-2.5, 118], 4);
        }
        setStationCount(points.length);
        setLoadMessage(`${points.length.toLocaleString("id-ID")} lokasi dimuat`);
        setMapError(false);
        window.setTimeout(() => map.invalidateSize(), 80);
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Gagal memuat peta SPBU:", error);
        setMapError(true);
        setLoadMessage("Peta gagal memuat data. Gunakan tombol Refresh untuk mencoba lagi.");
      }
    }

    void loadMapLocations();
    return () => {
      controller.abort();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="map-shell">
      <div className="map-demo-warning">
        <span aria-hidden="true">ⓘ</span>
        <div>
          <strong>Peta lokasi dari OpenStreetMap</strong>
          <p>
            Cakupan lokasi dapat belum lengkap. Stok dan antrean berasal dari laporan pengguna yang dapat berubah sewaktu-waktu; bukan konfirmasi resmi Pertamina. ©{" "}
            <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap contributors</a>.
          </p>
        </div>
      </div>
      <div ref={containerRef} className="bbm-leaflet-map" role="application" aria-label="Peta lokasi SPBU di Indonesia" />
      <div className="map-legend">
        <span><i className="legend-demo" /> Lokasi dari OpenStreetMap · scroll mouse untuk zoom</span>
        <span>{mapError ? "Gagal memuat" : loadMessage || `${stationCount} lokasi`}</span>
      </div>
    </div>
  );
}
