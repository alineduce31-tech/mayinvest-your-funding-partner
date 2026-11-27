-- Pack formalisation vendu sur la plateforme (27/11/2026, validé par l'utilisateur).
-- Le client souscrit, paie chez Mayinvest, un admin confirme le paiement, puis le conseiller suit les étapes.

create table if not exists public.pack_souscriptions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null references public.leads(id) on delete cascade,
  reference text not null unique,
  statut text not null default 'en_attente_paiement' check (statut in ('en_attente_paiement', 'paye', 'termine', 'annule')),
  montant integer not null default 50000,
  etapes jsonb not null default '{}'::jsonb,
  paiement_mode text check (paiement_mode in ('especes', 'mobile_money', 'virement')),
  paiement_montant integer,
  recu_numero text,
  confirme_par uuid references public.admin_users(id) on delete set null,
  confirme_at timestamptz,
  annule_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists pack_souscriptions_un_actif on public.pack_souscriptions (lead_id) where statut <> 'annule';
alter table public.pack_souscriptions enable row level security;
revoke all on public.pack_souscriptions from anon, authenticated;

-- Vue JSON d'une souscription (sans l'identifiant de l'admin)
create or replace function public.mi_pack_json(p public.pack_souscriptions)
returns jsonb language sql stable security definer set search_path to 'public' as $$
  select jsonb_build_object(
    'id', p.id, 'lead_id', p.lead_id, 'reference', p.reference, 'statut', p.statut, 'montant', p.montant,
    'etapes', p.etapes, 'paiement_mode', p.paiement_mode, 'paiement_montant', p.paiement_montant,
    'recu_numero', p.recu_numero, 'confirme_at', p.confirme_at, 'created_at', p.created_at,
    'confirme_par_nom', (select coalesce(nullif(trim(coalesce(a.prenom, '') || ' ' || coalesce(a.nom, '')), ''), split_part(a.email, '@', 1)) from public.admin_users a where a.id = p.confirme_par));
$$;

-- Client : sa souscription en cours (ou null)
create or replace function public.client_pack()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_lead uuid := public.mi_client_lead_id(); v_p public.pack_souscriptions;
begin
  if v_lead is null then raise exception 'Session expirée, reconnectez-vous.'; end if;
  select * into v_p from public.pack_souscriptions where lead_id = v_lead and statut <> 'annule' order by created_at desc limit 1;
  if v_p.id is null then return null; end if;
  return public.mi_pack_json(v_p) - 'recu_numero' - 'confirme_par_nom';
end $$;

-- Client : souscrire (une seule souscription active par dossier)
create or replace function public.client_pack_souscrire()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_lead uuid := public.mi_client_lead_id(); v_p public.pack_souscriptions; v_ref text; i int := 0;
begin
  if v_lead is null then raise exception 'Session expirée, reconnectez-vous.'; end if;
  select * into v_p from public.pack_souscriptions where lead_id = v_lead and statut <> 'annule' limit 1;
  if v_p.id is not null then return public.mi_pack_json(v_p) - 'recu_numero' - 'confirme_par_nom'; end if;
  loop
    v_ref := 'PF-' || lpad((floor(random() * 9000) + 1000)::int::text, 4, '0');
    exit when not exists (select 1 from public.pack_souscriptions where reference = v_ref);
    i := i + 1;
    if i > 50 then v_ref := 'PF-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6)); exit; end if;
  end loop;
  insert into public.pack_souscriptions (lead_id, reference) values (v_lead, v_ref) returning * into v_p;
  -- Le conseiller et l'équipe le voient dans la discussion du dossier
  insert into public.messages (lead_id, sender, content)
  values (v_lead, 'client', 'J''ai souscrit au Pack formalisation (référence ' || v_ref || '). Je passe régler 50 000 XAF chez Mayinvest.');
  return public.mi_pack_json(v_p) - 'recu_numero' - 'confirme_par_nom';
end $$;

-- Admin : toutes les souscriptions visibles par l'admin connecté
create or replace function public.admin_packs()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
begin
  perform public.mi_require_admin(false);
  return coalesce((
    select jsonb_agg(public.mi_pack_json(p) || jsonb_build_object(
      'lead_nom', coalesce(nullif(trim(coalesce(l.identite->>'prenom', '') || ' ' || coalesce(l.identite->>'nom', '')), ''), l.situation->>'raison_sociale', 'Client'),
      'raison_sociale', l.situation->>'raison_sociale',
      'telephone', l.identite->>'tel', 'ville', coalesce(l.ville, l.identite->>'ville'),
      'conseiller_nom', (select trim(coalesce(c.prenom, '') || ' ' || coalesce(c.nom, '')) from public.commercial_candidates c where c.id = l.agent_commercial_id)
    ) order by (p.statut = 'en_attente_paiement') desc, p.created_at desc)
    from public.pack_souscriptions p join public.leads l on l.id = p.lead_id
    where p.statut <> 'annule' and public.mi_can_see_lead(p.lead_id)
  ), '[]'::jsonb);
end $$;

-- Admin, conseiller ou client : souscription d'un dossier précis
create or replace function public.lead_pack(p_lead_id uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare v_p public.pack_souscriptions;
begin
  if not public.mi_can_see_lead(p_lead_id) then raise exception 'Accès refusé.'; end if;
  select * into v_p from public.pack_souscriptions where lead_id = p_lead_id and statut <> 'annule' order by created_at desc limit 1;
  if v_p.id is null then return null; end if;
  return public.mi_pack_json(v_p);
end $$;

-- Admin (directeur ou opérateur) : confirmer le paiement reçu chez Mayinvest
create or replace function public.admin_pack_confirmer_paiement(p_id uuid, p_mode text, p_montant integer, p_recu text)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_admin uuid := public.mi_require_admin(false); v_p public.pack_souscriptions;
begin
  if coalesce(public.mi_admin_role(), '') not in ('director', 'operator') then raise exception 'Action réservée aux directeurs et opérateurs.'; end if;
  select * into v_p from public.pack_souscriptions where id = p_id for update;
  if v_p.id is null or not public.mi_can_see_lead(v_p.lead_id) then raise exception 'Souscription introuvable.'; end if;
  if v_p.statut <> 'en_attente_paiement' then raise exception 'Le paiement de ce pack est déjà confirmé.'; end if;
  if p_mode not in ('especes', 'mobile_money', 'virement') then raise exception 'Mode de paiement inconnu.'; end if;
  if p_montant is null or p_montant <= 0 or p_montant > 10000000 then raise exception 'Montant reçu invalide.'; end if;
  if length(trim(coalesce(p_recu, ''))) = 0 then raise exception 'Indiquez le numéro du reçu.'; end if;
  update public.pack_souscriptions
  set statut = 'paye', paiement_mode = p_mode, paiement_montant = p_montant, recu_numero = left(trim(p_recu), 60),
      confirme_par = v_admin, confirme_at = now(), etapes = etapes || jsonb_build_object('paiement', now()), updated_at = now()
  where id = p_id returning * into v_p;
  update public.leads set statut = 'Pack Formalisation Vendu', updated_at = now() where id = v_p.lead_id;
  insert into public.messages (lead_id, sender, content, author_id, author_name)
  values (v_p.lead_id, 'admin', 'Paiement du Pack formalisation reçu (' || v_p.reference || '). Merci ! Votre conseiller démarre les démarches : RCCM, NIU, statuts puis ouverture de votre compte.', v_admin, 'Mayinvest');
  return public.mi_pack_json(v_p);
end $$;

-- Admin (directeur) : annuler une souscription non payée
create or replace function public.admin_pack_annuler(p_id uuid)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_p public.pack_souscriptions;
begin
  perform public.mi_require_admin(true);
  select * into v_p from public.pack_souscriptions where id = p_id for update;
  if v_p.id is null then raise exception 'Souscription introuvable.'; end if;
  if v_p.statut <> 'en_attente_paiement' then raise exception 'Un pack déjà payé ne peut pas être annulé ici.'; end if;
  update public.pack_souscriptions set statut = 'annule', annule_at = now(), updated_at = now() where id = p_id;
end $$;

-- Admin (sauf lecteur) ou conseiller du dossier : cocher / décocher une étape du pack payé
create or replace function public.pack_maj_etape(p_id uuid, p_etape text, p_fait boolean)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare v_p public.pack_souscriptions; v_lead public.leads; v_ok boolean;
begin
  select * into v_p from public.pack_souscriptions where id = p_id for update;
  if v_p.id is null then raise exception 'Souscription introuvable.'; end if;
  select * into v_lead from public.leads where id = v_p.lead_id;
  v_ok := (public.mi_admin_id() is not null and coalesce(public.mi_admin_role(), '') <> 'viewer' and public.mi_can_see_lead(v_p.lead_id))
       or (v_lead.agent_commercial_id is not null and v_lead.agent_commercial_id = public.mi_commercial_id());
  if not coalesce(v_ok, false) then raise exception 'Accès refusé.'; end if;
  if p_etape not in ('formalites', 'compte', 'eligible') then raise exception 'Étape inconnue.'; end if;
  if v_p.statut not in ('paye', 'termine') then raise exception 'Le paiement doit d''abord être confirmé.'; end if;
  if p_fait then
    update public.pack_souscriptions set etapes = etapes || jsonb_build_object(p_etape, now()), updated_at = now() where id = p_id returning * into v_p;
  else
    update public.pack_souscriptions set etapes = etapes - p_etape, updated_at = now() where id = p_id returning * into v_p;
  end if;
  if v_p.etapes ? 'eligible' and v_p.statut = 'paye' then
    update public.pack_souscriptions set statut = 'termine', updated_at = now() where id = p_id returning * into v_p;
    update public.leads set statut = 'Éligible', updated_at = now() where id = v_p.lead_id;
  elsif not (v_p.etapes ? 'eligible') and v_p.statut = 'termine' then
    update public.pack_souscriptions set statut = 'paye', updated_at = now() where id = p_id returning * into v_p;
  end if;
  return public.mi_pack_json(v_p);
end $$;

revoke all on function public.mi_pack_json(public.pack_souscriptions) from public, anon, authenticated;
revoke all on function public.client_pack(), public.client_pack_souscrire(), public.admin_packs(), public.lead_pack(uuid),
  public.admin_pack_confirmer_paiement(uuid, text, integer, text), public.admin_pack_annuler(uuid), public.pack_maj_etape(uuid, text, boolean) from public;
grant execute on function public.client_pack(), public.client_pack_souscrire(), public.admin_packs(), public.lead_pack(uuid),
  public.admin_pack_confirmer_paiement(uuid, text, integer, text), public.admin_pack_annuler(uuid), public.pack_maj_etape(uuid, text, boolean) to anon, authenticated;
