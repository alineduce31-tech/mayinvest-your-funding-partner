import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mayinvest — Présélection de financement au Congo" },
      { name: "description", content: "Obtenez votre score d’éligibilité au financement en deux minutes avec Mayinvest Conseil." },
      { property: "og:title", content: "Mayinvest — Votre crédit évalué avant la banque" },
      { property: "og:description", content: "Présélection gratuite et résultat immédiat pour particuliers et PME au Congo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type View = "landing" | "choix" | "activite" | "formulaire" | "succes";
type ApplicantType = "Personne physique" | "Personne morale" | "";
type FormData = Record<string, string>;

const ACTIVITES_PHYSIQUE = ["Fonctionnaire", "Salarié privé", "Commerçant", "Artisan", "Profession libérale", "Agriculteur", "Autre"];
const ACTIVITES_MORALE = ["Commerce", "Tourisme", "BTP", "Industrie / Bois", "Agriculture", "Transport", "Santé", "Tech", "Autre"];
const BANQUES = ["BGFI Bank", "UBA", "LCB Bank", "MUCODEC", "Crédit du Congo", "Ecobank", "Autre", "Aucune"];
const VILLES = ["Brazzaville", "Pointe-Noire", "Dolisie", "Nkayi", "Ouesso", "Autre"];

function calcScore(type: ApplicantType, data: FormData) {
  let score = 0;
  if (type === "Personne physique") {
    if (Number(data.anciennete) >= 6) score += 25;
    if (data.salaire_domic === "Oui") score += 25;
    if (Number(data.revenu) >= 200000) score += 20;
    if (data.banque && data.banque !== "Aucune") score += 15;
    if (Number(data.montant) <= 10000000) score += 15;
  } else {
    if (data.rccm === "Oui") score += 30;
    if (data.compte_mouvemente === "Oui") score += 25;
    if (Number(data.anciennete_soc) >= 12) score += 20;
    if (data.refus_bancaire === "Non") score += 15;
    if (data.garanties === "Oui") score += 10;
  }
  return Math.min(score, 100);
}

function Arrow({ dark = false }: { dark?: boolean }) {
  return <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true"><path d="M4 9h10M10 5l4 4-4 4" stroke={dark ? "#111" : "white"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;
}

function PersonIcon({ dark = false }: { dark?: boolean }) {
  const color = dark ? "#111" : "white";
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="6.5" r="3.5" fill={color}/><path d="M3 17c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
}

function BuildingIcon({ dark = false }: { dark?: boolean }) {
  const color = dark ? "#111" : "white";
  return <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true"><rect x="3" y="7" width="14" height="11" rx="1.5" stroke={color} strokeWidth="2"/><path d="M7 18v-5h6v5M6 7V4a1 1 0 011-1h6a1 1 0 011 1v3" stroke={color} strokeWidth="2" strokeLinecap="round"/></svg>;
}

const landingCss = `
  .mi-page, .mi-page * { box-sizing: border-box; }
  .mi-page { min-height: 100vh; background: #fff; color: #111; font-family: 'Plus Jakarta Sans', sans-serif; -webkit-font-smoothing: antialiased; }
  .mi-nav { height:72px; padding:0 60px; display:flex; align-items:center; justify-content:space-between; border-bottom:1px solid #f0f0f0; }
  .mi-nav-btn,.mi-main-btn,.mi-second-btn,.mi-db-btn,.mi-cta-btn { font:600 14px inherit; border:0; cursor:pointer; display:flex; align-items:center; }
  .mi-nav-btn { background:#111; color:#fff; padding:12px 28px; border-radius:100px; gap:8px; }
  .mi-hero { padding:90px 60px 80px; display:grid; grid-template-columns:minmax(0,1fr) 480px; gap:60px; align-items:center; }
  .mi-tag { display:inline-flex; align-items:center; gap:8px; background:#eef4ff; color:#1a6bff; font-size:13px; font-weight:600; padding:6px 16px; border-radius:100px; margin-bottom:28px; }
  .mi-tag-dot { width:7px; height:7px; border-radius:50%; background:#1a6bff; animation:mi-pulse 1.8s ease-in-out infinite; }
  @keyframes mi-pulse { 50% { transform:scale(1.45); opacity:.55; } }
  .mi-hero h1 { margin:0 0 20px; font-size:58px; font-weight:800; line-height:1.1; letter-spacing:-2px; color:#111; }
  .mi-blue { color:#1a6bff; }
  .mi-hero-sub { max-width:480px; margin:0 0 40px; color:#666; font-size:17px; line-height:1.6; }
  .mi-hero-btns { display:flex; flex-direction:column; gap:14px; max-width:400px; }
  .mi-main-btn,.mi-second-btn { width:100%; height:64px; justify-content:space-between; padding:0 20px; border-radius:16px; font-size:16px; font-weight:600; }
  .mi-main-btn { background:#1a6bff; color:#fff; } .mi-second-btn { background:#f5f5f5; color:#111; border:1.5px solid #e8e8e8; }
  .mi-btn-left { display:flex; align-items:center; gap:12px; }
  .mi-btn-arr { width:36px; height:36px; display:grid; place-items:center; border-radius:50%; background:rgba(255,255,255,.2); }
  .mi-second-btn .mi-btn-arr { background:#e8e8e8; }
  .mi-score { position:relative; overflow:hidden; padding:32px; border-radius:24px; color:#fff; background:#0a1f42; box-shadow:0 30px 70px rgba(10,31,66,.2); }
  .mi-glow { position:absolute; width:300px; height:300px; top:-80px; right:-80px; pointer-events:none; background:radial-gradient(circle,rgba(26,107,255,.3),transparent 70%); }
  .mi-sc-head,.mi-row { display:flex; align-items:center; justify-content:space-between; }
  .mi-sc-head { position:relative; margin-bottom:28px; }.mi-brand { font-size:18px; font-weight:700; }.mi-status { display:flex; gap:6px; align-items:center; color:#6dafff; background:rgba(109,175,255,.15); padding:6px 14px; border-radius:100px; font-size:12px; font-weight:600; }
  .mi-person { margin-bottom:24px; }.mi-name { font-size:22px; font-weight:700; }.mi-role { margin-top:4px; color:rgba(255,255,255,.5); font-size:13px; }
  .mi-score-row { display:flex; align-items:center; gap:24px; margin-bottom:28px; }.mi-ring { position:relative; width:80px; height:80px; flex:none; }.mi-ring svg { transform:rotate(-90deg); }.mi-num { position:absolute; inset:0; display:grid; place-items:center; font-size:20px; font-weight:800; }.mi-score-label { color:rgba(255,255,255,.6); font-size:13px; line-height:1.4; }.mi-score-label strong { display:block; color:#fff; font-size:25px; font-weight:800; }
  .mi-divider { height:1px; margin-bottom:20px; background:rgba(255,255,255,.08); }.mi-rows { display:flex; flex-direction:column; gap:10px; }.mi-row { font-size:13px; }.mi-row span:first-child { color:rgba(255,255,255,.5); }.mi-ok { color:#4ade80; font-weight:600; }.mi-warn { color:#fbbf24; font-weight:600; }
  .mi-proof { padding:28px 60px; display:flex; align-items:center; justify-content:center; gap:40px; border-block:1px solid #f0f0f0; }.mi-proof-item { display:flex; align-items:center; gap:10px; color:#555; font-size:14px; font-weight:500; }.mi-proof-icon { width:36px; height:36px; display:grid; place-items:center; flex:none; border-radius:10px; color:#1a6bff; background:#eef4ff; }.mi-proof-sep { width:1px; height:24px; background:#e8e8e8; }
  .mi-steps { padding:80px 60px; }.mi-steps-head { margin-bottom:56px; text-align:center; }.mi-steps h2,.mi-cta h2 { margin:0 0 12px; color:#111; font-size:38px; font-weight:800; letter-spacing:-1.5px; }.mi-steps-head p,.mi-cta p { max-width:480px; margin:0 auto; color:#666; font-size:16px; }.mi-steps-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:24px; }.mi-step { padding:28px 24px; border:1px solid #f0f0f0; border-radius:20px; background:#fafafa; }.mi-step-num { width:40px; height:40px; display:grid; place-items:center; margin-bottom:16px; border-radius:12px; background:#eef4ff; color:#1a6bff; font-weight:800; }.mi-step h3 { margin:0 0 8px; font-size:16px; font-weight:700; }.mi-step p { margin:0; color:#777; font-size:14px; line-height:1.5; }
  .mi-dark { padding:60px; display:grid; grid-template-columns:repeat(3,1fr); gap:40px; background:#0a1f42; }.mi-stat { text-align:center; }.mi-stat strong { display:block; margin-bottom:6px; color:#fff; font-size:44px; font-weight:800; letter-spacing:-2px; }.mi-stat strong span { color:#1a6bff; }.mi-stat p { margin:0; color:rgba(255,255,255,.5); font-size:14px; }
  .mi-cta { padding:80px 60px; text-align:center; background:#fafafa; }.mi-cta h2 { font-size:42px; margin-bottom:16px; }.mi-cta p { margin-bottom:36px; }.mi-cta-row { display:flex; justify-content:center; gap:14px; }.mi-cta-btn { padding:16px 36px; border-radius:100px; gap:10px; font-size:16px; }.mi-cta-btn.primary { background:#1a6bff; color:#fff; }.mi-cta-btn.outline { border:1.5px solid #e0e0e0; color:#111; background:transparent; }
  .mi-footer { padding:40px 60px; display:flex; align-items:center; justify-content:space-between; background:#0a1f42; }.mi-copy { color:#aaa; font-size:13px; }
  @media (max-width:900px) { .mi-hero { grid-template-columns:1fr; padding:60px 32px; }.mi-score { max-width:560px; }.mi-proof { padding:24px 32px; flex-wrap:wrap; }.mi-steps { padding:64px 32px; }.mi-steps-grid { grid-template-columns:repeat(2,1fr); } }
  @media (max-width:640px) { .mi-nav { height:64px; padding:0 20px; }.mi-nav svg { max-width:150px; }.mi-nav-btn { padding:10px 16px; }.mi-hero { padding:36px 20px 40px; gap:36px; }.mi-hero h1 { font-size:36px; letter-spacing:-1px; }.mi-hero-sub { font-size:15px; }.mi-score { padding:24px; }.mi-score-row { gap:16px; }.mi-score-label strong { font-size:20px; }.mi-proof { display:grid; grid-template-columns:1fr 1fr; gap:18px 12px; padding:24px 20px; }.mi-proof-sep { display:none; }.mi-proof-item { align-items:flex-start; font-size:12px; }.mi-steps { padding:52px 20px; }.mi-steps h2,.mi-cta h2 { font-size:30px; letter-spacing:0; }.mi-steps-grid { grid-template-columns:1fr; }.mi-dark { grid-template-columns:1fr; padding:48px 20px; gap:30px; }.mi-cta { padding:56px 20px; }.mi-cta-row { flex-direction:column; }.mi-cta-btn { justify-content:center; }.mi-footer { padding:32px 20px; flex-direction:column; gap:18px; text-align:center; } }
`;

const formCss = `
  .mf-page,.mf-page *{box-sizing:border-box}.mf-page{min-height:100vh;background:#f4f5f7;color:#111;font-family:'Plus Jakarta Sans',sans-serif}.mf-top{padding:16px 24px;display:flex;align-items:center;gap:12px;background:#0a1f42}.mf-logo{width:36px;height:36px;display:grid;place-items:center;border-radius:10px;background:#1a6bff;color:#fff;font-size:18px;font-weight:800}.mf-backtop{margin-left:auto;padding:8px 14px;border:0;border-radius:100px;background:rgba(255,255,255,.1);color:#fff;font:600 12px inherit;cursor:pointer}.mf-content{max-width:560px;margin:auto;padding:28px 16px 60px}.mf-progress{display:flex;gap:6px;margin-bottom:24px}.mf-dot{height:4px;flex:1;border-radius:99px;background:#e5e7eb}.mf-dot.on{background:#1a6bff}.mf-h1{margin-bottom:8px;font-size:24px;font-weight:800}.mf-sub{margin:0 0 24px;color:#6b7280;font-size:14px;line-height:1.6}.mf-grid,.mf-act,.mf-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mf-choice,.mf-act-btn{cursor:pointer;font-family:inherit;background:#fff;border:2px solid #e5e7eb}.mf-choice{padding:24px 16px;text-align:center;border-radius:16px}.mf-choice.sel,.mf-act-btn.sel{border-color:#1a6bff;background:#eef4ff;color:#1a6bff}.mf-choice b{display:block;margin:8px 0 4px;font-size:14px}.mf-choice small{color:#9ca3af;font-size:11px}.mf-act-btn{padding:13px 12px;border-width:1.5px;border-radius:12px;text-align:left;color:#374151;font-size:13px}.mf-primary{width:100%;margin-top:20px;padding:17px;border:0;border-radius:100px;background:#1a6bff;color:#fff;font:700 15px inherit;cursor:pointer}.mf-primary:disabled{opacity:.45;cursor:not-allowed}.mf-back{margin-bottom:20px;padding:0;border:0;background:none;color:#6b7280;font:500 13px inherit;cursor:pointer}.mf-card{margin-bottom:16px;padding:24px;border:1px solid #e5e7eb;border-radius:18px;background:#fff}.mf-section{margin:0 0 14px;color:#9ca3af;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.08em}.mf-field{margin-bottom:14px}.mf-field label{display:block;margin-bottom:5px;color:#6b7280;font-size:12px;font-weight:600}.mf-field input,.mf-field select{width:100%;padding:12px 14px;border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;color:#111;font:400 14px inherit;outline:none}.mf-field input:focus,.mf-field select:focus{border-color:#1a6bff}.mf-radio{display:flex;gap:8px}.mf-radio button{flex:1;padding:11px;border:1.5px solid #e5e7eb;border-radius:10px;background:#fff;color:#6b7280;font:600 13px inherit;cursor:pointer}.mf-radio button.sel{border-color:#1a6bff;background:#eef4ff;color:#1a6bff}.mf-badge{display:inline-flex;margin-bottom:16px;padding:4px 12px;border-radius:100px;background:#eef4ff;color:#1a6bff;font-size:11px;font-weight:700}.mf-success{text-align:center;padding-top:40px}.mf-success-icon{width:72px;height:72px;display:grid;place-items:center;margin:0 auto 16px;border-radius:50%;background:#dcfce7;font-size:36px}.mf-alert,.mf-ref{margin-top:16px;padding:16px;border-radius:14px}.mf-alert{border:1.5px solid #fed7aa;background:#fff7ed;color:#92400e;text-align:left}.mf-ref{background:#fff;text-align:left}.mf-error{margin-top:14px;color:#b91c1c;font-size:13px;text-align:center}@media(max-width:520px){.mf-row{grid-template-columns:1fr}.mf-choice{padding:18px 10px}.mf-card{padding:20px}}
`;

function Field({ label, name, form, set, type = "text", placeholder }: { label: string; name: string; form: FormData; set: (key: string, value: string) => void; type?: string; placeholder?: string }) {
  return <div className="mf-field"><label htmlFor={name}>{label}</label><input id={name} type={type} placeholder={placeholder} value={form[name] ?? ""} onChange={(event) => set(name, event.target.value)} /></div>;
}

function SelectField({ label, name, options, form, set }: { label: string; name: string; options: string[]; form: FormData; set: (key: string, value: string) => void }) {
  return <div className="mf-field"><label htmlFor={name}>{label}</label><select id={name} value={form[name] ?? ""} onChange={(event) => set(name, event.target.value)}><option value="">Sélectionner…</option>{options.map((option) => <option key={option}>{option}</option>)}</select></div>;
}

function RadioField({ label, name, form, set }: { label: string; name: string; form: FormData; set: (key: string, value: string) => void }) {
  return <div className="mf-field"><label>{label}</label><div className="mf-radio">{["Oui", "Non"].map((value) => <button type="button" key={value} className={form[name] === value ? "sel" : ""} onClick={() => set(name, value)}>{value}</button>)}</div></div>;
}

function Index() {
  const [view, setView] = useState<View>("landing");
  const [type, setType] = useState<ApplicantType>("");
  const [activite, setActivite] = useState("");
  const [form, setForm] = useState<FormData>({});
  const [loading, setLoading] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [submitError, setSubmitError] = useState("");
  const isPhysique = type === "Personne physique";
  const set = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));

  function startForm(selectedType: Exclude<ApplicantType, "">) {
    setType(selectedType); setActivite(""); setForm({}); setSubmitError(""); setView("activite");
  }

  async function soumettre() {
    setLoading(true); setSubmitError("");
    const score = calcScore(type, form);
    const nonEligible = isPhysique ? Number(form.anciennete) < 6 || form.salaire_domic === "Non" : form.rccm === "Non";
    const payload = {
      type: isPhysique ? "personne physique" : "personne morale", activite, ville: form.ville || "",
      montant_demande: Number(form.montant || 0), banque_actuelle: form.banque || "", statut: nonEligible ? "Non Éligible" : "Nouveau", score,
      identite: { nom: form.nom, prenom: form.prenom, tel: form.tel, email: form.email, raison_sociale: form.raison_sociale, dirigeant: form.dirigeant },
      situation: isPhysique ? { employeur: form.employeur, anciennete: form.anciennete, revenu: form.revenu } : { raison_sociale: form.raison_sociale, dirigeant: form.dirigeant, rccm: form.rccm, niu: form.niu, anciennete: form.anciennete_soc, ca_annuel: form.ca_annuel },
      besoin: { montant: form.montant, objet: form.objet, banque: form.banque, flux_mois: form.flux_mois },
      eligibilite: isPhysique ? { anciennete_ok: Number(form.anciennete) >= 6, salaire_domic: form.salaire_domic } : { compte_mouvemente: form.compte_mouvemente, refus_bancaire: form.refus_bancaire, garanties: form.garanties },
      raison_non_eligibilite: nonEligible ? (isPhysique ? "Ancienneté insuffisante ou salaire non domicilié" : "Pas de RCCM — Pack Formalisation recommandé") : null,
    };
    const { data, error } = await supabase.from("leads").insert(payload).select("id").single();
    setLoading(false);
    if (error || !data) { setSubmitError("Le dossier n’a pas pu être envoyé. Vérifiez vos informations puis réessayez."); return; }
    setLeadId(data.id); setView("succes"); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (view === "landing") return <Landing setView={setView} startForm={startForm} />;

  return <div className="mf-page"><style>{formCss}</style>
    <div className="mf-top"><div className="mf-logo">M</div><div><div style={{ color: "#fff", fontSize: 15, fontWeight: 700 }}>Mayinvest</div><div style={{ color: "rgba(255,255,255,.5)", fontSize: 10 }}>Présélection gratuite · 2 minutes</div></div><button className="mf-backtop" onClick={() => setView("landing")}>← Retour</button></div>
    <main className="mf-content">
      {view === "choix" && <><Progress count={1}/><div className="mf-h1">Vous êtes…</div><p className="mf-sub">Choisissez votre profil pour accéder au formulaire adapté.</p><div className="mf-grid"><button className={`mf-choice${type === "Personne physique" ? " sel" : ""}`} onClick={() => setType("Personne physique")}><span>👤</span><b>Personne Physique</b><small>Fonctionnaire, salarié, commerçant…</small></button><button className={`mf-choice${type === "Personne morale" ? " sel" : ""}`} onClick={() => setType("Personne morale")}><span>🏢</span><b>Personne Morale</b><small>PME, entreprise, société…</small></button></div><button className="mf-primary" disabled={!type} onClick={() => setView("activite")}>Continuer →</button></>}
      {view === "activite" && <><Progress count={2}/><button className="mf-back" onClick={() => setView("choix")}>← Retour</button><div className="mf-h1">{isPhysique ? "Votre profession" : "Votre secteur"}</div><p className="mf-sub">{isPhysique ? "Sélectionnez votre situation professionnelle." : "Sélectionnez le secteur d’activité de votre entreprise."}</p><div className="mf-act">{(isPhysique ? ACTIVITES_PHYSIQUE : ACTIVITES_MORALE).map((item) => <button key={item} className={`mf-act-btn${activite === item ? " sel" : ""}`} onClick={() => setActivite(item)}>{item}</button>)}</div><button className="mf-primary" disabled={!activite} onClick={() => setView("formulaire")}>Continuer →</button></>}
      {view === "formulaire" && <><Progress count={3}/><button className="mf-back" onClick={() => setView("activite")}>← Retour</button><div className="mf-badge">📋 {type} · {activite}</div><div className="mf-h1">Votre dossier</div><p className="mf-sub">Cela prend moins de 2 minutes. Remplissez depuis votre téléphone.</p>
        <div className="mf-card"><div className="mf-section">1. Identité</div>{isPhysique ? <><div className="mf-row"><Field label="Prénom *" name="prenom" form={form} set={set} placeholder="Jean-Pierre"/><Field label="Nom *" name="nom" form={form} set={set} placeholder="Moukouama"/></div></> : <><Field label="Raison sociale *" name="raison_sociale" form={form} set={set} placeholder="Nom de l’entreprise"/><Field label="Nom du dirigeant *" name="dirigeant" form={form} set={set} placeholder="Prénom Nom"/></>}<div className="mf-row"><Field label="Téléphone *" name="tel" form={form} set={set} placeholder="+242 06 000 0000"/><Field label="Email" name="email" type="email" form={form} set={set} placeholder="email@exemple.com"/></div><SelectField label="Ville *" name="ville" options={VILLES} form={form} set={set}/></div>
        <div className="mf-card"><div className="mf-section">2. Situation {isPhysique ? "professionnelle" : "juridique"}</div>{isPhysique ? <><Field label="Employeur / Administration" name="employeur" form={form} set={set} placeholder="Ministère de l’Éducation…"/><div className="mf-row"><Field label="Ancienneté (mois)" name="anciennete" type="number" form={form} set={set} placeholder="24"/><Field label="Revenu net/mois (XAF)" name="revenu" type="number" form={form} set={set} placeholder="250000"/></div></> : <><div className="mf-row"><RadioField label="RCCM" name="rccm" form={form} set={set}/><Field label="NIU" name="niu" form={form} set={set} placeholder="NIU de l’entreprise"/></div><div className="mf-row"><Field label="Ancienneté (mois)" name="anciennete_soc" type="number" form={form} set={set} placeholder="24"/><Field label="CA Annuel (XAF)" name="ca_annuel" type="number" form={form} set={set} placeholder="50000000"/></div></>}</div>
        <div className="mf-card"><div className="mf-section">3. Votre besoin</div><Field label="Montant demandé (XAF) *" name="montant" type="number" form={form} set={set} placeholder="5000000"/><SelectField label="Objet du financement *" name="objet" options={isPhysique ? ["Consommation", "Immobilier", "Véhicule", "Autre"] : ["Investissement", "Fonds de roulement", "Marché public", "Autre"]} form={form} set={set}/><SelectField label="Banque actuelle" name="banque" options={BANQUES} form={form} set={set}/>{!isPhysique && <Field label="Flux mensuel moyen (XAF)" name="flux_mois" type="number" form={form} set={set} placeholder="2000000"/>}</div>
        <div className="mf-card"><div className="mf-section">4. Éligibilité</div>{isPhysique ? <><RadioField label="Ancienneté supérieure à 6 mois ?" name="anc_ok" form={form} set={set}/><RadioField label="Salaire domicilié dans une banque ?" name="salaire_domic" form={form} set={set}/></> : <><RadioField label="Compte bancaire mouvementé ?" name="compte_mouvemente" form={form} set={set}/><RadioField label="Refus bancaire antérieur ?" name="refus_bancaire" form={form} set={set}/><RadioField label="Garanties disponibles ?" name="garanties" form={form} set={set}/></>}</div>
        <button className="mf-primary" disabled={loading || !form.tel || !form.montant || (isPhysique ? !form.prenom : !form.raison_sociale)} onClick={soumettre}>{loading ? "Envoi en cours…" : "✓ Soumettre mon dossier"}</button>{submitError && <p className="mf-error" role="alert">{submitError}</p>}</>}
      {view === "succes" && <div className="mf-success"><div className="mf-success-icon">🎉</div><div className="mf-h1">Dossier soumis !</div><p className="mf-sub">Votre dossier a bien été reçu. Un conseiller Mayinvest vous contacte sous 24h.</p>{form.rccm === "Non" && <div className="mf-alert"><strong>📦 Pack Formalisation recommandé</strong><div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5 }}>Votre entreprise n’a pas de RCCM. Mayinvest peut vous accompagner dans la formalisation pour accéder au financement.</div></div>}<div className="mf-ref"><div style={{ color: "#6b7280", fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>Votre référence dossier</div><div style={{ marginTop: 8, fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>{leadId}</div></div><button className="mf-primary" style={{ background: "#25d366" }} onClick={() => window.open(`https://wa.me/242060000000?text=${encodeURIComponent(`Bonjour Mayinvest, j’ai soumis mon dossier. Référence : ${leadId}`)}`, "_blank", "noopener,noreferrer")}>📱 Confirmer sur WhatsApp</button><button className="mf-primary" style={{ background: "#0a1f42", marginTop: 10 }} onClick={() => { setView("landing"); setForm({}); setActivite(""); setType(""); }}>Retour à l’accueil</button></div>}
    </main>
  </div>;
}

function Progress({ count }: { count: number }) { return <div className="mf-progress">{[1,2,3].map((step) => <div key={step} className={`mf-dot${step <= count ? " on" : ""}`}/>)}</div>; }

function Landing({ setView, startForm }: { setView: (view: View) => void; startForm: (type: Exclude<ApplicantType, "">) => void }) {
  const proof = [["✓", "Résultat en 2 minutes"], ["⌾", "Données sécurisées RGPD"], ["☎", "Conseiller sous 24h"], ["★", "98% de satisfaction"]];
  const steps = [["1", "Choisissez votre profil", "Particulier ou entreprise"], ["2", "Remplissez le formulaire", "2 minutes, mobile friendly"], ["3", "Recevez votre score", "Résultat immédiat /100"], ["4", "Un conseiller vous rappelle", "Sous 24h ouvrées"]];
  return <div className="mi-page"><style>{landingCss}</style>
    <nav className="mi-nav"><Logo height={64} tone="light"/><button className="mi-nav-btn" onClick={() => setView("choix")}>Commencer <Arrow/></button></nav>
    <section className="mi-hero"><div><div className="mi-tag"><span className="mi-tag-dot"/>Présélection gratuite · 2 minutes</div><h1>Votre crédit,<br/>évalué <span className="mi-blue">avant</span><br/>la banque.</h1><p className="mi-hero-sub">Remplissez notre formulaire et recevez immédiatement votre score d’éligibilité. Un conseiller vous rappelle sous 24h.</p><div className="mi-hero-btns"><button className="mi-main-btn" onClick={() => startForm("Personne physique")}><span className="mi-btn-left"><PersonIcon/>Je suis un particulier</span><span className="mi-btn-arr"><Arrow/></span></button><button className="mi-second-btn" onClick={() => startForm("Personne morale")}><span className="mi-btn-left"><BuildingIcon dark/>Mon entreprise / PME</span><span className="mi-btn-arr"><Arrow dark/></span></button></div></div>
      <div className="mi-score"><div className="mi-glow"/><div className="mi-sc-head"><span className="mi-brand">Mayinvest</span><span className="mi-status">✓ Pré-qualifié</span></div><div className="mi-person"><div className="mi-name">Jean-Pierre M.</div><div className="mi-role">Fonctionnaire · Brazzaville</div></div><div className="mi-score-row"><div className="mi-ring"><svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="31" fill="none" stroke="rgba(255,255,255,.1)" strokeWidth="6"/><circle cx="40" cy="40" r="31" fill="none" stroke="#1a6bff" strokeWidth="6" strokeLinecap="round" strokeDasharray="195" strokeDashoffset="20"/></svg><div className="mi-num">90</div></div><div className="mi-score-label"><strong>15 000 000 XAF</strong>Demandé</div></div><div className="mi-divider"/><div className="mi-rows"><div className="mi-row"><span>Revenu net</span><span className="mi-ok">850 000 XAF ✓</span></div><div className="mi-row"><span>Ancienneté</span><span className="mi-ok">8 ans ✓</span></div><div className="mi-row"><span>Domiciliation</span><span className="mi-warn">⚠ En attente</span></div></div></div>
    </section>
    <section className="mi-proof">{proof.map(([icon,label], index) => <div key={label} style={{ display:"contents" }}>{index > 0 && <span className="mi-proof-sep"/>}<div className="mi-proof-item"><span className="mi-proof-icon">{icon}</span>{label}</div></div>)}</section>
    <section className="mi-steps"><div className="mi-steps-head"><h2>Comment ça marche ?</h2><p>Une démarche simple pour connaître vos chances de financement.</p></div><div className="mi-steps-grid">{steps.map(([number,title,text]) => <article className="mi-step" key={number}><div className="mi-step-num">{number}</div><h3>{title}</h3><p>{text}</p></article>)}</div></section>
    <section className="mi-dark"><div className="mi-stat"><strong><span>+</span>500</strong><p>dossiers traités</p></div><div className="mi-stat"><strong>98<span>%</span></strong><p>taux de satisfaction</p></div><div className="mi-stat"><strong>24<span>h</span></strong><p>délai de rappel</p></div></section>
    <section className="mi-cta"><h2>Prêt à connaître votre score ?</h2><p>Rejoignez les 500+ entrepreneurs qui ont déjà fait confiance à Mayinvest.</p><div className="mi-cta-row"><button className="mi-cta-btn primary" onClick={() => setView("choix")}>Je commence maintenant <Arrow/></button><button className="mi-cta-btn outline" onClick={() => document.querySelector(".mi-steps")?.scrollIntoView({ behavior: "smooth" })}>En savoir plus</button></div></section>
    <footer className="mi-footer"><Logo height={48} tone="dark"/><div className="mi-copy">© 2026 Mayinvest · Brazzaville, Congo</div></footer>
  </div>;
}
