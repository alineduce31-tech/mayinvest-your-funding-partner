-- Module 5 : comparateur de frais bancaires.
-- Tarifs relevés en agence (photo du hall comme preuve), historique, recherches anonymes.
-- Lecture publique et écriture admin uniquement par RPC (RLS sans politique).

create table if not exists public.cmp_banques (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique,
  villes text[] not null default array['Brazzaville','Pointe-Noire'],
  actif boolean not null default true,
  ordre int not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.cmp_tarifs (
  banque_id uuid not null references public.cmp_banques(id) on delete cascade,
  frais text not null,
  valeur numeric not null check (valeur >= 0),
  unite text not null check (unite in ('XAF','%')),
  maj_at timestamptz not null default now(),
  maj_par uuid,
  primary key (banque_id, frais)
);

create table if not exists public.cmp_tarifs_historique (
  id bigserial primary key,
  banque_id uuid not null references public.cmp_banques(id) on delete cascade,
  frais text not null,
  valeur numeric,
  unite text,
  maj_at timestamptz not null default now(),
  maj_par uuid
);

create table if not exists public.cmp_verifications (
  banque_id uuid primary key references public.cmp_banques(id) on delete cascade,
  verifie_at timestamptz not null default now(),
  verifie_par uuid
);

create table if not exists public.cmp_preuves (
  id bigserial primary key,
  banque_id uuid not null references public.cmp_banques(id) on delete cascade,
  url text not null,
  nom text,
  created_at timestamptz not null default now(),
  par uuid
);

create table if not exists public.cmp_recherches (
  id bigserial primary key,
  profil text not null check (profil in ('particulier','entreprise')),
  besoins text[] not null,
  ville text,
  tranche text,
  created_at timestamptz not null default now()
);

alter table public.cmp_banques enable row level security;
alter table public.cmp_tarifs enable row level security;
alter table public.cmp_tarifs_historique enable row level security;
alter table public.cmp_verifications enable row level security;
alter table public.cmp_preuves enable row level security;
alter table public.cmp_recherches enable row level security;

insert into public.cmp_banques (nom, ordre) values
  ('BGFIBank Congo', 1), ('BCI', 2), ('UBA Congo', 3), ('Ecobank Congo', 4), ('BSCA Bank', 5),
  ('Société Générale Congo', 6), ('BCH', 7), ('BOA Congo', 8), ('MUCODEC', 9), ('Banque Postale du Congo', 10), ('Crédit du Congo', 12), ('Afriland First Bank', 13)
on conflict (nom) do nothing;

-- Clés de frais autorisées (miroir de src/lib/comparateur.ts).
create or replace function public.mi_cmp_frais_ok(p_cle text, p_unite text) returns boolean
language sql immutable as $$
  select case
    when p_cle in ('ouverture_depot','ouverture_frais','tenue_mois','carte_prix','carte_renouv','carte_opposition',
                   'retrait_meme','retrait_confrere','vir_intra','vir_inter','vir_momo','credit_frais_dossier',
                   'pro_tenue_mois','pro_pack_pme_mois','pro_cheque_commission','pro_carte_business','pro_vir_masse',
                   'pro_credit_frais_dossier','pro_swift_sortant','pro_swift_entrant') then p_unite = 'XAF'
    when p_cle in ('credit_taux_min','credit_taux_max','pro_tpe_pct','pro_decouvert_taux','pro_invest_taux') then p_unite = '%'
    else false end
$$;

-- Lecture publique : banques actives, leurs tarifs et la date de dernière vérification.
create or replace function public.comparateur_donnees() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'nom', b.nom, 'villes', b.villes,
    'verifie_at', coalesce(v.verifie_at, (select max(t.maj_at) from public.cmp_tarifs t where t.banque_id = b.id)),
    'tarifs', coalesce((select jsonb_object_agg(t.frais, jsonb_build_object('v', t.valeur, 'u', t.unite)) from public.cmp_tarifs t where t.banque_id = b.id), '{}'::jsonb)
  ) order by b.ordre, b.nom), '[]'::jsonb)
  from public.cmp_banques b left join public.cmp_verifications v on v.banque_id = b.id
  where b.actif
$$;

-- Recherche anonyme (aucune donnée personnelle) pour les statistiques.
create or replace function public.comparateur_noter(p_profil text, p_besoins text[], p_ville text, p_tranche text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_profil not in ('particulier','entreprise') or coalesce(array_length(p_besoins, 1), 0) not between 1 and 6 then return; end if;
  insert into public.cmp_recherches (profil, besoins, ville, tranche)
  values (p_profil, p_besoins[1:6], left(p_ville, 40), left(p_tranche, 40));
end $$;

-- Admin : liste complète avec preuves et historique récent.
create or replace function public.admin_cmp_liste() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  perform public.mi_require_admin(false);
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id', b.id, 'nom', b.nom, 'villes', b.villes, 'actif', b.actif,
    'verifie_at', coalesce(v.verifie_at, (select max(t.maj_at) from public.cmp_tarifs t where t.banque_id = b.id)),
    'tarifs', coalesce((select jsonb_object_agg(t.frais, jsonb_build_object('v', t.valeur, 'u', t.unite, 'maj_at', t.maj_at)) from public.cmp_tarifs t where t.banque_id = b.id), '{}'::jsonb),
    'preuves', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'url', p.url, 'nom', p.nom, 'created_at', p.created_at) order by p.created_at desc) from public.cmp_preuves p where p.banque_id = b.id), '[]'::jsonb),
    'historique', coalesce((select jsonb_agg(x order by x.maj_at desc) from (
        select h.frais, h.valeur, h.unite, h.maj_at from public.cmp_tarifs_historique h where h.banque_id = b.id order by h.maj_at desc limit 30) x), '[]'::jsonb)
  ) order by b.ordre, b.nom) from public.cmp_banques b left join public.cmp_verifications v on v.banque_id = b.id), '[]'::jsonb);
end $$;

-- Admin : enregistrer les tarifs relevés (valeur vide = frais retiré), ajouter les photos de preuve, dater la vérification.
create or replace function public.admin_cmp_enregistrer(p_banque uuid, p_tarifs jsonb, p_preuves jsonb default '[]'::jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_admin uuid := public.mi_require_admin(false); k text; val jsonb; v numeric; u text; anc record; p jsonb;
begin
  if not exists (select 1 from public.cmp_banques where id = p_banque) then raise exception 'Banque introuvable.'; end if;
  for k, val in select * from jsonb_each(coalesce(p_tarifs, '{}'::jsonb)) loop
    u := coalesce(val->>'u', 'XAF');
    if not public.mi_cmp_frais_ok(k, u) then raise exception 'Frais inconnu : %', k; end if;
    select valeur, unite into anc from public.cmp_tarifs where banque_id = p_banque and frais = k;
    if val->>'v' is null or btrim(val->>'v') = '' then
      if found then
        delete from public.cmp_tarifs where banque_id = p_banque and frais = k;
        insert into public.cmp_tarifs_historique (banque_id, frais, valeur, unite, maj_par) values (p_banque, k, null, u, v_admin);
      end if;
      continue;
    end if;
    v := (val->>'v')::numeric;
    if v < 0 or (u = '%' and v > 100) then raise exception 'Valeur incorrecte pour %', k; end if;
    if not found or anc.valeur is distinct from v then
      insert into public.cmp_tarifs_historique (banque_id, frais, valeur, unite, maj_par) values (p_banque, k, v, u, v_admin);
    end if;
    insert into public.cmp_tarifs (banque_id, frais, valeur, unite, maj_at, maj_par) values (p_banque, k, v, u, now(), v_admin)
    on conflict (banque_id, frais) do update set valeur = excluded.valeur, unite = excluded.unite, maj_at = now(), maj_par = v_admin;
  end loop;
  for p in select * from jsonb_array_elements(coalesce(p_preuves, '[]'::jsonb)) loop
    if position('/storage/v1/object/public/comparateur-preuves/' || p_banque::text || '/' in coalesce(p->>'url', '')) = 0 then
      raise exception 'Photo de preuve invalide.';
    end if;
    insert into public.cmp_preuves (banque_id, url, nom, par) values (p_banque, p->>'url', left(p->>'nom', 120), v_admin);
  end loop;
  insert into public.cmp_verifications (banque_id, verifie_at, verifie_par) values (p_banque, now(), v_admin)
  on conflict (banque_id) do update set verifie_at = now(), verifie_par = v_admin;
end $$;

-- Admin : ajouter ou modifier une banque.
create or replace function public.admin_cmp_banque(p_id uuid, p_nom text, p_villes text[], p_actif boolean) returns uuid
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public.mi_require_admin(false);
  if coalesce(btrim(p_nom), '') = '' then raise exception 'Nom de la banque obligatoire.'; end if;
  if p_id is null then
    insert into public.cmp_banques (nom, villes, actif) values (btrim(p_nom), coalesce(p_villes, array['Brazzaville','Pointe-Noire']), coalesce(p_actif, true)) returning id into v_id;
  else
    update public.cmp_banques set nom = btrim(p_nom), villes = coalesce(p_villes, villes), actif = coalesce(p_actif, actif) where id = p_id returning id into v_id;
    if v_id is null then raise exception 'Banque introuvable.'; end if;
  end if;
  return v_id;
end $$;

revoke all on function public.admin_cmp_liste(), public.admin_cmp_enregistrer(uuid, jsonb, jsonb), public.admin_cmp_banque(uuid, text, text[], boolean) from public;
grant execute on function public.comparateur_donnees(), public.comparateur_noter(text, text[], text, text) to anon, authenticated;
grant execute on function public.admin_cmp_liste(), public.admin_cmp_enregistrer(uuid, jsonb, jsonb), public.admin_cmp_banque(uuid, text, text[], boolean) to anon, authenticated;

-- Photos de preuve : bucket public, images uniquement, 6 Mo maximum.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comparateur-preuves', 'comparateur-preuves', true, 6291456, array['image/jpeg','image/png','image/webp','image/heic'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists anon_upload_comparateur_preuves on storage.objects;
create policy anon_upload_comparateur_preuves on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'comparateur-preuves');
