"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
const StationMap = dynamic(() => import("./station-map"), { ssr: false, loading: () => <div className="map-loading">Memuat peta lokasi SPBU…</div> });

type Fuel = "Pertalite" | "Solar" | "Pertamax";
type Status = "Tersedia" | "Terbatas" | "Kosong" | "Belum dikonfirmasi";
type Queue = "Tidak antre" | "Pendek" | "Sedang" | "Panjang" | "Belum diketahui";
type Station = {
  id: number; name: string; area: string; distance: string;
  fuels: Record<Fuel, { status: Status; queue: Queue; updated: string }>;
  demo?: boolean;
};

type ApiStation = {
  id: number | string;
  name: string;
  address: string | null;
  city: string | null;
};

type ApiProduct = {
  station_id: number | string;
  fuel_type: string;
  availability: string;
  updated_at?: string | null;
};

type ApiReport = {
  station_id: number | string;
  fuel_type: string;
  availability: string;
  queue_level: string;
  reported_at: string;
};

const availabilityToStatus: Record<string, Status> = {
  available: "Tersedia",
  limited: "Terbatas",
  unavailable: "Kosong",
  unknown: "Belum dikonfirmasi",
};

const statusToAvailability: Record<Status, string> = {
  Tersedia: "available",
  Terbatas: "limited",
  Kosong: "unavailable",
  "Belum dikonfirmasi": "unknown",
};

const queueToApi: Record<Queue, string> = {
  "Tidak antre": "none",
  Pendek: "short",
  Sedang: "medium",
  Panjang: "long",
  "Belum diketahui": "unknown",
};

const apiToQueue: Record<string, Queue> = {
  none: "Tidak antre",
  short: "Pendek",
  medium: "Sedang",
  long: "Panjang",
  unknown: "Belum diketahui",
};

function formatUpdated(value?: string | null) {
  if (!value) return "Belum ada laporan";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu tidak diketahui";
  return date.toLocaleString("id-ID", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function mapApiStation(station: ApiStation, products: ApiProduct[], reports: ApiReport[]): Station {
  const stationProducts = products.filter(
    (product) => Number(product.station_id) === Number(station.id)
  );
  const stationReports = reports.filter(
    (report) => Number(report.station_id) === Number(station.id)
  );

  const stationFuels = Object.fromEntries(
    fuels.map((fuelName) => {
      const product = stationProducts.find(
        (item) => item.fuel_type === fuelName
      );
      const latestReport = stationReports.find(
        (item) => item.fuel_type === fuelName
      );

      // Laporan terbaru ditampilkan sebagai laporan pengguna yang belum
      // diverifikasi. Tanpa laporan, gunakan status produk resmi yang
      // dikelola di station_fuel_products atau "Belum dikonfirmasi".
      const statusSource = latestReport ?? product;
      const status = statusSource
        ? availabilityToStatus[statusSource.availability] ??
          "Belum dikonfirmasi"
        : "Belum dikonfirmasi";

      return [
        fuelName,
        {
          status,
          queue: latestReport
            ? apiToQueue[latestReport.queue_level] ?? "Belum diketahui"
            : "Belum diketahui",
          updated: latestReport
            ? `Laporan pengguna • ${formatUpdated(latestReport.reported_at)}`
            : formatUpdated(product?.updated_at),
        },
      ];
    })
  ) as Record<Fuel, { status: Status; queue: Queue; updated: string }>;

  return {
    id: Number(station.id),
    name: station.name,
    area: [station.address, station.city].filter(Boolean).join(", ") ||
      "Lokasi belum dilengkapi",
    distance: "Jarak belum tersedia",
    fuels: stationFuels,
    demo: /uji|contoh|demo/i.test(station.name),
  };
}

const fuels: Fuel[] = ["Pertalite", "Solar", "Pertamax"];
const statuses: Status[] = ["Tersedia", "Terbatas", "Kosong", "Belum dikonfirmasi"];
const queues: Queue[] = ["Tidak antre", "Pendek", "Sedang", "Panjang", "Belum diketahui"];

function statusClass(status: Status) {
  if (status === "Tersedia") return "green";
  if (status === "Terbatas" || status === "Belum dikonfirmasi") return "amber";
  return "red";
}
function queueClass(queue: Queue) {
  if (queue === "Tidak antre" || queue === "Pendek") return "green";
  if (queue === "Sedang") return "amber";
  if (queue === "Panjang") return "red";
  return "muted";
}

function queueDescription(queue: Queue) {
  switch (queue) {
    case "Tidak antre": return "Tidak antre";
    case "Pendek": return "Antrean sepi";
    case "Sedang": return "Antrean sedang";
    case "Panjang": return "Antrean panjang";
    default: return "Antrean belum diketahui";
  }
}

function statusDescription(status: Status) {
  switch (status) {
    case "Tersedia": return "Stok dilaporkan tersedia";
    case "Terbatas": return "Stok terbatas";
    case "Kosong": return "Dilaporkan kosong";
    default: return "Belum ada laporan stok";
  }
}

export default function Home() {
  const [fuel, setFuel] = useState<Fuel>("Pertalite");
  const [area, setArea] = useState("");
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [queueFilter, setQueueFilter] = useState("Semua");
  const [stations, setStations] = useState<Station[]>([]);
  const [stationsLoading, setStationsLoading] = useState(true);
  const [stationsError, setStationsError] = useState(false);
  const [reportSending, setReportSending] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportMessageType, setReportMessageType] = useState<"success" | "error">("success");
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [reportStation, setReportStation] = useState<number | null>(null);
  const [reportStatus, setReportStatus] = useState<Status>("Tersedia");
  const [reportQueue, setReportQueue] = useState<Queue>("Pendek");

  // Pulihkan SPBU pilihan setelah halaman direfresh.
  useEffect(() => {
    try {
      const savedId = window.localStorage.getItem("bbmsiaga:selectedStationId");
      const savedName = window.localStorage.getItem("bbmsiaga:selectedStationName");
      const parsedId = Number(savedId);

      if (savedId && Number.isSafeInteger(parsedId) && parsedId > 0) {
        setSelectedStationId(parsedId);
        if (savedName) setArea(savedName);
      }
    } catch (error) {
      console.warn("Pilihan SPBU sebelumnya tidak dapat dipulihkan:", error);
    }
  }, []);




  const loadStations = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setStationsLoading(true);
      setStationsError(false);
    }

    try {
      const response = await fetch("/api/stations", {
        cache: "no-store",
      });
      if (!response.ok) {
        throw new Error("Gagal membaca data SPBU dari server.");
      }

      const data: {
        success?: boolean;
        stations?: ApiStation[];
        products?: ApiProduct[];
        reports?: ApiReport[];
      } = await response.json();

      if (
        !data.success ||
        !Array.isArray(data.stations) ||
        !Array.isArray(data.products) ||
        !Array.isArray(data.reports)
      ) {
        throw new Error("Format data SPBU dari server tidak sesuai.");
      }

      const mapped = data.stations.map((station) =>
        mapApiStation(station, data.products ?? [], data.reports ?? [])
      );
      setStations(mapped);
      setStationsError(false);
    } catch (error) {
      console.error("Gagal memuat SPBU:", error);
      // Pertahankan data terakhir yang berhasil dimuat saat refresh berkala
      // gagal. Tampilkan pesan error hanya saat pemuatan awal/manual.
      if (showLoading) setStationsError(true);
    } finally {
      if (showLoading) setStationsLoading(false);
    }
  }, []);

  function backToTop() {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  useEffect(() => {
    const updateBackToTopVisibility = () => {
      setShowBackToTop(window.scrollY > 280);
    };

    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });

    return () => {
      window.removeEventListener("scroll", updateBackToTopVisibility);
    };
  }, []);

  useEffect(() => {
    void loadStations(true);

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") {
        void loadStations(false);
      }
    };

    // Perubahan laporan dari pengguna lain akan tampak otomatis paling lambat
    // sekitar 15 detik pada tab yang sedang aktif.
    const intervalId = window.setInterval(refreshWhenVisible, 15000);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [loadStations]);

  const visibleStations = useMemo(() => stations.filter(s => {
    const f = s.fuels[fuel];
    const matchesArea = !area || `${s.name} ${s.area}`.toLowerCase().includes(area.toLowerCase());
    const matchesQueue = queueFilter === "Semua" || f.queue === queueFilter;
    return matchesArea && matchesQueue;
  }), [stations, fuel, area, queueFilter]);

  const selectedStation = useMemo(
    () => selectedStationId === null
      ? null
      : stations.find((station) => station.id === selectedStationId) ?? null,
    [stations, selectedStationId]
  );

  const displayedStations = useMemo(
    () => selectedStation ? [selectedStation] : [],
    [selectedStation]
  );

  const searchMatches = useMemo(
    () => area.trim().length >= 2 && selectedStationId === null
      ? visibleStations.slice(0, 8)
      : [],
    [area, selectedStationId, visibleStations]
  );

  function chooseStation(station: Station) {
    setSelectedStationId(station.id);
    setArea(station.name);

    try {
      window.localStorage.setItem("bbmsiaga:selectedStationId", String(station.id));
      window.localStorage.setItem("bbmsiaga:selectedStationName", station.name);
    } catch (error) {
      console.warn("Pilihan SPBU tidak dapat disimpan di browser:", error);
    }
  }

  function clearStationSelection() {
    setSelectedStationId(null);
    setArea("");

    try {
      window.localStorage.removeItem("bbmsiaga:selectedStationId");
      window.localStorage.removeItem("bbmsiaga:selectedStationName");
    } catch (error) {
      console.warn("Pilihan SPBU tersimpan tidak dapat dihapus:", error);
    }
  }

  function openReport(station: Station) {
    setReportStation(station.id);
    setReportStatus(station.fuels[fuel].status);
    setReportQueue(station.fuels[fuel].queue);
    setReportMessage("");
  }

  async function submitReport() {
    if (reportStation === null || reportSending) return;
    setReportSending(true);
    setReportMessage("");

    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station_id: reportStation,
          fuel_type: fuel,
          availability: statusToAvailability[reportStatus],
          queue_level: queueToApi[reportQueue],
          notes: null,
          reporter_name: null,
        }),
      });
      const result: { success?: boolean; message?: string } = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "Laporan gagal disimpan.");
      }

      setReportStation(null);
      await loadStations(false);
      setReportMessage("Laporan tersimpan dan tampilan diperbarui. Pengguna lain akan menerima pembaruan otomatis.");
      setReportMessageType("success");
      window.setTimeout(() => setReportMessage(""), 5000);
    } catch (error) {
      console.error("Gagal mengirim laporan:", error);
      setReportMessage(error instanceof Error ? error.message : "Laporan gagal disimpan. Silakan coba kembali.");
      setReportMessageType("error");
    } finally {
      setReportSending(false);
    }
  }

  return (
    <main>
      <div className="topline"><div className="container topcontent"><span>● Informasi publik independen</span><span>Database • pembaruan otomatis tiap 15 detik</span></div></div>
      <header className="container header">
        <a className="brand" href="#" aria-label="BBM Siaga Beranda"><span className="brandIcon">⛽</span><span><strong>BBM Siaga</strong><small>Pantau BBM. Cek antrean.</small></span></a>
        <nav><a href="#peta">Peta SPBU</a><a href="#cari">Cari SPBU</a><a href="#cara-kerja">Cara kerja</a><a href="#tentang">Tentang</a></nav>
        <div className="headerActions">
          <button className="refreshButton" type="button" onClick={() => window.location.reload()} aria-label="Refresh halaman website" title="Refresh halaman website">
            <span className="refreshIcon" aria-hidden="true">↻</span>
            <span>Refresh</span>
          </button>
          <a className="navCta" href="#lapor">Bantu laporkan <span>↗</span></a>
        </div>
      </header>

      <section className="hero">
        <div className="heroGlow"></div>
        <div className="container heroGrid">
          <div className="heroCopy">
            <div className="eyebrow"><span className="pulse"></span> INFORMASI DARI LAPANGAN</div>
            <h1>Sebelum berangkat,<br/><em>cek BBM dulu.</em></h1>
            <p>Temukan informasi stok Pertalite, Solar, dan Pertamax serta kondisi antrean SPBU dari laporan terbaru.</p>
            <div className="heroActions"><a className="button primary" href="#cari">Temukan SPBU <span>→</span></a><a className="textLink" href="#cara-kerja">Bagaimana cara kerjanya?</a></div>
            <div className="trustLine"><span>✓</span> Waktu laporan ditampilkan <span>·</span> Status bisa berubah</div>
          </div>
          <div className="heroCard">
            <div className="heroCardHead"><div><small>RINGKASAN INFORMASI</small><h3>Pantau pilihan BBM</h3></div><span className="liveTag"><i/> DATABASE</span></div>
            {fuels.map((f, i) => <button key={f} className={`fuelRow ${fuel === f ? "selected" : ""}`} onClick={() => { setFuel(f); document.getElementById("cari")?.scrollIntoView({ behavior: "smooth" }); }}>
              <span className={`fuelBadge fuel${i}`}>{i === 0 ? "P" : i === 1 ? "S" : "PX"}</span><span className="fuelName"><strong>{f}</strong><small>{i === 1 ? "Solar subsidi" : i === 0 ? "BBM bersubsidi" : "BBM nonsubsidi"}</small></span><span className="fuelArrow">↗</span>
            </button>)}
            <div className="heroCardFoot"><span>ⓘ</span> Laporan pengguna • data dapat berubah sewaktu-waktu.</div>
          </div>
        </div>
      </section>

      <section className="container noticeWrap" id="tentang">
        {noticeOpen && <div className="notice"><div className="noticeIcon">i</div><div><strong>Pemberitahuan penting</strong><p>BBM Siaga adalah aplikasi informasi publik independen, bukan aplikasi resmi PT Pertamina (Persero), PT Pertamina Patra Niaga, atau anak perusahaan/afiliasi Pertamina. Laporan pada aplikasi berasal dari pengguna dan bukan konfirmasi resmi Pertamina. Pastikan lokasi dan kondisi sesuai yang Anda lihat.</p><a href="#disclaimer">Baca disclaimer lengkap ↓</a></div><button className="closeNotice" onClick={() => setNoticeOpen(false)} aria-label="Tutup pemberitahuan">×</button></div>}
      </section>

      <section className="container mapSection" id="peta">
        <div className="sectionHeading"><div><div className="eyebrow dark">PETA LOKASI</div><h2>Lihat sebaran titik pada peta</h2><p>Lokasi awal bersumber dari OpenStreetMap dan dapat belum lengkap. Informasi stok serta antrean berasal dari laporan pengguna.</p></div><span className="demoPill">LOKASI OSM</span></div>
        <StationMap />
      </section>

      <section className="container searchSection" id="cari">
        <div className="sectionHeading"><div><div className="eyebrow dark">PENCARIAN SPBU</div><h2>Temukan BBM pilihan Anda</h2><p>Gunakan filter untuk melihat status tiap jenis BBM.</p></div><span className="demoPill">DATA DATABASE</span></div>
        <div className="filters selected-station-filters">
          <label className="filterLabel">Jenis BBM
            <span className="selectWrap"><select value={fuel} onChange={e => setFuel(e.target.value as Fuel)}>{fuels.map(f => <option key={f}>{f}</option>)}</select><b>⌄</b></span>
          </label>
          <label className="filterLabel stationSearchLabel">Cari dan pilih satu SPBU
            <input
              value={area}
              onChange={e => {
                setArea(e.target.value);
                setSelectedStationId(null);
                try {
                  window.localStorage.removeItem("bbmsiaga:selectedStationId");
                  window.localStorage.removeItem("bbmsiaga:selectedStationName");
                } catch (error) {
                  console.warn("Pilihan SPBU tersimpan tidak dapat dihapus:", error);
                }
              }}
              placeholder="Ketik nama SPBU atau wilayah (min. 2 huruf)"
              aria-label="Cari nama SPBU atau wilayah"
            />
          </label>
          <label className="filterLabel">Kondisi antrean
            <span className="selectWrap"><select value={queueFilter} onChange={e => setQueueFilter(e.target.value)}>{["Semua", ...queues].map(q => <option key={q}>{q}</option>)}</select><b>⌄</b></span>
          </label>
        </div>

        {searchMatches.length > 0 && (
          <div className="stationSearchResults" role="listbox" aria-label="Pilih satu SPBU">
            <div className="stationSearchResultsTitle">Pilih satu SPBU untuk melihat rinciannya</div>
            {searchMatches.map(station => (
              <button
                type="button"
                className="stationSearchOption"
                key={station.id}
                onClick={() => chooseStation(station)}
              >
                <span className="stationSearchPin">⛽</span>
                <span className="stationSearchOptionText"><strong>{station.name}</strong><small>{station.area}</small></span>
                <span className="stationSearchChoose">Lihat rincian →</span>
              </button>
            ))}
            {visibleStations.length > searchMatches.length && <p className="stationSearchMore">Ada hasil lainnya. Tambahkan kata pencarian agar lebih spesifik.</p>}
          </div>
        )}

        <div className="resultHeader">
          <strong>
            {stationsLoading
              ? "Memuat data SPBU…"
              : selectedStation
                ? "1 SPBU dipilih"
                : area.trim().length < 2
                  ? "Belum ada SPBU dipilih"
                  : `${visibleStations.length} hasil pencarian`}
          </strong>
          <span>Hanya SPBU yang Anda pilih yang ditampilkan</span>
        </div>

        <div className="stationList">
          {stationsLoading && <div className="empty">Sedang memuat data SPBU…</div>}
          {!stationsLoading && stationsError && <div className="empty">Data SPBU gagal dimuat. Gunakan tombol Refresh untuk mencoba lagi.</div>}
          {!stationsLoading && !stationsError && !selectedStation && area.trim().length < 2 && (
            <div className="empty selectedStationEmpty">
              <span className="emptySearchIcon">⌕</span>
              <strong>Cari SPBU yang ingin Anda kunjungi</strong>
              <p>Ketik nama SPBU atau wilayah, lalu pilih satu hasil. Kami hanya akan menampilkan kartu SPBU yang Anda pilih agar halaman lebih rapi.</p>
            </div>
          )}
          {!stationsLoading && !stationsError && !selectedStation && area.trim().length >= 2 && visibleStations.length === 0 && (
            <div className="empty">SPBU tidak ditemukan untuk pencarian ini. Coba nama wilayah yang lebih umum atau periksa ejaan.</div>
          )}
          {displayedStations.map(s => <article className="station" key={s.id}>
            <div className="stationPin">⛽</div><div className="stationMain"><div className="stationTitle"><h3>{s.name}</h3>{s.demo && <span className="demoTag">DATA UJI</span>}</div><p className="stationArea">⌖ {s.area} <span>·</span> {s.distance}</p><div className="stationFuelSummary">
              <div className="stationFuelSummaryHead">
                <strong>Ringkasan stok dan antrean</strong>
                <span>Semua jenis BBM di SPBU pilihan Anda</span>
              </div>
              <div className="stationFuelGrid">
                {fuels.map((fuelName, fuelIndex) => {
                  const info = s.fuels[fuelName];
                  const selected = fuel === fuelName;
                  return (
                    <button
                      key={fuelName}
                      type="button"
                      className={`stationFuelItem ${selected ? "active" : ""}`}
                      onClick={() => setFuel(fuelName)}
                      aria-pressed={selected}
                      title={`Pilih ${fuelName} untuk laporan di ${s.name}`}
                    >
                      <span className={`fuelBadge fuel${fuelIndex}`}>
                        {fuelIndex === 0 ? "P" : fuelIndex === 1 ? "S" : "PX"}
                      </span>
                      <span className="stationFuelText">
                        <span className="stationFuelName">{fuelName}</span>
                        {selected && <span className="stationFuelSelected">SEDANG DIPILIH</span>}
                        <span className={`pill ${statusClass(info.status)}`}>
                          <i /> {statusDescription(info.status)}
                        </span>
                        <span className={`pill ${queueClass(info.queue)}`}>
                          <i /> {queueDescription(info.queue)}
                        </span>
                        <small className="stationFuelUpdated">{info.updated}</small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div></div>
            <div className="selectedStationActions">
              <button className="reportButton" onClick={() => openReport(s)} title={`Laporkan kondisi ${fuel} di ${s.name}`}>＋ Laporkan {fuel}</button>
              <button className="changeStationButton" type="button" onClick={clearStationSelection} title="Pilih SPBU lain">Pilih SPBU lain</button>
            </div>
          </article>)}
        </div>

      </section>

      <section className="howSection" id="cara-kerja"><div className="container"><div className="sectionHeading centered"><div><div className="eyebrow dark">MUDAH DAN TRANSPARAN</div><h2>Informasi lebih jelas, keputusan lebih baik.</h2><p>Setiap informasi perlu memiliki sumber dan waktu pembaruan.</p></div></div><div className="howGrid">
        <div className="howCard"><span className="howNum">01</span><div className="howIcon">⌕</div><h3>Pilih jenis BBM</h3><p>Pilih Pertalite, Solar, atau Pertamax sesuai kebutuhan Anda.</p></div>
        <div className="howCard"><span className="howNum">02</span><div className="howIcon">◷</div><h3>Periksa laporan</h3><p>Perhatikan status, antrean, dan waktu laporan terbaru dari pengguna.</p></div>
        <div className="howCard"><span className="howNum">03</span><div className="howIcon">↗</div><h3>Konfirmasi dahulu</h3><p>Pastikan informasi kepada SPBU sebelum melakukan perjalanan.</p></div>
      </div></div></section>

      <section className="container reportSection" id="lapor"><div className="reportBanner"><div><div className="eyebrow light">BANTU SESAMA PENGGUNA</div><h2>Baru dari SPBU?</h2><p>Laporan langsung ditampilkan sebagai informasi terbaru dari pengguna. Sampaikan kondisi yang benar-benar Anda lihat di SPBU.</p></div><a className="button lightButton" href="#cari">Pilih lokasi untuk melapor <span>→</span></a></div></section>

      <section className="container disclaimer" id="disclaimer"><div className="disclaimerIcon">ⓘ</div><div><h3>Disclaimer dan batas penggunaan</h3><p>BBM Siaga merupakan layanan informasi publik independen. Aplikasi ini tidak dimiliki, dikelola, disponsori, didukung, atau mewakili PT Pertamina (Persero), PT Pertamina Patra Niaga, maupun anak perusahaan atau afiliasinya. Nama produk BBM digunakan hanya untuk mengidentifikasi jenis bahan bakar.</p><p>Informasi stok dan antrean dapat berasal dari laporan pengguna. Laporan terbaru ditampilkan tanpa persetujuan admin dan dapat tidak akurat atau kedaluwarsa. Informasi tidak menjamin ketersediaan, waktu tunggu, maupun pelayanan; konfirmasi kepada SPBU sebelum berangkat. Patuhi ketentuan pembelian dan penyaluran BBM yang berlaku. Hubungi SPBU untuk konfirmasi sebelum berangkat.</p></div></section>

      <footer><div className="container footerInner"><a className="brand footerBrand" href="#"><span className="brandIcon">⛽</span><span><strong>BBM Siaga</strong><small>Informasi publik independen</small></span></a><span>© {new Date().getFullYear()} BBM Siaga. Bukan aplikasi resmi Pertamina.</span><span className="footerCredit">Design by Mas Fa</span></div></footer>

      {reportStation !== null && <div className="modalBackdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !reportSending) setReportStation(null); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><button className="modalClose" onClick={() => !reportSending && setReportStation(null)} aria-label="Tutup" disabled={reportSending}>×</button><div className="eyebrow dark">LAPORAN PENGGUNA</div><h2 id="modalTitle">Perbarui informasi SPBU</h2><p className="modalIntro">Laporkan kondisi <strong>{fuel}</strong> di <strong>{stations.find(s => s.id === reportStation)?.name}</strong>. Laporan menjadi informasi terbaru untuk jenis BBM yang dipilih, jadi pastikan sesuai kondisi yang Anda lihat.</p><label className="filterLabel">Jenis BBM<select value={fuel} onChange={e => { const nextFuel = e.target.value as Fuel; setFuel(nextFuel); const selectedStation = stations.find(s => s.id === reportStation); if (selectedStation) { setReportStatus(selectedStation.fuels[nextFuel].status); setReportQueue(selectedStation.fuels[nextFuel].queue); } }}>{fuels.map(f => <option key={f}>{f}</option>)}</select></label><label className="filterLabel">Status stok<select value={reportStatus} onChange={e => setReportStatus(e.target.value as Status)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label className="filterLabel">Kondisi antrean<select value={reportQueue} onChange={e => setReportQueue(e.target.value as Queue)}>{queues.map(q => <option key={q}>{q}</option>)}</select></label><div className="modalWarning">Laporan langsung menjadi laporan terbaru yang ditampilkan. Pastikan laporan sesuai kondisi yang Anda lihat; data ini bukan konfirmasi resmi stok BBM.</div><button className="button primary full" onClick={() => void submitReport()} disabled={reportSending}>{reportSending ? "Mengirim laporan…" : "Kirim laporan"}</button></div></div>}
      {showBackToTop && <button className="backToTopButton" type="button" onClick={backToTop} aria-label="Kembali ke awal halaman" title="Kembali ke awal halaman">↑</button>}
      {reportMessage && <div className="toast" role="status" aria-live="polite" data-status={reportMessageType}>{reportMessageType === "success" ? "✓ " : "⚠ "}{reportMessage}</div>}
    </main>
  );
}