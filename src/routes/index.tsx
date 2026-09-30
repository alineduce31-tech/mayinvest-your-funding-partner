import { createFileRoute, Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mayinvest — Qualifiez vos demandes de financement" },
      {
        name: "description",
        content: "Mayinvest Conseil présélectionne les dossiers de financement au Congo : simulation en 2 minutes et score de bancabilité.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", background: "#FFFFFF", color: "#111111", minHeight: "100vh" }}>
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />

      <nav style={{ height: 72, padding: "0 60px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #F0F0F0" }}>
        <Logo height={56} tone="light" />
        <Link to="/simulation" style={{ background: "#111111", color: "#fff", fontSize: 14, fontWeight: 600, padding: "12px 28px", borderRadius: 100, display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          Commencer →
        </Link>
      </nav>

      <section style={{ padding: "90px 60px 80px", display: "grid", gridTemplateColumns: "1fr 480px", gap: 60, alignItems: "center" }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#EEF4FF", color: "#1A6BFF", fontSize: 13, fontWeight: 600, padding: "6px 16px", borderRadius: 100, marginBottom: 28 }}>
            <span style={{ width: 7, height: 7, background: "#1A6BFF", borderRadius: "50%", display: "inline-block" }} />
            Présélection gratuite · 2 minutes
          </div>
          <h1 style={{ fontSize: 58, fontWeight: 800, lineHeight: 1.1, letterSpacing: -2, color: "#111111", marginBottom: 20 }}>
            Votre crédit,<br />évalué <span style={{ color: "#1A6BFF" }}>avant</span><br />la banque.
          </h1>
          <p style={{ fontSize: 17, color: "#666", lineHeight: 1.6, maxWidth: 480, marginBottom: 40 }}>
            Remplissez notre formulaire et recevez immédiatement votre score d'éligibilité. Un conseiller vous rappelle sous 24h.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 400 }}>
            <Link to="/simulation" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 64, borderRadius: 16, fontSize: 16, fontWeight: 600, background: "#1A6BFF", color: "#fff", textDecoration: "none" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                Je suis un particulier
              </span>
              <span style={{ width: 36, height: 36, background: "rgba(255,255,255,0.2)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>→</span>
            </Link>
            <Link to="/simulation" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", height: 64, borderRadius: 16, border: "1.5px solid #E8E8E8", fontSize: 16, fontWeight: 600, background: "#F5F5F5", color: "#111111", textDecoration: "none" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="14" rx="2"/><path d="M8 7V5a4 4 0 018 0v2"/></svg>
                Mon entreprise / PME
              </span>
              <span style={{ width: 36, height: 36, background: "#E8E8E8", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>→</span>
            </Link>
          </div>
        </div>

        <div style={{ background: "#0A1F42", borderRadius: 24, padding: 32, position: "relative", overflow: "hidden", color: "#fff" }}>
          <div style={{ position: "absolute", width: 300, height: 300, background: "radial-gradient(circle, rgba(26,107,255,0.3) 0%, transparent 70%)", top: -80, right: -80, pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
            <span style={{ fontSize: 18, fontWeight: 700 }}>Mayinvest</span>
            <span style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(109,175,255,0.15)", color: "#6DAFFF", fontSize: 12, fontWeight: 600, padding: "6px 14px", borderRadius: 100 }}>
              <span style={{ width: 6, height: 6, background: "#6DAFFF", borderRadius: "50%", display: "inline-block" }} />
              Pré-qualifié
            </span>
          </div>
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 4 }}>Jean-Pierre M.</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Fonctionnaire · Brazzaville</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24, marginBottom: 28 }}>
            <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
              <svg width="80" height="80" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="40" cy="40" r="31" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                <circle cx="40" cy="40" r="31" fill="none" stroke="#1A6BFF" strokeWidth="6" strokeLinecap="round" strokeDasharray="195" strokeDashoffset="20" />
              </svg>
              <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", fontSize: 20, fontWeight: 800, color: "#fff" }}>90</span>
            </div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.4 }}>
              <strong style={{ fontSize: 28, fontWeight: 800, color: "#fff", display: "block" }}>15 000 000</strong>
              XAF / Demandé
            </div>
          </div>
          <div style={{ height: 1, background: "rgba(255,255,255,0.08)", marginBottom: 20 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { label: "Revenu net", val: "850 000 XAF", color: "#4ADE80" },
              { label: "Ancienneté", val: "8 ans", color: "#4ADE80" },
              { label: "Domiciliation", val: "⚠ En attente", color: "#FBBF24" },
            ].map((r) => (
              <div key={r.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>{r.label}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: r.color }}>{r.val}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div style={{ padding: "28px 60px", borderTop: "1px solid #F0F0F0", borderBottom: "1px solid #F0F0F0", display: "flex", alignItems: "center", gap: 40, flexWrap: "wrap" }}>
        {[
          { icon: "✓", text: "Résultat en 2 minutes" },
          { icon: "🔒", text: "Données sécurisées RGPD" },
          { icon: "📞", text: "Conseiller sous 24h" },
          { icon: "⭐", text: "98% de satisfaction" },
        ].map((item, i, arr) => (
          <span key={item.text} style={{ display: "flex", alignItems: "center", gap: 40 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 14, color: "#555", fontWeight: 500 }}>
              <span style={{ width: 36, height: 36, background: "#EEF4FF", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>{item.icon}</span>
              {item.text}
            </span>
            {i < arr.length - 1 && <span style={{ width: 1, height: 24, background: "#E8E8E8" }} />}
          </span>
        ))}
      </div>

      <section style={{ padding: "80px 60px" }}>
        <div style={{ textAlign: "center", marginBottom: 56 }}>
          <h2 style={{ fontSize: 38, fontWeight: 800, letterSpacing: -1.5, marginBottom: 12 }}>Comment ça marche ?</h2>
          <p style={{ fontSize: 16, color: "#666", maxWidth: 480, margin: "0 auto" }}>Simple, rapide et sans engagement.</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
          {[
            { n: "1", title: "Choisissez votre profil", text: "Particulier ou entreprise" },
            { n: "2", title: "Remplissez le formulaire", text: "2 minutes, mobile friendly" },
            { n: "3", title: "Recevez votre score", text: "Résultat immédiat /100" },
            { n: "4", title: "Un conseiller vous rappelle", text: "Sous 24h ouvrées" },
          ].map((s) => (
            <div key={s.n} style={{ background: "#FAFAFA", border: "1px solid #F0F0F0", borderRadius: 20, padding: "28px 24px" }}>
              <div style={{ width: 40, height: 40, background: "#EEF4FF", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 800, color: "#1A6BFF", marginBottom: 16 }}>{s.n}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8 }}>{s.title}</h3>
              <p style={{ fontSize: 14, color: "#777", lineHeight: 1.5 }}>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      <div style={{ background: "#0A1F42", padding: 60, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 40 }}>
        {[
          { num: "+500", label: "dossiers traités" },
          { num: "98%", label: "taux de satisfaction" },
          { num: "24h", label: "délai de rappel" },
        ].map((s) => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, fontWeight: 800, color: "#1A6BFF", letterSpacing: -2, marginBottom: 6 }}>{s.num}</div>
            <div style={{ fontSize: 14, color: "rgba(255,255,255,0.5)" }}>{s.label}</div>
          </div>
        ))}
      </div>

      <section style={{ padding: "80px 60px", textAlign: "center", background: "#FAFAFA" }}>
        <h2 style={{ fontSize: 42, fontWeight: 800, letterSpacing: -1.5, marginBottom: 16 }}>Prêt à connaître votre score ?</h2>
        <p style={{ fontSize: 16, color: "#666", maxWidth: 480, margin: "0 auto 36px" }}>Rejoignez les 500+ entrepreneurs qui ont déjà fait confiance à Mayinvest.</p>
        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/simulation" style={{ background: "#1A6BFF", color: "#fff", padding: "16px 36px", borderRadius: 100, fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            Je commence maintenant →
          </Link>
          <a href="#steps" style={{ background: "transparent", color: "#111", padding: "16px 36px", borderRadius: 100, border: "1.5px solid #E0E0E0", fontSize: 16, fontWeight: 600, display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            En savoir plus
          </a>
        </div>
      </section>

      <footer style={{ background: "#0A1F42", padding: "40px 60px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Logo height={48} tone="dark" />
        <span style={{ fontSize: 13, color: "#AAAAAA" }}>© {new Date().getFullYear()} Mayinvest · Brazzaville, Congo</span>
      </footer>
    </div>
  );
}
