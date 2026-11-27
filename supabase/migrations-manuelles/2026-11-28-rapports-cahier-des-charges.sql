-- ============================================================
-- Rapports automatiques (cahier des charges §4)
--  1. Rapport hebdo (lundi 8 h) : nouveaux leads, non éligibles, potentiel Pack
--  2. Rapport bancarisation (1er du mois 8 h) : PME bancarisées, futurs éligibles à 3 mois
--  3. Rapport banques (1er du mois 8 h) : financements et taux d'acceptation, banque par banque
-- Une seule source de calcul (SQL) pour les emails et pour la page Rapports.
-- ============================================================

-- ---------- 1. Données manquantes ----------
alter table public.leads add column if not exists banque_depot text;
alter table public.leads add column if not exists montant_finance numeric;
alter table public.report_logs add column if not exists periode text;
alter table public.report_logs add column if not exists donnees jsonb;
alter table public.report_logs add column if not exists declencheur text default 'auto';

-- Historique des statuts : date réelle de chaque passage (bancarisé, déposé, financé, refusé…)
create table if not exists public.lead_statut_historique (
  id bigserial primary key,
  lead_id uuid not null references public.leads(id) on delete cascade,
  ancien text,
  nouveau text not null,
  change_at timestamptz not null default now(),
  estime boolean not null default false
);
create index if not exists lsh_lead_idx on public.lead_statut_historique (lead_id, change_at);
create index if not exists lsh_nouveau_idx on public.lead_statut_historique (nouveau, change_at);
alter table public.lead_statut_historique enable row level security;
revoke all on public.lead_statut_historique from anon, authenticated;

create or replace function public.mi_trace_statut() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.lead_statut_historique (lead_id, ancien, nouveau, change_at) values (new.id, null, coalesce(new.statut, 'Nouveau'), coalesce(new.created_at, now()));
  elsif new.statut is distinct from old.statut then
    insert into public.lead_statut_historique (lead_id, ancien, nouveau) values (new.id, old.statut, coalesce(new.statut, ''));
  end if;
  return new;
end $$;
drop trigger if exists trg_trace_statut on public.leads;
create trigger trg_trace_statut after insert or update of statut on public.leads
  for each row execute function public.mi_trace_statut();

-- Reprise de l'existant (dates estimées : date de création, puis dernière modification)
insert into public.lead_statut_historique (lead_id, ancien, nouveau, change_at, estime)
select l.id, null, 'Nouveau', l.created_at, true from public.leads l
where not exists (select 1 from public.lead_statut_historique h where h.lead_id = l.id);
insert into public.lead_statut_historique (lead_id, ancien, nouveau, change_at, estime)
select l.id, 'Nouveau', l.statut, greatest(coalesce(l.updated_at, l.created_at), l.created_at), true from public.leads l
where coalesce(l.statut, 'Nouveau') <> 'Nouveau'
  and not exists (select 1 from public.lead_statut_historique h where h.lead_id = l.id and h.nouveau = l.statut);

-- Nom de banque harmonisé aussi pour la banque de dépôt
create or replace function public.mi_leads_banque_depot() returns trigger
language plpgsql set search_path = public as $$
begin
  new.banque_depot := nullif(public.mi_nom_banque(nullif(trim(new.banque_depot), '')), '');
  return new;
end $$;
drop trigger if exists trg_leads_banque_depot on public.leads;
create trigger trg_leads_banque_depot before insert or update of banque_depot on public.leads
  for each row execute function public.mi_leads_banque_depot();

-- ---------- 2. Outils ----------
create or replace function public.mi_fmt_nb(n numeric) returns text
language sql immutable as $$ select replace(to_char(round(coalesce(n, 0)), 'FM999,999,999,999,990'), ',', ' ') $$;

create or replace function public.mi_lead_nom(p_type text, p_identite jsonb, p_situation jsonb) returns text
language sql immutable as $$
  select case when coalesce(p_type, '') in ('physique', 'Personne physique')
    then coalesce(nullif(trim(coalesce(p_identite->>'prenom', '') || ' ' || coalesce(p_identite->>'nom', '')), ''), 'Prospect')
    else coalesce(nullif(p_situation->>'raison_sociale', ''), nullif(p_identite->>'raison_sociale', ''),
                  nullif(trim(coalesce(p_identite->>'prenom', '') || ' ' || coalesce(p_identite->>'nom', '')), ''), 'Entreprise') end
$$;

create or replace function public.mi_rapport_destinataires() returns text[]
language sql immutable as $$ select array['aldochris31@gmail.com', 'chezotim@gmail.com'] $$;

-- Période du rapport, à l'heure de Brazzaville.
-- p_courante = false : période complète écoulée (ce que reçoit l'email automatique)
-- p_courante = true  : période en cours jusqu'à maintenant (page Rapports, envoi manuel)
create or replace function public.mi_rapport_periode(p_type text, p_courante boolean,
  out debut timestamptz, out fin timestamptz, out prec_debut timestamptz, out prec_fin timestamptz, out libelle text)
language plpgsql stable set search_path = public as $$
declare
  tz constant text := 'Africa/Brazzaville';
  n timestamp := now() at time zone tz;
  d timestamp; f timestamp; pas interval;
  mois constant text[] := array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
begin
  if p_type = 'hebdo' then
    pas := interval '7 days'; d := date_trunc('week', n);
  else
    pas := interval '1 month'; d := date_trunc('month', n);
  end if;
  if p_courante then f := n; else f := d; d := d - pas; end if;
  debut := d at time zone tz; fin := f at time zone tz;
  -- Comparaison : même durée, période précédente
  prec_debut := (d - pas) at time zone tz; prec_fin := (f - pas) at time zone tz;
  if p_type = 'hebdo' then
    libelle := case when p_courante then 'Semaine en cours, depuis le lundi ' || to_char(d, 'DD/MM')
                    else 'Semaine du ' || to_char(d, 'DD/MM') || ' au ' || to_char(f - interval '1 day', 'DD/MM/YYYY') end;
  else
    libelle := case when p_courante then 'Mois en cours, ' || mois[extract(month from d)::int] || ' ' || extract(year from d)::int
                    else initcap(mois[extract(month from d)::int]) || ' ' || extract(year from d)::int end;
  end if;
end $$;

-- ---------- 3. Rapport hebdo ----------
-- Règles identiques au dashboard (Bloc 2) : une seule raison par dossier, dans l'ordre
-- pas de compte > pas de RCCM > flux < 1 M/mois (couveuse, gratuit) > refus bancaire (0).
-- Potentiel Pack = (pas de compte + pas de RCCM) × 50 000 XAF.
create or replace function public.mi_rapport_hebdo(d timestamptz, f timestamptz, pd timestamptz, pf timestamptz) returns jsonb
language sql stable security definer set search_path = public as $$
with base as (
  select l.*, public.mi_lead_nom(l.type, l.identite, l.situation) as nom,
    lower(trim(coalesce(l.banque_actuelle, ''))) in ('', 'aucune', 'non', 'aucun') as sc,
    (lower(coalesce(l.type, '')) in ('morale', 'personne morale', 'pme') and lower(trim(coalesce(l.situation->>'rccm', ''))) = 'non') as sr,
    (l.flux_mensuel is not null and l.flux_mensuel < 1000000) as ff,
    (case when l.motif_refus is not null then l.motif_refus ~* 'refus' else l.statut = 'Non Éligible' end) as rf
  from public.leads l
), cat as (
  select *, case when sc then 'pas_compte' when sr then 'pas_rccm' when ff then 'flux_faible' when rf then 'refus' end as categorie from base
), cur as (select * from cat where created_at >= d and created_at < f),
   prev as (select * from cat where created_at >= pd and created_at < pf),
agg as (
  select
    (select count(*) from cur) as nouveaux,
    (select count(*) from cur where categorie is not null) as non_elig,
    (select count(*) from cur where categorie = 'pas_compte') as pas_compte,
    (select count(*) from cur where categorie = 'pas_rccm') as pas_rccm,
    (select count(*) from cur where categorie = 'flux_faible') as flux_faible,
    (select count(*) from cur where categorie = 'refus') as refus,
    (select count(*) from cur where coalesce(type, '') not in ('physique', 'Personne physique')) as pme,
    (select coalesce(sum(montant_demande), 0) from cur) as montant,
    (select count(*) from prev) as p_nouveaux,
    (select count(*) from prev where categorie is not null) as p_non_elig,
    (select count(*) from prev where categorie in ('pas_compte', 'pas_rccm')) as p_pack
)
select jsonb_build_object(
  'nouveaux', a.nouveaux,
  'eligibles', a.nouveaux - a.non_elig,
  'non_eligibles', a.non_elig,
  'taux_non_eligibles', case when a.nouveaux > 0 then round(a.non_elig * 100.0 / a.nouveaux) end,
  'pme', a.pme, 'particuliers', a.nouveaux - a.pme,
  'montant_demande', a.montant,
  'categories', jsonb_build_object('pas_compte', a.pas_compte, 'pas_rccm', a.pas_rccm, 'flux_faible', a.flux_faible, 'refus', a.refus),
  'prix_pack', 50000,
  'potentiel_pack', (a.pas_compte + a.pas_rccm) * 50000,
  'precedent', jsonb_build_object('nouveaux', a.p_nouveaux, 'non_eligibles', a.p_non_elig, 'potentiel_pack', a.p_pack * 50000),
  'phrase', 'Cette semaine ' || a.nouveaux || case when a.nouveaux > 1 then ' nouveaux leads' else ' nouveau lead' end
            || '. ' || a.non_elig || case when a.non_elig > 1 then ' non éligibles' else ' non éligible' end
            || '. Potentiel Pack = ' || public.mi_fmt_nb((a.pas_compte + a.pas_rccm) * 50000) || ' XAF',
  'liste', coalesce((select jsonb_agg(jsonb_build_object('nom', c.nom, 'categorie', c.categorie, 'ville', coalesce(c.ville, c.identite->>'ville'),
      'statut', c.statut, 'date', c.created_at) order by c.created_at desc) from cur c where c.categorie is not null), '[]'::jsonb)
) from agg a
$$;

-- ---------- 4. Rapport bancarisation ----------
-- Bancarisée = première entrée au statut « Bancarisé » dans la période.
-- Éligibles dans 3 mois = PME bancarisées ou ayant payé le Pack dans les 3 derniers mois,
-- pas encore déposées/financées : 3 mois de mouvements sur le compte les rendront éligibles.
create or replace function public.mi_rapport_bancarisation(d timestamptz, f timestamptz, pd timestamptz, pf timestamptz) returns jsonb
language sql stable security definer set search_path = public as $$
with l as (
  select l.*, public.mi_lead_nom(l.type, l.identite, l.situation) as nom,
    coalesce(l.type, '') not in ('physique', 'Personne physique') as est_pme,
    (select trim(coalesce(c.prenom, '') || ' ' || coalesce(c.nom, '')) from public.commercial_candidates c where c.id = l.agent_commercial_id) as conseiller
  from public.leads l
), premiere as (
  select lead_id, min(change_at) as le, bool_or(estime) as estime from public.lead_statut_historique where nouveau = 'Bancarisé' group by lead_id
), base_elig as (
  select l.id, greatest(
      (select max(change_at) from public.lead_statut_historique h where h.lead_id = l.id and h.nouveau in ('Bancarisé', 'Pack Formalisation Vendu')),
      (select max(p.confirme_at) from public.pack_souscriptions p where p.lead_id = l.id and p.statut <> 'annule')) as depuis
  from l where l.est_pme and coalesce(l.statut, '') not in ('Dossier Déposé', 'Éligible', 'Financé', 'Perdu')
), futurs as (
  select l.nom, l.ville, l.statut, b.depuis, b.depuis + interval '3 months' as eligible_le
  from base_elig b join l on l.id = b.id
  where b.depuis is not null and b.depuis >= f - interval '3 months' and b.depuis < f
), banc as (
  select l.*, p.le, p.estime from l join premiere p on p.lead_id = l.id
), agg as (
  select
    (select count(*) from banc where est_pme and le >= d and le < f) as pme,
    (select count(*) from banc where not est_pme and le >= d and le < f) as particuliers,
    (select count(*) from banc where est_pme and le >= pd and le < pf) as p_pme,
    (select count(*) from futurs) as futurs,
    (select count(*) from public.pack_souscriptions p where p.statut <> 'annule' and p.confirme_at >= d and p.confirme_at < f) as packs,
    (select coalesce(sum(p.paiement_montant), 0) from public.pack_souscriptions p where p.statut <> 'annule' and p.confirme_at >= d and p.confirme_at < f) as packs_montant,
    (select count(*) from l where (l.eligibilite->>'salaire_domic' = 'Non' or l.banque_actuelle = 'Aucune')
        and coalesce(l.statut, '') not in ('Non Éligible', 'Perdu', 'Bancarisé')) as stock,
    (select count(*) from banc where le >= d and le < f and estime) as estimees
)
select jsonb_build_object(
  'pme_bancarisees', a.pme, 'particuliers_bancarises', a.particuliers,
  'total_bancarises', a.pme + a.particuliers,
  'eligibles_3_mois', a.futurs,
  'packs_payes', a.packs, 'packs_encaisse', a.packs_montant,
  'reste_a_bancariser', a.stock,
  'precedent', jsonb_build_object('pme_bancarisees', a.p_pme),
  'dates_estimees', a.estimees,
  'phrase', 'Ce mois on a bancarisé ' || a.pme || ' PME. ' || a.futurs
            || case when a.futurs > 1 then ' vont être éligibles' else ' va être éligible' end || ' dans 3 mois',
  'bancarisees', coalesce((select jsonb_agg(jsonb_build_object('nom', b.nom, 'pme', b.est_pme, 'ville', coalesce(b.ville, b.identite->>'ville'),
      'conseiller', nullif(b.conseiller, ''), 'date', b.le, 'estime', b.estime) order by b.le desc) from banc b where b.le >= d and b.le < f), '[]'::jsonb),
  'futurs', coalesce((select jsonb_agg(jsonb_build_object('nom', x.nom, 'ville', x.ville, 'statut', x.statut, 'depuis', x.depuis, 'eligible_le', x.eligible_le)
      order by x.eligible_le) from futurs x), '[]'::jsonb)
) from agg a
$$;

-- ---------- 5. Rapport banques ----------
-- Banque = banque de dépôt saisie ; à défaut, banque actuelle du client (signalé « estimé »).
-- Financé = entrée au statut « Financé » dans la période.
-- Refusé = passage à « Non éligible » ou « Perdu » après un dépôt en banque.
-- Taux d'acceptation = financés ÷ (financés + refusés), sur les décisions de la période.
-- Taux 12 mois en complément : plus fiable quand le mois compte peu de décisions.
create or replace function public.mi_rapport_banques(d timestamptz, f timestamptz, pd timestamptz, pf timestamptz) returns jsonb
language sql stable security definer set search_path = public as $$
with l as (
  select l.id, l.statut, l.banque_depot, coalesce(l.montant_finance, l.montant_demande, 0) as montant,
    coalesce(l.banque_depot,
      case when lower(trim(coalesce(l.banque_actuelle, ''))) in ('', 'aucune', 'non', 'aucun') then null else public.mi_nom_banque(l.banque_actuelle) end,
      'Banque non renseignée') as banque,
    l.banque_depot is null as estimee
  from public.leads l
), ev as (
  select h.lead_id, h.change_at,
    case
      when h.nouveau = 'Financé' then 'finance'
      when h.nouveau = 'Dossier Déposé' then 'depot'
      when h.nouveau in ('Non Éligible', 'Perdu') and (
        l.banque_depot is not null or exists (select 1 from public.lead_statut_historique h2
          where h2.lead_id = h.lead_id and h2.id <> h.id and h2.change_at <= h.change_at and h2.nouveau in ('Dossier Déposé', 'Éligible')))
        then 'refus'
    end as kind,
    l.banque, l.montant, l.estimee,
    (select max(h3.change_at) from public.lead_statut_historique h3 where h3.lead_id = h.lead_id and h3.nouveau = 'Dossier Déposé' and h3.change_at <= h.change_at) as depose_le
  from public.lead_statut_historique h join l on l.id = h.lead_id
), noms as (
  select nom as banque from public.banques
  union select banque from l where banque <> 'Banque non renseignée' and (statut in ('Dossier Déposé', 'Éligible', 'Financé') or banque_depot is not null)
  union select banque from ev where kind is not null and change_at >= f - interval '12 months' and change_at < f
), par_banque as (
  select n.banque,
    count(*) filter (where e.kind = 'depot' and e.change_at >= d and e.change_at < f) as depots,
    count(*) filter (where e.kind = 'finance' and e.change_at >= d and e.change_at < f) as finances,
    count(*) filter (where e.kind = 'refus' and e.change_at >= d and e.change_at < f) as refus,
    coalesce(sum(e.montant) filter (where e.kind = 'finance' and e.change_at >= d and e.change_at < f), 0) as montant,
    round(avg(extract(epoch from e.change_at - e.depose_le) / 86400) filter (where e.kind = 'finance' and e.change_at >= d and e.change_at < f and e.depose_le is not null)) as delai_jours,
    count(*) filter (where e.kind = 'finance' and e.change_at >= f - interval '12 months' and e.change_at < f) as finances_12m,
    count(*) filter (where e.kind = 'refus' and e.change_at >= f - interval '12 months' and e.change_at < f) as refus_12m,
    count(*) filter (where e.kind = 'finance' and e.change_at >= pd and e.change_at < pf) as p_finances,
    count(*) filter (where e.kind is not null and e.change_at >= d and e.change_at < f and e.estimee) as estimees,
    (select count(*) from l where l.banque = n.banque and l.statut in ('Dossier Déposé', 'Éligible')) as en_cours
  from noms n left join ev e on e.banque = n.banque
  group by n.banque
), lignes as (
  select *, case when finances + refus > 0 then round(finances * 100.0 / (finances + refus)) end as taux,
    case when finances_12m + refus_12m > 0 then round(finances_12m * 100.0 / (finances_12m + refus_12m)) end as taux_12m
  from par_banque
), tot as (
  select coalesce(sum(depots), 0) depots, coalesce(sum(finances), 0) finances, coalesce(sum(refus), 0) refus, coalesce(sum(montant), 0) montant,
    coalesce(sum(en_cours), 0) en_cours, coalesce(sum(p_finances), 0) p_finances, coalesce(sum(estimees), 0) estimees,
    coalesce(sum(finances_12m), 0) f12, coalesce(sum(refus_12m), 0) r12
  from lignes
)
select jsonb_build_object(
  'banques', coalesce((select jsonb_agg(jsonb_build_object(
      'banque', x.banque, 'deposes', x.depots, 'finances', x.finances, 'refuses', x.refus, 'en_cours', x.en_cours,
      'montant_finance', x.montant, 'taux', x.taux, 'taux_12m', x.taux_12m, 'decisions_12m', x.finances_12m + x.refus_12m,
      'delai_jours', x.delai_jours, 'finances_precedent', x.p_finances, 'estimees', x.estimees,
      'phrase', x.banque || ' a financé ' || x.finances || case when x.finances > 1 then ' dossiers' else ' dossier' end
                || ' ce mois. Taux d''acceptation ' || coalesce(x.taux::text || ' %', '—'))
      order by x.finances desc, x.depots desc, x.en_cours desc, (x.banque = 'Banque non renseignée'), x.banque) from lignes x
      where x.banque <> 'Banque non renseignée' or x.depots + x.finances + x.refus + x.en_cours > 0), '[]'::jsonb),
  'total', jsonb_build_object('deposes', t.depots, 'finances', t.finances, 'refuses', t.refus, 'en_cours', t.en_cours,
      'montant_finance', t.montant, 'commission', round(t.montant * 0.02),
      'taux', case when t.finances + t.refus > 0 then round(t.finances * 100.0 / (t.finances + t.refus)) end,
      'taux_12m', case when t.f12 + t.r12 > 0 then round(t.f12 * 100.0 / (t.f12 + t.r12)) end,
      'finances_precedent', t.p_finances, 'estimees', t.estimees),
  'phrase', coalesce((select string_agg(x.banque || ' a financé ' || x.finances || case when x.finances > 1 then ' dossiers' else ' dossier' end
                || ' ce mois. Taux d''acceptation ' || coalesce(x.taux::text || ' %', '—'), E'\n' order by x.finances desc, x.banque)
              from lignes x where x.finances + x.refus > 0), 'Aucune décision de banque ce mois.')
) from tot t
$$;

-- ---------- 6. Point d'entrée ----------
create or replace function public.mi_rapport(p_type text, p_courante boolean default false) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p record; r jsonb;
begin
  if p_type not in ('hebdo', 'bancarisation', 'banques') then raise exception 'Rapport inconnu'; end if;
  select * into p from public.mi_rapport_periode(p_type, p_courante);
  r := case p_type
    when 'hebdo' then public.mi_rapport_hebdo(p.debut, p.fin, p.prec_debut, p.prec_fin)
    when 'bancarisation' then public.mi_rapport_bancarisation(p.debut, p.fin, p.prec_debut, p.prec_fin)
    else public.mi_rapport_banques(p.debut, p.fin, p.prec_debut, p.prec_fin) end;
  return r || jsonb_build_object('type', p_type, 'periode', p.libelle, 'debut', p.debut, 'fin', p.fin,
    'destinataires', to_jsonb(public.mi_rapport_destinataires()), 'calcule_le', now());
end $$;

-- Vérification de la clé d'appel des envois (clé gardée dans le coffre, jamais dans le code)
create or replace function public.mi_verifier_cle_rapport(p_cle text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from vault.decrypted_secrets where name = 'mi_cron_key' and decrypted_secret = p_cle)
$$;

revoke execute on function public.mi_rapport(text, boolean) from public, anon, authenticated;
revoke execute on function public.mi_rapport_hebdo(timestamptz, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.mi_rapport_bancarisation(timestamptz, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.mi_rapport_banques(timestamptz, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
revoke execute on function public.mi_verifier_cle_rapport(text) from public, anon, authenticated;
grant execute on function public.mi_rapport(text, boolean) to service_role;
grant execute on function public.mi_verifier_cle_rapport(text) to service_role;

-- ---------- 7. Page Rapports (admin) ----------
create or replace function public.admin_rapports() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare tz constant text := 'Africa/Brazzaville'; n timestamp := now() at time zone tz; lundi timestamp; premier timestamp;
begin
  perform public.mi_require_admin(false);
  lundi := date_trunc('week', n) + interval '7 days 8 hours';
  premier := date_trunc('month', n) + interval '1 month 8 hours';
  return jsonb_build_object(
    'destinataires', to_jsonb(public.mi_rapport_destinataires()),
    'hebdo', public.mi_rapport('hebdo', true) || jsonb_build_object('prochain_envoi', lundi at time zone tz),
    'bancarisation', public.mi_rapport('bancarisation', true) || jsonb_build_object('prochain_envoi', premier at time zone tz),
    'banques', public.mi_rapport('banques', true) || jsonb_build_object('prochain_envoi', premier at time zone tz),
    'envois', coalesce((select jsonb_agg(x order by x.sent_at desc) from (
        select r.id, case r.type when 'weekly_leads' then 'hebdo' when 'monthly_bancarisation' then 'bancarisation' else 'banques' end as type,
          r.status, r.sent_at, r.body_summary, r.periode, coalesce(r.declencheur, 'auto') as declencheur, r.recipients,
          row_number() over (partition by r.type order by r.sent_at desc) as rang
        from public.report_logs r where r.type in ('weekly_leads', 'monthly_bancarisation', 'monthly_banks')) x where x.rang <= 6), '[]'::jsonb)
  );
end $$;
grant execute on function public.admin_rapports() to anon, authenticated;

-- Envoi immédiat d'un rapport (période en cours) depuis la page Rapports
create or replace function public.admin_envoyer_rapport(p_type text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_cle text; v_type_log text;
begin
  perform public.mi_require_admin(false);
  if p_type not in ('hebdo', 'bancarisation', 'banques') then raise exception 'Rapport inconnu'; end if;
  v_type_log := case p_type when 'hebdo' then 'weekly_leads' when 'bancarisation' then 'monthly_bancarisation' else 'monthly_banks' end;
  if exists (select 1 from public.report_logs where type = v_type_log and declencheur = 'manuel' and sent_at > now() - interval '2 minutes') then
    raise exception 'Ce rapport vient d''être envoyé. Réessayez dans 2 minutes.';
  end if;
  select decrypted_secret into v_cle from vault.decrypted_secrets where name = 'mi_cron_key';
  perform net.http_post(
    url := 'https://uhlohqngavpmdcvujytt.supabase.co/functions/v1/rapports-auto',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_cle),
    body := jsonb_build_object('type', p_type, 'courante', true, 'declencheur', 'manuel'));
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.admin_envoyer_rapport(text) to anon, authenticated;

-- ---------- 8. Banque de dépôt et montant financé (admin ou commercial du dossier) ----------
create or replace function public.mi_set_depot(p_lead_id uuid, p_banque text, p_montant numeric default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_ok boolean := false;
begin
  if public.mi_admin_id() is not null and public.mi_can_see_lead(p_lead_id) then v_ok := true;
  elsif public.mi_commercial_id() is not null and exists (select 1 from public.leads where id = p_lead_id and agent_commercial_id = public.mi_commercial_id()) then v_ok := true;
  end if;
  if not v_ok then raise exception 'Accès refusé : reconnectez-vous.'; end if;
  if p_montant is not null and p_montant < 0 then raise exception 'Montant invalide.'; end if;
  update public.leads set banque_depot = nullif(trim(coalesce(p_banque, '')), ''),
    montant_finance = coalesce(p_montant, montant_finance), updated_at = now()
  where id = p_lead_id;
  return jsonb_build_object('ok', found);
end $$;
grant execute on function public.mi_set_depot(uuid, text, numeric) to anon, authenticated;

-- Liste des banques proposées (référentiel + banques déjà citées par les clients)
create or replace function public.mi_liste_banques() returns text[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(b order by b), '{}') from (
    select nom as b from public.banques
    union select public.mi_nom_banque(banque_actuelle) from public.leads
      where lower(trim(coalesce(banque_actuelle, ''))) not in ('', 'aucune', 'non', 'aucun')
    union select banque_depot from public.leads where banque_depot is not null) s
$$;
grant execute on function public.mi_liste_banques() to anon, authenticated;

-- ---------- 9. Planification : une seule fonction d'envoi ----------
do $$
declare j text;
begin
  foreach j in array array['mayinvest-weekly-leads', 'mayinvest-monthly-bancarisation', 'mayinvest-monthly-banks'] loop
    perform cron.unschedule(j) where exists (select 1 from cron.job where jobname = j);
  end loop;
end $$;
select cron.schedule('mayinvest-weekly-leads', '0 7 * * 1', $c$
  select net.http_post(url := 'https://uhlohqngavpmdcvujytt.supabase.co/functions/v1/rapports-auto',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'mi_cron_key')),
    body := '{"type":"hebdo"}'::jsonb) $c$);
select cron.schedule('mayinvest-monthly-bancarisation', '0 7 1 * *', $c$
  select net.http_post(url := 'https://uhlohqngavpmdcvujytt.supabase.co/functions/v1/rapports-auto',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'mi_cron_key')),
    body := '{"type":"bancarisation"}'::jsonb) $c$);
select cron.schedule('mayinvest-monthly-banks', '2 7 1 * *', $c$
  select net.http_post(url := 'https://uhlohqngavpmdcvujytt.supabase.co/functions/v1/rapports-auto',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'mi_cron_key')),
    body := '{"type":"banques"}'::jsonb) $c$);
