 "use client";
import { useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle } from "react-leaflet";
import L from "leaflet";

const demoPoints = [
  { id: 1, name: "Titik contoh A", position: [-7.8167, 112.0117] as [number, number], fuel: "Pertalite · contoh status", note: "Marker simulasi di area Kediri. Bukan lokasi SPBU terverifikasi." },
  { id: 2, name: "Titik contoh B", position: [-7.8292, 112.0178] as [number, number], fuel: "Solar · contoh status", note: "Marker simulasi. Stok dan antrean bukan data aktual." },
  { id: 3, name: "Titik contoh C", position: [-7.8058, 112.0254] as [number, number], fuel: "Pertamax · contoh status", note: "Marker simulasi. Jangan gunakan untuk menentukan perjalanan." }
];
function makeMarkerIcon(index: number) {
  return L.divIcon({ className: "bbm-map-marker-wrap", html: `<div class="bbm-map-marker"><span>${index}</span></div>`, iconSize: [34, 42], iconAnchor: [17, 38], popupAnchor: [0, -34] });
}
export default function StationMap() {
  const markers = useMemo(() => demoPoints.map((point, index) => ({ ...point, icon: makeMarkerIcon(index + 1) })), []);
  return <div className="map-shell">
    <div className="map-demo-warning"><span aria-hidden="true">ⓘ</span><div><strong>Peta pratinjau — marker simulasi</strong><p>Lokasi ini hanya contoh teknis di sekitar Kediri, bukan daftar atau koordinat SPBU yang sudah diverifikasi. Peta dasar berasal dari OpenStreetMap.</p></div></div>
    <MapContainer center={[-7.8167, 112.0117]} zoom={13} scrollWheelZoom={false} className="bbm-leaflet-map">
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Circle center={[-7.8167, 112.0117]} radius={2200} pathOptions={{ color: "#17804d", fillColor: "#17804d", fillOpacity: 0.06, weight: 1 }} />
      {markers.map(point => <Marker key={point.id} position={point.position} icon={point.icon}><Popup><div className="map-popup"><strong>{point.name}</strong><span>{point.fuel}</span><small>{point.note}</small></div></Popup></Marker>)}
    </MapContainer>
    <div className="map-legend"><span><i className="legend-demo" /> Marker simulasi</span><span>Data stok aktual belum terhubung</span></div>
  </div>;
}
