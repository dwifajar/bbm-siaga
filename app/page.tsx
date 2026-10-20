 "use client";

import { useMemo, useState } from "react";
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

const initialStations: Station[] = [
  { id: 1, name: "SPBU Contoh A", area: "Kota/Kabupaten Anda", distance: "2,1 km", demo: true,
    fuels: {
      Pertalite: { status: "Tersedia", queue: "Pendek", updated: "8 menit lalu" },
      Solar: { status: "Belum dikonfirmasi", queue: "Belum diketahui", updated: "Belum ada laporan" },
      Pertamax: { status: "Tersedia", queue: "Sedang", updated: "12 menit lalu" }
    }},
  { id: 2, name: "SPBU Contoh B", area: "Kota/Kabupaten Anda", distance: "4,8 km", demo: true,
    fuels: {
      Pertalite: { status: "Kosong", queue: "Panjang", updated: "15 menit lalu" },
      Solar: { status: "Tersedia", queue: "Sedang", updated: "6 menit lalu" },
      Pertamax: { status: "Terbatas", queue: "Pendek", updated: "20 menit lalu" }
    }},
  { id: 3, name: "SPBU Contoh C", area: "Kota/Kabupaten Anda", distance: "6,3 km", demo: true,
    fuels: {
      Pertalite: { status: "Belum dikonfirmasi", queue: "Belum diketahui", updated: "Belum ada laporan" },
      Solar: { status: "Kosong", queue: "Sedang", updated: "32 menit lalu" },
      Pertamax: { status: "Tersedia", queue: "Pendek", updated: "5 menit lalu" }
    }}
];

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
  const [stations, setStations] = useState(initialStations);
  const [noticeOpen, setNoticeOpen] = useState(true);
  const [reportStation, setReportStation] = useState<number | null>(null);
  const [reportStatus, setReportStatus] = useState<Status>("Tersedia");
  const [reportQueue, setReportQueue] = useState<Queue>("Pendek");
  const [reportSent, setReportSent] = useState(false);

  const visibleStations = useMemo(() => stations.filter(s => {
    const f = s.fuels[fuel];
    const matchesArea = !area || `${s.name} ${s.area}`.toLowerCase().includes(area.toLowerCase());
    const matchesQueue = queueFilter === "Semua" || f.queue === queueFilter;
    return matchesArea && matchesQueue;
  }), [stations, fuel, area, queueFilter]);

  function submitDemoReport() {
    if (reportStation === null) return;
    setStations(prev => prev.map(s => s.id === reportStation
      ? { ...s, fuels: { ...s.fuels, [fuel]: { status: reportStatus, queue: reportQueue, updated: "Baru saja (simulasi)" } } }
      : s));
    setReportSent(true);
    setReportStation(null);
    window.setTimeout(() => setReportSent(false), 3500);
  }

  return (
    <main>
      <div className="topline"><div className="container topcontent"><span>● Informasi publik independen</span><span>Data contoh untuk pratinjau aplikasi</span></div></div>
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
            <div className="heroCardHead"><div><small>RINGKASAN INFORMASI</small><h3>Pantau pilihan BBM</h3></div><span className="liveTag"><i/> DEMO</span></div>
            {fuels.map((f, i) => <button key={f} className={`fuelRow ${fuel === f ? "selected" : ""}`} onClick={() => { setFuel(f); document.getElementById("cari")?.scrollIntoView({ behavior: "smooth" }); }}>
              <span className={`fuelBadge fuel${i}`}>{i === 0 ? "P" : i === 1 ? "S" : "PX"}</span><span className="fuelName"><strong>{f}</strong><small>{i === 1 ? "Solar subsidi" : i === 0 ? "BBM bersubsidi" : "BBM nonsubsidi"}</small></span><span className="fuelArrow">↗</span>
            </button>)}
            <div className="heroCardFoot"><span>ⓘ</span> Ini contoh tampilan, bukan data stok aktual.</div>
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
        <div className="sectionHeading"><div><div className="eyebrow dark">PENCARIAN SPBU</div><h2>Temukan BBM pilihan Anda</h2><p>Gunakan filter untuk melihat status tiap jenis BBM.</p></div><span className="demoPill">MODE PRATINJAU</span></div>
        <div className="filters">
          <label className="filterLabel">Jenis BBM <span className="selectWrap"><select value={fuel} onChange={e => setFuel(e.target.value as Fuel)}>{fuels.map(f => <option key={f}>{f}</option>)}</select><b>⌄</b></span></label>
          <label className="filterLabel">Cari nama/wilayah SPBU <input value={area} onChange={e => setArea(e.target.value)} placeholder="Contoh: SPBU atau nama wilayah"/></label>
          <label className="filterLabel">Kondisi antrean <span className="selectWrap"><select value={queueFilter} onChange={e => setQueueFilter(e.target.value)}>{["Semua", ...queues].map(q => <option key={q}>{q}</option>)}</select><b>⌄</b></span></label>
        </div>
        <div className="resultHeader"><strong>{visibleStations.length} lokasi contoh</strong><span>Data simulasi • tidak untuk navigasi aktual</span></div>
        <div className="stationList">
          {visibleStations.map(s => <article className="station" key={s.id}>
            <div className="stationPin">⛽</div><div className="stationMain"><div className="stationTitle"><h3>{s.name}</h3><span className="demoTag">CONTOH</span></div><p className="stationArea">⌖ {s.area} <span>·</span> {s.distance}</p><div className="stationDetails"><span className={`pill ${statusClass(s.fuels[fuel].status)}`}><i/> {s.fuels[fuel].status}</span><span className={`pill ${queueClass(s.fuels[fuel].queue)}`}><i/> Antrean {s.fuels[fuel].queue.toLowerCase()}</span></div><small className="updated">◷ Pembaruan: {s.fuels[fuel].updated}</small></div>
            <button className="reportButton" onClick={() => { setReportStation(s.id); setReportStatus(s.fuels[fuel].status); setReportQueue(s.fuels[fuel].queue); setReportSent(false); }}>＋ Laporkan</button>
          </article>)}
          {visibleStations.length === 0 && <div className="empty">Tidak ada lokasi contoh yang cocok. Coba ubah kata pencarian atau filter antrean.</div>}
        </div>
      </section>

      <section className="howSection" id="cara-kerja"><div className="container"><div className="sectionHeading centered"><div><div className="eyebrow dark">MUDAH DAN TRANSPARAN</div><h2>Informasi lebih jelas, keputusan lebih baik.</h2><p>Setiap informasi perlu memiliki sumber dan waktu pembaruan.</p></div></div><div className="howGrid">
        <div className="howCard"><span className="howNum">01</span><div className="howIcon">⌕</div><h3>Pilih jenis BBM</h3><p>Pilih Pertalite, Solar, atau Pertamax sesuai kebutuhan Anda.</p></div>
        <div className="howCard"><span className="howNum">02</span><div className="howIcon">◷</div><h3>Periksa laporan</h3><p>Perhatikan status, antrean, waktu pembaruan, dan tingkat verifikasi.</p></div>
        <div className="howCard"><span className="howNum">03</span><div className="howIcon">↗</div><h3>Konfirmasi dahulu</h3><p>Pastikan informasi kepada SPBU sebelum melakukan perjalanan.</p></div>
      </div></div></section>

      <section className="container reportSection" id="lapor"><div className="reportBanner"><div><div className="eyebrow light">BANTU SESAMA PENGGUNA</div><h2>Baru dari SPBU?</h2><p>Informasi dari lapangan membantu masyarakat lain. Versi produksi akan mengirim laporan ke sistem setelah validasi.</p></div><a className="button lightButton" href="#cari">Pilih lokasi untuk melapor <span>→</span></a></div></section>

      <section className="container disclaimer" id="disclaimer"><div className="disclaimerIcon">ⓘ</div><div><h3>Disclaimer dan batas penggunaan</h3><p>BBM Siaga merupakan layanan informasi publik independen. Aplikasi ini tidak dimiliki, dikelola, disponsori, didukung, atau mewakili PT Pertamina (Persero), PT Pertamina Patra Niaga, maupun anak perusahaan atau afiliasinya. Nama produk BBM digunakan hanya untuk mengidentifikasi jenis bahan bakar.</p><p>Informasi stok dan antrean dapat berasal dari laporan pengguna, petugas yang berpartisipasi, atau sumber lain. Informasi dapat berubah dan tidak menjamin ketersediaan, waktu tunggu, maupun pelayanan. Patuhi ketentuan pembelian dan penyaluran BBM yang berlaku. Hubungi SPBU untuk konfirmasi sebelum berangkat.</p></div></section>

      <footer><div className="container footerInner"><a className="brand footerBrand" href="#"><span className="brandIcon">⛽</span><span><strong>BBM Siaga</strong><small>Informasi publik independen</small></span></a><span>© {new Date().getFullYear()} BBM Siaga. Bukan aplikasi resmi Pertamina.</span><a href="#disclaimer">Disclaimer</a></div></footer>

      {reportStation !== null && <div className="modalBackdrop" role="presentation" onMouseDown={e => { if (e.target === e.currentTarget) setReportStation(null); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="modalTitle"><button className="modalClose" onClick={() => setReportStation(null)} aria-label="Tutup">×</button><div className="eyebrow dark">LAPORAN SIMULASI</div><h2 id="modalTitle">Perbarui informasi SPBU</h2><p className="modalIntro">Pilih status untuk {stations.find(s => s.id === reportStation)?.name}. Perubahan hanya tersimpan di pratinjau browser ini.</p><label className="filterLabel">Jenis BBM<select value={fuel} onChange={e => setFuel(e.target.value as Fuel)}>{fuels.map(f => <option key={f}>{f}</option>)}</select></label><label className="filterLabel">Status stok<select value={reportStatus} onChange={e => setReportStatus(e.target.value as Status)}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><label className="filterLabel">Kondisi antrean<select value={reportQueue} onChange={e => setReportQueue(e.target.value as Queue)}>{queues.map(q => <option key={q}>{q}</option>)}</select></label><div className="modalWarning">⚠️ Ini belum mengirim laporan ke server atau memverifikasi kondisi nyata.</div><button className="button primary full" onClick={submitDemoReport}>Perbarui pratinjau</button></div></div>}
      {reportSent && <div className="toast" role="status">✓ Pratinjau diperbarui. Belum tersimpan ke server.</div>}
    </main>
  );
}
