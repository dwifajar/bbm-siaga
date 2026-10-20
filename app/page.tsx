
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
