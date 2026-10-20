import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "BBM Siaga — Informasi BBM dan Antrean SPBU",
  description: "Informasi publik mengenai ketersediaan Pertalite, Solar, Pertamax, dan kondisi antrean SPBU berdasarkan laporan yang memiliki waktu pembaruan.",
  applicationName: "BBM Siaga",
  manifest: "/manifest.webmanifest",
};
export const viewport: Viewport = {
  themeColor: "#0f5132",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
