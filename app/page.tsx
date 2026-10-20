 "use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
const StationMap = dynamic(() => import("./station-map"), { ssr: false, loading: () => <div className="map-loading">Memuat peta pratinjau…</div> });

type Fuel = "Pertalite" | "Solar" | "Pertamax";
type Status = "Tersedia" | "Terbatas" | "Kosong" | "Belum dikonfirmasi";
type Queue = "Pendek" | "Sedang" | "Panjang" | "Belum diketahui";
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
  Pendek: "short",
  Sedang: "medium",
  Panjang: "long",
  "Belum diketahui": "unknown",
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

function mapApiStation(station: ApiStation, products: ApiProduct[]): Station {
  const stationProducts = products.filter(
    (product) => Number(product.station_id) === Number(station.id)
  );

  const stationFuels = Object.fromEntries(
    fuels.map((fuelName) => {
      const product = stationProducts.find(
        (item) => item.fuel_type === fuelName
      );
      return [
        fuelName,
        {
          status: product
            ? availabilityToStatus[product.availability] ??
              "Belum dikonfirmasi"
            : "Belum dikonfirmasi",
          queue: "Belum diketahui" as Queue,
          updated: formatUpdated(product?.updated_at),
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
const queues: Queue[] = ["Pendek", "Sedang", "Panjang", "Belum diketahui"];

function statusClass(status: Status) {
  if (status === "Tersedia") return "green";
  if (status === "Terbatas" || status === "Belum dikonfirmasi") return "amber";
  return "red";
}
function queueClass(queue: Queue) {
  if (queue === "Pendek") return "green";
  if (queue === "Sedang") return "amber";
  if (queue === "Panjang") return "red";
  return "muted";
}

export default function Home() {
  const [fuel, setFuel] = useState<Fuel>("Pertalite");
  const [area, setArea] = useState("");
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



  useEffect(() => {
    let active = true;

    async function loadStations() {
      setStationsLoading(true);
      setStationsError(false);
      try {
        const response = await fetch("/api/stations", { cache: "no-store" });
        if (!response.ok) throw new Error("Gagal membaca data SPBU dari server.");

        const data: {
          success?: boolean;
          stations?: ApiStation[];
          products?: ApiProduct[];
        } = await response.json();

        if (!data.success || !Array.isArray(data.stations) || !Array.isArray(data.products)) {
          throw new Error("Format data SPBU dari server tidak sesuai.");
        }

        const mapped = data.stations.map((station) =>
          mapApiStation(station, data.products ?? [])
        );
        if (active) {
          setStations(mapped);
          setStationsError(false);
        }
      } catch (error) {
        console.error("Gagal memuat SPBU:", error);
        if (active) setStationsError(true);
      } finally {
        if (active) setStationsLoading(false);
      }
    }

    void loadStations();
    return () => { active = false; };
  }, []);

  const visibleStations = useMemo(() => stations.filter(s => {
    const f = s.fuels[fuel];
    const matchesArea = !area || `${s.name} ${s.area}`.toLowerCase().includes(area.toLowerCase());
    const matchesQueue = queueFilter === "Semua" || f.queue === queueFilter;
    return matchesArea && matchesQueue;
  }), [stations, fuel, area, queueFilter]);

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
      setReportMessage(result.message || "Laporan berhasil disimpan dan menunggu verifikasi.");
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
      <div className="topline"><div className="container topcontent"><span>● Informasi publik independen</span><span>Data dari database • status perlu dikonfirmasi</span></div></div>
      <header className="container header">
        <a className="brand" href="#" aria-label="BBM Siaga Beranda"><span className="brandIcon">⛽</span><span><strong>BBM Siaga</strong><small>Pantau BBM. Cek antrean.</small></span></a>
        <nav><a href="#peta">Peta SPBU</a><a href="#cari">Cari SPBU</a><a href="#cara-kerja">Cara kerja</a><a href="#tentang">Tentang</a></nav>
        <a className="navCta" href="#lapor">Bantu laporkan <span>↗</span></a>
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
            <div className="heroCardFoot"><span>ⓘ</span> Data ketersediaan dapat berubah dan belum tentu terverifikasi.</div>
          </div>
        </div>
      </section>

      <section className="container noticeWrap" id="tentang">
        {noticeOpen && <div className="notice"><div className="noticeIcon">i</div><div><strong>Pemberitahuan penting</strong><p>BBM Siaga adalah aplikasi informasi publik independen, bukan aplikasi resmi PT Pertamina (Persero), PT Pertamina Patra Niaga, atau anak perusahaan/afiliasi Pertamina. Data pada pratinjau ini adalah simulasi, bukan laporan SPBU aktual.</p><a href="#disclaimer">Baca disclaimer lengkap ↓</a></div><button className="closeNotice" onClick={() => setNoticeOpen(false)} aria-label="Tutup pemberitahuan">×</button></div>}
      </section>

      <section className="container mapSection" id="peta">
        <div className="sectionHeading"><div><div className="eyebrow dark">PETA LOKASI</div><h2>Lihat sebaran titik pada peta</h2><p>Pratinjau teknis peta interaktif. Lokasi marker belum diverifikasi sebagai SPBU sungguhan.</p></div><span className="demoPill">MARKER SIMULASI</span></div>
        <StationMap />
      </section>

      <section className="container searchSection" id="cari">
        <div className="sectionHeading"><div><div className="eyebrow dark">PENCARIAN SPBU</div><h2>Temukan BBM pilihan Anda</h2><p>Gunakan filter untuk melihat status tiap jenis BBM.</p></div><span className="demoPill">DATA DATABASE</span></div>
        <div className="filters">
          <label className="filterLabel">Jenis BBM <span className="selectWrap"><select value={fuel} onChange={e => setFuel(e.target.value as Fuel)}>{fuels.map(f => <option key={f}>{f}</option>)}</select><b>⌄</b></span></label>
          <label className="filterLabel">Cari nama/wilayah SPBU <input value={area} onChange={e => setArea(e.target.value)} placeholder="Contoh: SPBU atau nama wilayah"/></label>
          <label className="filterLabel">Kondisi antrean <span className="selectWrap"><select value={queueFilter} onChange={e => setQueueFilter(e.target.value)}>{["Semua", ...queues].map(q => <option key={q}>{q}</option>)}</select><b>⌄</b></span></label>
        </div>
        <div className="resultHeader"><strong>{stationsLoading ? "Memuat data SPBU…" : `${visibleStations.length} lokasi dari database`}</strong><span>Data dapat berubah • konfirmasi sebelum berangkat</span></div>
        <div className="stationList">
          {stationsLoading && <div className="empty">Sedang memuat data SPBU…</div>}
          {!stationsLoading && stationsError && <div className="empty">Data SPBU gagal dimuat. Silakan muat ulang halaman.</div>}
          {visibleStations.map(s => <article className="station" key={s.id}>
            <div className="stationPin">⛽</div><div className="stationMain"><div className="stationTitle"><h3>{s.name}</h3>{s.demo && <span className="demoTag">DATA UJI</span>}</div><p className="stationArea">⌖ {s.area} <span>·</span> {s.distance}</p><div className="stationDetails"><span className={`pill ${statusClass(s.fuels[fuel].status)}`}><i/> {s.fuels[fuel].status}</span><span className={`pill ${queueClass(s.fuels[fuel].queue)}`}><i/> Antrean {s.fuels[fuel].queue.toLowerCase()}</span></div><small className="updated">◷ Pembaruan: {s.fuels[fuel].updated}</small></div>
            <button className="reportButton" onClick={() => openReport(s)}>＋ Laporkan</button>
          </article>)}
          {!stationsLoading && !stationsError && visibleStations.length === 0 && <div className="empty">Belum ada SPBU yang cocok atau belum ada data SPBU di database. SPBU baru akan muncul setelah ditambahkan ke sistem.</div>}
        </div>
      </section>

      <section className="howSection" id="cara-kerja"><div className="container"><div className="sectionHeading centered"><div><div className="eyebrow dark">MUDAH DAN TRANSPARAN</div><h2>Informasi lebih jelas, keputusan lebih baik.</h2><p>Setiap informasi perlu memiliki sumber dan waktu pembaruan.</p></div></div><div className="howGrid">
        <div className="howCard"><span className="howNum">01</span><div className="howIcon">⌕</div><h3>Pilih jenis BBM</h3><p>Pilih Pertalite, Solar, atau Pertamax sesuai kebutuhan Anda.</p></div>
        <div className="howCard"><span className="howNum">02</span><div className="howIcon">◷</div><h3>Periksa laporan</h3><p>Perhatikan status, antrean, waktu pembaruan, dan tingkat verifikasi.</p></div>
        <div className="howCard"><span className="howNum">03</span><div className="howIcon">↗</div><h3>Konfirmasi dahulu</h3><p>Pastikan informasi kepada SPBU sebelum melakukan perjalanan.</p></div>
      </div></div></section>

      <section className="container reportSection" id="lapor"><div className="reportBanner"><div><div className="eyebrow light">BANTU SESAMA PENGGUNA</div><h2>Baru dari SPBU?</h2><p>Laporan disimpan ke sistem dan tetap perlu diverifikasi sebelum dianggap sebagai informasi yang dapat diandalkan.</p></div><a className="button lightButton" href="#cari">Pilih lokasi untuk melapor <span>→</span></a></div></section>

      <section className="container disclaimer" id="disclaimer"><div className="disclaimerIcon">ⓘ</div><div><h3>Disclaimer dan batas penggunaan</h3><p>BBM Siaga merupakan layanan informasi publik independen. Aplikasi ini tidak dimiliki, dikelola, disponsori, didukung, atau mewakili PT Pertamina (Persero), PT Pertamina Patra Niaga, maupun anak perusahaan atau afiliasinya. Nama produk BBM digunakan hanya untuk mengidentifikasi jenis bahan bakar.</p><p>Informasi stok dan antrean dapat berasal dari laporan pengguna, petugas yang berpartisipasi, atau sumber lain. Laporan belum tentu terverifikasi. Informasi dapat berubah dan tidak menjamin ketersediaan, waktu tunggu, maupun pelayanan. Patuhi ketentuan pembelian dan penyaluran BBM yang berlaku. Hubungi SPBU untuk konfirmasi sebelum berangkat.</p></div></section>

      <footer><div className="container footerInner"><a className="brand footerBrand" href="#"><span className="brandIcon">⛽</span><span><strong>BBM Siaga</strong><small>Informasi publik independen</small></span></a><span>© {new Date().getFullYear()} BBM Siaga. Bukan aplikasi resmi Pertamina.</span><a href="#disclaimer">Disclaimer</a></div></footer>

      {reportStation !== null && <div className="modalBackdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget && !reportSending) setReportStation(null); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><button className="modalClose" onClick={() => !reportSending && setReportStation(null)} aria-label="Tutup" disabled={reportSending}>×</button><div className="eyebrow dark">LAPORAN PENGGUNA</div><h2 id="modalTitle">Perbarui informasi SPBU</h2><p className="modalIntro">Pilih status untuk {stations.find(s => s.id === reportStation)?.name}. Laporan akan disimpan ke server dan menunggu verifikasi.</p><label className="filterLabel">Jenis BBM<select value={fuel} onChange={e => setFuel(e.target.value as Fuel)}>{fuels.map(f => <option key={f}>{f}</option>)}</select></label><label className="filterLabel">Status stok<select value={reportStatus} onChange={e => setReportStatus(e.target.value as Status)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label className="filterLabel">Kondisi antrean<select value={reportQueue} onChange={e => setReportQueue(e.target.value as Queue)}>{queues.map(q => <option key={q}>{q}</option>)}</select></label><div className="modalWarning">Laporan akan disimpan dan menunggu verifikasi. Jangan mengirim laporan palsu atau menganggapnya sebagai konfirmasi stok resmi.</div><button className="button primary full" onClick={() => void submitReport()} disabled={reportSending}>{reportSending ? "Mengirim laporan…" : "Kirim laporan"}</button></div></div>}
      {reportMessage && <div className="toast" role="status" aria-live="polite" data-status={reportMessageType}>{reportMessageType === "success" ? "✓ " : "⚠ "}{reportMessage}</div>}
    </main>
  );
}