import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Mundial 2026 — Calendario y Eliminatorias",
    short_name: "Mundial 2026",
    description:
      "Calendario, resultados, grupos y eliminatorias del Mundial 2026. Schedule, results, groups and knockout bracket for the 2026 World Cup.",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0a7d52",
    theme_color: "#0a7d52",
    lang: "es",
    categories: ["sports"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
