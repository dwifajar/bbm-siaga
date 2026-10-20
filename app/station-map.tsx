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

type ApiResponse = {
  success?: boolean;
  stations?: ApiStation[];
  reports?: ApiReport[];
};

const fuelNames = ["Pertalite", "Solar", "Pertamax"];
const statusLabels: Record<string, string> = {
  available: "Tersedia",
  limited: "Terbatas",
  unavailable: "Kosong",
  unknown: "Belum dikonfirmasi",
};
const queueLabels: Record<string, string> = {
  short: "Pendek",
  medium: "Sedang",
  long: "Panjang",
  unknown: "Belum diketahui",
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

  if (matchingReports.length === 0) {
    const noReport = document.createElement("small");
    noReport.textContent = "Belum ada laporan stok atau antrean dari pengguna.";
    root.appendChild(noReport);
  } else {
    for (const fuel of fuelNames) {
      const report = matchingReports.find((item) => item.fuel_type === fuel);
      if (!report) continue;

      const line = document.createElement("span");
      line.textContent =
        `${fuel}: ${statusLabels[report.availability] ?? "Belum dikonfirmasi"} · ` +
        `antrean ${queueLabels[report.queue_level] ?? "Belum diketahui"}`;
      root.appendChild(line);

      const time = document.createElement("small");
      time.textContent = `Laporan pengguna: ${formatTime(report.reported_at)}`;
      root.appendChild(time);
    }
  }

  const note = document.createElement("small");
  note.textContent =
    "Lokasi dari OpenStreetMap. Status stok dan antrean adalah laporan pengguna, bukan konfirmasi resmi.";
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
      // Aktifkan zoom dengan roda/scroll mouse ketika kursor berada di peta.
      scrollWheelZoom: true,
      wheelDebounceTime: 60,
      wheelPxPerZoomLevel: 100,
    }).setView([-2.5, 118], 4);

    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markerLayer = L.layerGroup().addTo(map);
    const canvasRenderer = L.canvas({ padding: 0.4 });
    const controller = new AbortController();
    let markersBuilt = false;
    let latestReports: ApiReport[] = [];
    let lastStationIds = "";

    async function loadMapData() {
      try {
        const response = await fetch("/api/stations", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Gagal memuat data lokasi.");

        const data: ApiResponse = await response.json();
        if (!data.success || !Array.isArray(data.stations) || !Array.isArray(data.reports)) {
          throw new Error("Format data lokasi tidak sesuai.");
        }

        latestReports = data.reports;
        const usableStations = data.stations.filter((station) => {
          const latitude = Number(station.latitude);
          const longitude = Number(station.longitude);
          return Number.isFinite(latitude) &&
            Number.isFinite(longitude) &&
            latitude >= -90 && latitude <= 90 &&
            longitude >= -180 && longitude <= 180 &&
            station.latitude !== null &&
            station.longitude !== null;
        });

        const currentStationIds = usableStations
          .map((station) => String(station.id))
          .sort()
          .join(",");

        if (!markersBuilt || currentStationIds !== lastStationIds) {
          markerLayer.clearLayers();
          const points: L.LatLng[] = [];

          for (const station of usableStations) {
            const lat = Number(station.latitude);
            const lon = Number(station.longitude);
            const point = L.latLng(lat, lon);
            points.push(point);

            const marker = L.circleMarker(point, {
              renderer: canvasRenderer,
              radius: 4,
              color: "#ffffff",
              weight: 1,
              fillColor: "#147748",
              fillOpacity: 0.84,
            });

            // Popup diisi dengan DOM textContent agar teks data tidak
            // dieksekusi sebagai HTML.
            marker.bindPopup(() => makePopup(station, latestReports));
            markerLayer.addLayer(marker);
          }

          if (points.length > 0) {
            map.fitBounds(L.latLngBounds(points), {
              padding: [18, 18],
              maxZoom: 5,
            });
          } else {
            map.setView([-2.5, 118], 4);
          }

          markersBuilt = true;
          lastStationIds = currentStationIds;
          setStationCount(points.length);
          window.setTimeout(() => map.invalidateSize(), 80);
        } else {
          setStationCount(usableStations.length);
        }

        setMapError(false);
        setLoadMessage(
          usableStations.length > 0
            ? `${usableStations.length.toLocaleString("id-ID")} lokasi dimuat`
            : "Belum ada lokasi berkoordinat di database"
        );
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        console.error("Gagal memuat peta SPBU:", error);
        setMapError(true);
        setLoadMessage("Peta gagal memuat data. Coba muat ulang halaman.");
      }
    }

    void loadMapData();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") void loadMapData();
    }, 15000);

    return () => {
      window.clearInterval(intervalId);
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
            Cakupan lokasi dapat belum lengkap. Stok dan antrean berasal dari
            laporan pengguna yang dapat berubah sewaktu-waktu; bukan konfirmasi
            resmi Pertamina. ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap contributors
            </a>
            .
          </p>
        </div>
      </div>

      <div
        ref={containerRef}
        className="bbm-leaflet-map"
        role="application"
        aria-label="Peta lokasi SPBU di Indonesia"
      />

      <div className="map-legend">
        <span>
          <i className="legend-demo" /> Lokasi dari OpenStreetMap · scroll mouse untuk zoom
        </span>
        <span>
          {mapError ? "Gagal memuat" : loadMessage || `${stationCount} lokasi`}
        </span>
      </div>
    </div>
  );
}
