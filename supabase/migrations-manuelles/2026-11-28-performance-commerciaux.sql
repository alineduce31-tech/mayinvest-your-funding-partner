-- ============================================================
-- Performance des commerciaux : onglet Performance (Équipe commerciale) + 4e rapport mensuel
-- Sources : leads attribués (agent_commercial_id) et historique des statuts (lead_statut_historique).
--  Reçus        = leads créés sur la période et attribués au commercial
--  1er contact  = médiane des heures entre la création et le premier changement de statut
--                 (dates estimées exclues : seulement les passages enregistrés en direct)
--  Parcours     = parmi les leads reçus, combien ont atteint RDV, dépôt, financement (à n'importe quelle date)
--  Financés     = passages à « Financé » pendant la période (tous ses dossiers)
--  Transfo.     = financés de la période ÷ leads reçus de la période ; « peu fiable » sous 5 leads reçus
--  En retard    = leads encore « Nouveau » plus de 48 h après leur arrivée
--  Classement   = financés, puis taux de transformation, puis montant financé
-- ============================================================

create or replace function public.mi_perf_commerciaux(d timestamptz, f timestamptz, pd timestamptz, pf timestamptz) returns jsonb
language sql stable security definer set search_path = public as $$
with c as (
  select cc.id, coalesce(nullif(trim(coalesce(cc.prenom, '') || ' ' || coalesce(cc.nom, '')), ''), 'Commercial') as nom, cc.ville, cc.telephone
  from public.commercial_candidates cc
  where cc.status = 'valide' or exists (select 1 from public.leads x where x.agent_commercial_id = cc.id)
), l as (
  select l.*, public.mi_lead_nom(l.type, l.identite, l.situation) as lnom, coalesce(l.montant_finance, l.montant_demande, 0) as montant
  from public.leads l where l.agent_commercial_id is not null
), h as (
  select h.*, l.agent_commercial_id as cid, l.montant, l.banque_depot
  from public.lead_statut_historique h join l on l.id = h.lead_id
), contact as (
  select lead_id, min(change_at) as le, bool_or(estime) as estime from h where nouveau <> 'Nouveau' group by lead_id
), recus as (
  select l.id, l.agent_commercial_id as cid, l.created_at, k.le as contact_le, coalesce(k.estime, false) as estime
  from l left join contact k on k.lead_id = l.id where l.created_at >= d and l.created_at < f
), atteint as (
  select r.cid, r.id,
    bool_or(h.nouveau in ('RDV', 'Dossier Déposé', 'Éligible', 'Financé')) as rdv,
    bool_or(h.nouveau in ('Dossier Déposé', 'Éligible', 'Financé')) as depot,
    bool_or(h.nouveau = 'Financé') as fin
  from recus r left join h on h.lead_id = r.id group by r.cid, r.id
), ev as (
  select h.cid, h.lead_id, h.change_at, h.montant,
    case when h.nouveau = 'Financé' then 'finance'
         when h.nouveau = 'Dossier Déposé' then 'depot'
         when h.nouveau = 'Bancarisé' then 'bancarise'
         when h.nouveau in ('Non Éligible', 'Perdu') and (h.banque_depot is not null or exists (select 1 from h h2 where h2.lead_id = h.lead_id and h2.id <> h.id and h2.change_at <= h.change_at and h2.nouveau in ('Dossier Déposé', 'Éligible'))) then 'refus'
    end as kind
  from h
), per as (
  select c.id, c.nom, c.ville, c.telephone,
    (select count(*) from recus r where r.cid = c.id) as recus,
    (select count(*) from recus r where r.cid = c.id and r.contact_le is not null) as contactes,
    (select round((percentile_cont(0.5) within group (order by extract(epoch from r.contact_le - r.created_at) / 3600))::numeric, 1)
       from recus r where r.cid = c.id and r.contact_le is not null and not r.estime) as delai_h,
    (select count(*) from atteint a where a.cid = c.id and a.rdv) as f_rdv,
    (select count(*) from atteint a where a.cid = c.id and a.depot) as f_depot,
    (select count(*) from atteint a where a.cid = c.id and a.fin) as f_fin,
    (select count(*) from ev where ev.cid = c.id and kind = 'depot' and change_at >= d and change_at < f) as deposes,
    (select count(*) from ev where ev.cid = c.id and kind = 'finance' and change_at >= d and change_at < f) as finances,
    (select count(*) from ev where ev.cid = c.id and kind = 'refus' and change_at >= d and change_at < f) as refus,
    (select count(*) from ev where ev.cid = c.id and kind = 'bancarise' and change_at >= d and change_at < f) as bancarises,
    (select coalesce(sum(montant), 0) from ev where ev.cid = c.id and kind = 'finance' and change_at >= d and change_at < f) as montant,
    (select count(*) from ev where ev.cid = c.id and kind = 'finance' and change_at >= pd and change_at < pf) as p_finances,
    (select count(*) from l where l.agent_commercial_id = c.id and l.created_at >= pd and l.created_at < pf) as p_recus,
    (select count(*) from public.pack_souscriptions p join l on l.id = p.lead_id where l.agent_commercial_id = c.id and p.statut <> 'annule' and p.confirme_at >= d and p.confirme_at < f) as packs,
    (select count(*) from l where l.agent_commercial_id = c.id and l.statut not in ('Financé', 'Perdu', 'Non Éligible')) as actifs,
    (select count(*) from l where l.agent_commercial_id = c.id and coalesce(l.statut, 'Nouveau') = 'Nouveau' and l.created_at < now() - interval '48 hours') as retard,
    coalesce((select jsonb_agg(jsonb_build_object('nom', l.lnom, 'depuis', l.created_at, 'ville', coalesce(l.ville, l.identite->>'ville')) order by l.created_at)
       from l where l.agent_commercial_id = c.id and coalesce(l.statut, 'Nouveau') = 'Nouveau' and l.created_at < now() - interval '48 hours'), '[]'::jsonb) as retard_liste
  from c
), classe as (
  select p.*,
    case when p.recus > 0 then round(p.finances * 100.0 / p.recus) end as transfo,
    case when p.finances + p.refus > 0 then round(p.finances * 100.0 / (p.finances + p.refus)) end as taux_acceptation,
    row_number() over (order by p.finances desc, (case when p.recus > 0 then p.finances::numeric / p.recus else 0 end) desc, p.montant desc, p.recus desc, p.nom) as rang
  from per p
), eq as (
  select coalesce(sum(recus), 0) recus, coalesce(sum(contactes), 0) contactes, coalesce(sum(deposes), 0) deposes, coalesce(sum(finances), 0) finances,
    coalesce(sum(refus), 0) refus, coalesce(sum(montant), 0) montant, coalesce(sum(retard), 0) retard, coalesce(sum(p_recus), 0) p_recus,
    coalesce(sum(p_finances), 0) p_finances, coalesce(sum(packs), 0) packs, coalesce(sum(bancarises), 0) bancarises
  from per
), med as (
  select round((percentile_cont(0.5) within group (order by extract(epoch from contact_le - created_at) / 3600))::numeric, 1) as delai_h
  from recus where contact_le is not null and not estime
), meilleur as (select nom, finances from classe where rang = 1 and finances > 0)
select jsonb_build_object(
  'equipe', jsonb_build_object('recus', e.recus, 'contactes', e.contactes, 'deposes', e.deposes, 'finances', e.finances, 'refus', e.refus,
    'montant_finance', e.montant, 'commission', round(e.montant * 0.02), 'retard', e.retard, 'packs', e.packs, 'bancarises', e.bancarises,
    'delai_h', m.delai_h, 'transfo', case when e.recus > 0 then round(e.finances * 100.0 / e.recus) end,
    'precedent', jsonb_build_object('recus', e.p_recus, 'finances', e.p_finances)),
  'commerciaux', coalesce((select jsonb_agg(jsonb_build_object(
      'id', x.id, 'rang', x.rang, 'nom', x.nom, 'ville', x.ville, 'telephone', x.telephone,
      'recus', x.recus, 'contactes', x.contactes, 'delai_h', x.delai_h,
      'parcours', jsonb_build_object('recus', x.recus, 'contactes', x.contactes, 'rdv', x.f_rdv, 'deposes', x.f_depot, 'finances', x.f_fin),
      'deposes', x.deposes, 'finances', x.finances, 'refus', x.refus, 'taux_acceptation', x.taux_acceptation,
      'transfo', x.transfo, 'fiable', x.recus >= 5, 'montant_finance', x.montant, 'gains', x.finances * 50000,
      'packs', x.packs, 'bancarises', x.bancarises, 'actifs', x.actifs, 'retard', x.retard, 'retard_liste', x.retard_liste,
      'precedent', jsonb_build_object('recus', x.p_recus, 'finances', x.p_finances)) order by x.rang) from classe x), '[]'::jsonb),
  'phrase', case when e.finances > 0
      then 'Ce mois, l''équipe a financé ' || e.finances || case when e.finances > 1 then ' dossiers' else ' dossier' end
           || '. Meilleur commercial : ' || (select nom from meilleur) || ' (' || (select finances from meilleur) || ')'
      else 'Ce mois, aucun dossier financé par l''équipe' end
    || case when e.retard > 0 then '. ' || e.retard || case when e.retard > 1 then ' leads attendent' else ' lead attend' end || ' un premier contact depuis plus de 48 h' else '' end
) from eq e, med m
$$;
revoke execute on function public.mi_perf_commerciaux(timestamptz, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;

-- Onglet Performance : ce mois, 3 mois ou 12 mois (jusqu'à maintenant), comparé à la même durée juste avant
create or replace function public.admin_performance_commerciaux(p_periode text default 'mois') returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare tz constant text := 'Africa/Brazzaville'; n timestamp := now() at time zone tz; nb int; d timestamp; duree interval;
  mois constant text[] := array['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];
begin
  perform public.mi_require_admin(false);
  nb := case p_periode when '3mois' then 3 when '12mois' then 12 else 1 end;
  d := date_trunc('month', n) - make_interval(months => nb - 1);
  duree := n - d;
  return public.mi_perf_commerciaux(d at time zone tz, n at time zone tz, (d - make_interval(months => nb)) at time zone tz, (n - make_interval(months => nb)) at time zone tz)
    || jsonb_build_object('periode', case nb when 1 then 'Mois en cours, ' || mois[extract(month from d)::int] || ' ' || extract(year from d)::int
                                              else 'Depuis le 1er ' || mois[extract(month from d)::int] || ' ' || extract(year from d)::int end,
                          'debut', d at time zone tz, 'fin', n at time zone tz);
end $$;
grant execute on function public.admin_performance_commerciaux(text) to anon, authenticated;

-- 4e rapport automatique
create or replace function public.mi_rapport(p_type text, p_courante boolean default false) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare p record; r jsonb;
begin
  if p_type not in ('hebdo', 'bancarisation', 'banques', 'commerciaux') then raise exception 'Rapport inconnu'; end if;
  select * into p from public.mi_rapport_periode(p_type, p_courante);
  r := case p_type
    when 'hebdo' then public.mi_rapport_hebdo(p.debut, p.fin, p.prec_debut, p.prec_fin)
    when 'bancarisation' then public.mi_rapport_bancarisation(p.debut, p.fin, p.prec_debut, p.prec_fin)
    when 'banques' then public.mi_rapport_banques(p.debut, p.fin, p.prec_debut, p.prec_fin)
    else public.mi_perf_commerciaux(p.debut, p.fin, p.prec_debut, p.prec_fin) end;
  return r || jsonb_build_object('type', p_type, 'periode', p.libelle, 'debut', p.debut, 'fin', p.fin,
    'destinataires', to_jsonb(public.mi_rapport_destinataires()), 'calcule_le', now());
end $$;

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
    'commerciaux', public.mi_rapport('commerciaux', true) || jsonb_build_object('prochain_envoi', premier at time zone tz),
    'envois', coalesce((select jsonb_agg(x order by x.sent_at desc) from (
        select r.id, case r.type when 'weekly_leads' then 'hebdo' when 'monthly_bancarisation' then 'bancarisation' when 'monthly_commercials' then 'commerciaux' else 'banques' end as type,
          r.status, r.sent_at, r.body_summary, r.periode, coalesce(r.declencheur, 'auto') as declencheur, r.recipients,
          row_number() over (partition by r.type order by r.sent_at desc) as rang
        from public.report_logs r where r.type in ('weekly_leads', 'monthly_bancarisation', 'monthly_banks', 'monthly_commercials')) x where x.rang <= 6), '[]'::jsonb)
  );
end $$;

create or replace function public.admin_envoyer_rapport(p_type text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v_cle text; v_type_log text;
begin
  perform public.mi_require_admin(false);
  if p_type not in ('hebdo', 'bancarisation', 'banques', 'commerciaux') then raise exception 'Rapport inconnu'; end if;
  v_type_log := case p_type when 'hebdo' then 'weekly_leads' when 'bancarisation' then 'monthly_bancarisation' when 'commerciaux' then 'monthly_commercials' else 'monthly_banks' end;
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

do $$ begin
  perform cron.unschedule('mayinvest-monthly-commerciaux') where exists (select 1 from cron.job where jobname = 'mayinvest-monthly-commerciaux');
end $$;
select cron.schedule('mayinvest-monthly-commerciaux', '4 7 1 * *', $c$
  select net.http_post(url := 'https://uhlohqngavpmdcvujytt.supabase.co/functions/v1/rapports-auto',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'mi_cron_key')),
    body := '{"type":"commerciaux"}'::jsonb) $c$);
