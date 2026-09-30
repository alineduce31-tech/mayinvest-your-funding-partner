import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mayinvest — Qualifiez vos demandes de financement" },
      {
        name: "description",
        content:
          "Mayinvest Conseil présélectionne les dossiers de financement au Congo : simulation en 2 minutes et score de bancabilité.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#FFFFFF", color: "#111111", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      {/* NAV */}
      <nav style={{ height: 72, padding: "0 60px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F0F0F0" }}>
        <Logo height={56} tone="light" />
        <Link to="/simulation" style={{ background: "#111111", color: "#fff", fontSize: 14, fontWeight: 600, padding: "12px 28px", borderRadius: 100, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, textDecoration:
