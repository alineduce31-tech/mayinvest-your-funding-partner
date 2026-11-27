-- Rémunération des partenaires : 10 % de commission sur chaque Pack Formalisation payé par leurs clients
-- (remplace 50 000 XAF par dossier financé). Appliqué le 28/11/2026.
-- mi_commission_partenaire(p_commercial_id, p_depuis) = 10 % × somme des Packs payés (non annulés) de ses clients.
-- get_all_commercials_with_stats et get_commercial_stats : gains_total_xaf / gains_mois_xaf calculés avec cette fonction.
-- mi_perf_commerciaux : 'gains' = 10 % des Packs payés sur la période.
create or replace function public.mi_commission_partenaire(p_commercial_id uuid, p_depuis timestamptz default null) returns bigint
language sql stable security definer set search_path = public as $$
  select coalesce(round(sum(coalesce(p.paiement_montant, p.montant, 0)) * 0.10), 0)::bigint
  from public.pack_souscriptions p join public.leads l on l.id = p.lead_id
  where l.agent_commercial_id = p_commercial_id and p.statut <> 'annule' and p.confirme_at is not null
    and (p_depuis is null or p.confirme_at >= p_depuis)
$$;
revoke execute on function public.mi_commission_partenaire(uuid, timestamptz) from public, anon, authenticated;
