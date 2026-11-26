-- Audit de sécurité du 26/11/2026 (accord de l'utilisateur).

-- 1. Documents clients : plus de liste publique des fichiers, plus d'accès total via Supabase Auth
drop policy if exists anon_read_lead_docs on storage.objects;
drop policy if exists admin_all_lead_docs on storage.objects;
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
where id = 'lead-documents';

-- 2. Anciennes fonctions inutilisées
revoke execute on function public.find_lead_by_code(text) from anon, authenticated, public;
revoke execute on function public.find_leads_by_email_code(text, text) from anon, authenticated, public;
revoke execute on function public.find_leads_by_phone_code(text, text) from anon, authenticated, public;
revoke execute on function public.get_lead_by_code(uuid, text) from anon, authenticated, public;
revoke execute on function public.assigner_lead_par_ref(uuid, text) from anon, authenticated, public;

-- 3. search_path figé
do $$
declare r record;
begin
  for r in select p.oid::regprocedure as f from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.proname in ('set_updated_at','inscrire_utilisateur','connecter_utilisateur','calculate_lead_score','update_lead_score','lead_tier','sync_lead_to_google_sheet','generate_ref_code','set_ref_code_default','mi_leads_nom_banque','mi_nom_banque')
  loop
    execute format('alter function %s set search_path = public, extensions', r.f);
  end loop;
end $$;

-- 4. Blocage 15 minutes après 5 échecs de connexion (par identifiant)
create table if not exists public.login_failures (k text not null, at timestamptz not null default now());
create index if not exists login_failures_k_at on public.login_failures (k, at desc);
alter table public.login_failures enable row level security;
revoke all on public.login_failures from anon, authenticated;

create or replace function public.mi_login_bloque(p_k text) returns boolean
language sql stable security definer set search_path to 'public' as $$
  select count(*) >= 5 from public.login_failures where k = p_k and at > now() - interval '15 minutes';
$$;
create or replace function public.mi_login_echec(p_k text) returns void
language sql security definer set search_path to 'public' as $$
  delete from public.login_failures where at < now() - interval '1 day';
  insert into public.login_failures (k) values (p_k);
$$;
create or replace function public.mi_login_ok(p_k text) returns void
language sql security definer set search_path to 'public' as $$
  delete from public.login_failures where k = p_k;
$$;
revoke all on function public.mi_login_bloque(text), public.mi_login_echec(text), public.mi_login_ok(text) from public, anon, authenticated;

create or replace function public.verify_admin_login(p_email text, p_password text)
returns table(success boolean, id uuid, email text, nom text, prenom text, ville text, role text, token text)
language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare
  v_row public.admin_users%rowtype;
  v_k text := 'admin:' || lower(trim(coalesce(p_email, '')));
begin
  if public.mi_login_bloque(v_k) then raise exception 'Trop de tentatives. Réessayez dans 15 minutes.'; end if;
  select au.* into v_row from public.admin_users au
  where lower(au.email) = lower(trim(p_email)) and coalesce(au.is_active, true) = true
    and au.password_hash = crypt(p_password, au.password_hash)
  limit 1;
  if v_row.id is null then
    perform public.mi_login_echec(v_k);
    return query select false, null::uuid, null::text, null::text, null::text, null::text, null::text, null::text;
    return;
  end if;
  perform public.mi_login_ok(v_k);
  update public.admin_users set last_login_at = now() where public.admin_users.id = v_row.id;
  return query select true, v_row.id, v_row.email, v_row.nom, v_row.prenom, v_row.ville, v_row.role,
                      public.mi_new_session('admin', v_row.id, 8);
end $function$;

create or replace function public.connecter_commercial(p_identifiant text, p_password text)
returns jsonb language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare
  v_c public.commercial_candidates;
  v_ident text := trim(coalesce(p_identifiant, ''));
  v_digits text := regexp_replace(coalesce(p_identifiant, ''), '\D', '', 'g');
  v_k text := 'commercial:' || case when length(v_digits) >= 9 and position('@' in v_ident) = 0 then v_digits else lower(v_ident) end;
begin
  if public.mi_login_bloque(v_k) then raise exception 'Trop de tentatives. Réessayez dans 15 minutes.'; end if;
  select * into v_c from public.commercial_candidates
  where lower(email) = lower(v_ident)
     or (length(v_digits) >= 9 and regexp_replace(coalesce(telephone, ''), '\D', '', 'g') = v_digits)
  order by created_at desc limit 1;
  if v_c.id is null or v_c.password_hash is null or v_c.password_hash <> crypt(p_password, v_c.password_hash) then
    perform public.mi_login_echec(v_k);
    return jsonb_build_object('error', 'Identifiants incorrects.');
  end if;
  if v_c.status = 'refuse' then
    raise exception 'Ce compte a été désactivé. Contacte la direction Mayinvest.';
  end if;
  perform public.mi_login_ok(v_k);
  return jsonb_build_object(
    'id', v_c.id, 'nom', v_c.nom, 'prenom', v_c.prenom, 'email', v_c.email,
    'telephone', v_c.telephone, 'ville', v_c.ville, 'status', v_c.status,
    'activated_at', v_c.activated_at, 'ref_code', v_c.ref_code,
    'token', public.mi_new_session('commercial', v_c.id, 24 * 7));
end $function$;

create or replace function public.verify_lead_password_by_email(p_email text, p_password text)
returns table(id uuid) language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_k text := 'client:' || lower(trim(coalesce(p_email, ''))); v_id uuid;
begin
  if public.mi_login_bloque(v_k) then raise exception 'Trop de tentatives. Réessayez dans 15 minutes.'; end if;
  select l.id into v_id from public.leads l join public.lead_credentials c on c.lead_id = l.id
  where lower(trim(coalesce(l.identite->>'email', ''))) = lower(trim(coalesce(p_email, '')))
    and c.password_hash = crypt(p_password, c.password_hash)
  order by l.created_at desc limit 1;
  if v_id is null then perform public.mi_login_echec(v_k); return; end if;
  perform public.mi_login_ok(v_k);
  return query select v_id;
end $function$;

create or replace function public.verify_lead_password_by_phone(p_phone text, p_password text)
returns table(id uuid) language plpgsql security definer set search_path to 'public', 'extensions' as $function$
declare v_d text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'); v_k text; v_id uuid;
begin
  v_k := 'client:' || v_d;
  if public.mi_login_bloque(v_k) then raise exception 'Trop de tentatives. Réessayez dans 15 minutes.'; end if;
  select l.id into v_id from public.leads l join public.lead_credentials c on c.lead_id = l.id
  where regexp_replace(coalesce(l.identite->>'tel', ''), '\D', '', 'g') = v_d
    and c.password_hash = crypt(p_password, c.password_hash)
  order by l.created_at desc limit 1;
  if v_id is null then perform public.mi_login_echec(v_k); return; end if;
  perform public.mi_login_ok(v_k);
  return query select v_id;
end $function$;

-- 5. Quiz corrigé sur le serveur : la bonne réponse n'est plus lisible depuis le navigateur
revoke select on public.quiz_questions from anon, authenticated;
grant select (id, module_id, position, question, options, points, created_at) on public.quiz_questions to anon, authenticated;

drop policy if exists quiz_attempts_rw on public.quiz_attempts;
create policy quiz_attempts_read on public.quiz_attempts for select to anon, authenticated
  using ((select public.mi_admin_id()) is not null or candidate_id = (select public.mi_commercial_id()));

create or replace function public.commercial_submit_quiz(p_module_id uuid, p_answers jsonb, p_time_seconds integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_c uuid := public.mi_commercial_id(); v_score int; v_total int; v_passed boolean;
begin
  if v_c is null then raise exception 'Session expirée, reconnecte-toi.'; end if;
  select count(*) filter (where coalesce(p_answers, '{}'::jsonb)->>q.id::text = q.correct_option_id::text), count(*)
    into v_score, v_total
  from public.quiz_questions q where q.module_id = p_module_id;
  if v_total = 0 then raise exception 'Quiz introuvable'; end if;
  v_passed := v_score >= least(4, v_total);
  insert into public.quiz_attempts (candidate_id, module_id, answers, score, passed, time_seconds)
  values (v_c, p_module_id, coalesce(p_answers, '{}'::jsonb), v_score, v_passed, greatest(0, least(coalesce(p_time_seconds, 0), 86400)));
  return jsonb_build_object('score', v_score, 'total', v_total, 'passed', v_passed);
end $function$;
revoke all on function public.commercial_submit_quiz(uuid, jsonb, integer) from public;
grant execute on function public.commercial_submit_quiz(uuid, jsonb, integer) to anon, authenticated;

drop function if exists public.commercial_submit_epreuve(integer, integer, integer, jsonb);

-- 6. Simulations des candidats : scores calculés et enregistrés sur le serveur
-- Un candidat ne peut plus modifier sa propre fiche (scores, statut) : seuls les admins le peuvent.
drop policy if exists candidates_update on public.commercial_candidates;
create policy candidates_update on public.commercial_candidates for update to anon, authenticated
  using ((select public.mi_admin_id()) is not null) with check ((select public.mi_admin_id()) is not null);

drop policy if exists simulation_attempts_rw on public.simulation_attempts;
create policy simulation_attempts_read on public.simulation_attempts for select to anon, authenticated
  using ((select public.mi_admin_id()) is not null or candidate_id = (select public.mi_commercial_id()));
drop policy if exists practical_attempts_rw on public.practical_attempts;
create policy practical_attempts_read on public.practical_attempts for select to anon, authenticated
  using ((select public.mi_admin_id()) is not null or candidate_id = (select public.mi_commercial_id()));

-- Les points et la bonne réponse des scénarios ne sont plus lisibles avant d'avoir répondu
revoke select on public.simulation_scenarios from anon, authenticated;
grant select (id, position, title, tag, context, prospect_message, question, is_active, created_at) on public.simulation_scenarios to anon, authenticated;

create or replace function public.commercial_scenarios()
returns table(id uuid, "position" integer, title text, tag text, context text, prospect_message text, question text, choices jsonb)
language plpgsql stable security definer set search_path to 'public' as $function$
begin
  if public.mi_commercial_id() is null then raise exception 'Session expirée, reconnecte-toi.'; end if;
  return query
  select s.id, s.position, s.title, s.tag, s.context, s.prospect_message, s.question,
         coalesce((select jsonb_agg(jsonb_build_object('id', c->>'id', 'text', c->>'text')) from jsonb_array_elements(s.choices) c), '[]'::jsonb)
  from public.simulation_scenarios s where s.is_active order by s.position;
end $function$;

create or replace function public.commercial_pick_choice(p_scenario_id uuid, p_choice_id text, p_time_seconds integer)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_c uuid := public.mi_commercial_id(); v_s public.simulation_scenarios; v_pts int; v_prev public.simulation_attempts;
begin
  if v_c is null then raise exception 'Session expirée, reconnecte-toi.'; end if;
  select * into v_s from public.simulation_scenarios where id = p_scenario_id and is_active;
  if v_s.id is null then raise exception 'Scénario introuvable'; end if;
  -- La première réponse compte : pas de seconde chance une fois la correction vue
  select * into v_prev from public.simulation_attempts where candidate_id = v_c and scenario_id = p_scenario_id order by created_at limit 1;
  if v_prev.id is null then
    select coalesce((c->>'points')::int, 0) into v_pts from jsonb_array_elements(v_s.choices) c where c->>'id' = p_choice_id;
    v_pts := coalesce(v_pts, 0);
    insert into public.simulation_attempts (candidate_id, scenario_id, choice_id, points_earned, time_seconds)
    values (v_c, p_scenario_id, p_choice_id, v_pts, greatest(0, least(coalesce(p_time_seconds, 0), 86400)));
  else
    v_pts := v_prev.points_earned;
  end if;
  return jsonb_build_object('points', v_pts, 'choice_id', coalesce(v_prev.choice_id, p_choice_id), 'choices', v_s.choices, 'best_choice_id', v_s.best_choice_id, 'feedback', v_s.feedback);
end $function$;

create or replace function public.commercial_finish_theo()
returns integer language plpgsql security definer set search_path to 'public' as $function$
declare v_c uuid := public.mi_commercial_id(); v_score int;
begin
  if v_c is null then raise exception 'Session expirée, reconnecte-toi.'; end if;
  select least(100, coalesce(sum(a.points_earned), 0)) into v_score
  from (select distinct on (scenario_id) scenario_id, points_earned from public.simulation_attempts
        where candidate_id = v_c order by scenario_id, created_at) a
  join public.simulation_scenarios s on s.id = a.scenario_id and s.is_active;
  update public.commercial_candidates set score_simulation_theo = v_score, updated_at = now() where id = v_c;
  return v_score;
end $function$;

-- Épreuves pratiques : le navigateur envoie seulement ce que le candidat a fait,
-- le serveur rejoue les règles de l'épreuve et calcule la note (/20).
create or replace function public.commercial_submit_epreuve(p_epreuve integer, p_time_seconds integer, p_data jsonb)
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare
  v_c uuid := public.mi_commercial_id(); v_score int := 0; v_t text; v_n int := 0;
  m bool := false; u bool := false; r bool := false; b bool := false;
  f jsonb; v_ca numeric; v_mnt numeric;
  v_msgs text[]; v_statuts text[]; v_docs int; v_contacte bool; v_rdv bool; v_pdocs bool; v_depose bool;
begin
  if v_c is null then raise exception 'Session expirée, reconnecte-toi.'; end if;
  if p_epreuve not in (1, 2, 3) then raise exception 'Épreuve inconnue'; end if;
  p_data := coalesce(p_data, '{}'::jsonb);
  if octet_length(p_data::text) > 60000 then raise exception 'Données trop volumineuses'; end if;
  if exists (select 1 from public.practical_attempts where candidate_id = v_c and epreuve = p_epreuve) then
    select score into v_score from public.practical_attempts where candidate_id = v_c and epreuve = p_epreuve order by created_at limit 1;
    return jsonb_build_object('ok', true, 'score', v_score, 'deja', true);
  end if;

  -- messages écrits par le candidat (épreuves 1 et 3)
  select coalesce(array_agg(left(lower(e->>'text'), 1000) order by o), '{}') into v_msgs
  from jsonb_array_elements(case when jsonb_typeof(p_data->'messages') = 'array' then p_data->'messages' else '[]'::jsonb end) with ordinality as x(e, o)
  where e->>'from' = 'me' and coalesce(e->>'text', '') <> '';
  if array_length(v_msgs, 1) > 80 then raise exception 'Trop de messages'; end if;

  if p_epreuve = 1 then
    -- Même logique que le client virtuel : une information obtenue par message au maximum
    foreach v_t in array v_msgs loop
      if not m and v_t ~* 'montant|combien|somme|xaf|million' then m := true; u := true;
      elsif not u and v_t ~* 'pourquoi|usage|projet|utilis|servir|faire|objet' then u := true;
      elsif not r and v_t ~* 'revenu|salaire|gagne|mensuel|salarié|employeur|travaill' then r := true;
      elsif not b and v_t ~* 'banque|compte|uba|bgfi|boa|lcb|mucodec|ecobank|crédit du congo' then b := true;
      end if;
      v_n := v_n + 1;
    end loop;
    v_score := round(((m::int + u::int + r::int + b::int) / 4.0) * 20);
    if v_n > 10 then v_score := greatest(0, v_score - 4); end if;
    if v_n > 15 then v_score := greatest(0, v_score - 4); end if;

  elsif p_epreuve = 2 then
    -- Réponses attendues gardées sur le serveur
    f := coalesce(p_data->'form', '{}'::jsonb);
    if coalesce(f->>'type', '') = 'PME' then v_score := v_score + 2; end if;
    if coalesce(f->>'activite', '') = 'Commerce' then v_score := v_score + 2; end if;
    if lower(coalesce(f->>'raison', '')) ~ 'marie|ntoumi|boutique' then v_score := v_score + 2; end if;
    if lower(coalesce(f->>'dirigeant', '')) like '%marie%' and lower(coalesce(f->>'dirigeant', '')) like '%ntoumi%' then v_score := v_score + 2; end if;
    if regexp_replace(coalesce(f->>'tel', ''), '\s', '', 'g') like '%0665532%' then v_score := v_score + 2; end if;
    if coalesce(f->>'ville', '') = 'Dolisie' then v_score := v_score + 2; end if;
    if coalesce(f->>'rccm', '') = 'Oui' then v_score := v_score + 1; end if;
    v_ca := nullif(left(regexp_replace(coalesce(f->>'ca', ''), '\D', '', 'g'), 18), '')::numeric;
    if v_ca between 15000000 * 0.9 and 15000000 * 1.2 then v_score := v_score + 2; end if;
    v_mnt := nullif(left(regexp_replace(coalesce(f->>'montant', ''), '\D', '', 'g'), 18), '')::numeric;
    if v_mnt = 2000000 then v_score := v_score + 3; end if;
    if upper(coalesce(f->>'banque', '')) like '%BOA%' then v_score := v_score + 2; end if;
    if v_score < 10 then
      return jsonb_build_object('ok', false, 'error', 'Tu as trop d''erreurs. Relis bien le brief et corrige les champs.');
    end if;

  else
    select coalesce(array_agg(distinct x), '{}') into v_statuts
    from jsonb_array_elements_text(case when jsonb_typeof(p_data->'statuts') = 'array' then p_data->'statuts' else '[]'::jsonb end) x;
    select count(distinct d) into v_docs
    from jsonb_array_elements_text(case when jsonb_typeof(p_data->'docsRequested') = 'array' then p_data->'docsRequested' else '[]'::jsonb end) d
    where d in ('Pièce d''identité', 'Fiche de paie (3 derniers mois)', 'Relevés de compte (3 mois)', 'Justificatif de domicile', 'Devis véhicule');
    v_contacte := 'Contacté' = any(v_statuts) or exists (select 1 from unnest(v_msgs) t where t ~ 'bonjour|salut|monsieur|m\.');
    v_rdv := 'RDV' = any(v_statuts) or exists (select 1 from unnest(v_msgs) t where t ~ 'rendez-vous|rdv|rencontr|agence|banque');
    v_pdocs := v_docs >= 3 or exists (select 1 from unnest(v_msgs) t where t ~ 'document|pièce|bulletin|relevé|identité');
    v_depose := 'Dossier Déposé' = any(v_statuts);
    if coalesce((p_data->>'lu')::boolean, false) then v_score := v_score + 2; end if;
    if v_contacte then v_score := v_score + 4; end if;
    if v_rdv then v_score := v_score + 4; end if;
    if v_pdocs then v_score := v_score + 4; end if;
    if v_depose then v_score := v_score + 4; end if;
    if v_docs >= 3 then v_score := v_score + 2; end if;
  end if;

  v_score := greatest(0, least(v_score, 20));
  insert into public.practical_attempts (candidate_id, epreuve, score, time_seconds, data)
  values (v_c, p_epreuve, v_score, greatest(0, least(coalesce(p_time_seconds, 0), 86400)), p_data);
  return jsonb_build_object('ok', true, 'score', v_score);
end $function$;

create or replace function public.commercial_finish_prat()
returns jsonb language plpgsql security definer set search_path to 'public' as $function$
declare v_c uuid := public.mi_commercial_id(); v_pts int; v_time int; v_theo int; v_total int; v_n int;
begin
  if v_c is null then raise exception 'Session expirée, reconnecte-toi.'; end if;
  select coalesce(sum(score), 0), coalesce(sum(time_seconds), 0), count(*) into v_pts, v_time, v_n
  from (select distinct on (epreuve) epreuve, score, time_seconds from public.practical_attempts
        where candidate_id = v_c order by epreuve, created_at) e;
  if v_n < 3 then raise exception 'Les 3 épreuves ne sont pas terminées.'; end if;
  select coalesce(score_simulation_theo, 0) into v_theo from public.commercial_candidates where id = v_c;
  v_total := round((v_theo + least(100, v_pts * 100.0 / 60)) / 2);
  update public.commercial_candidates
  set score_simulation_prat = v_pts, score_total = v_total, time_total_seconds = v_time,
      status = case when status in ('valide', 'refuse') then status else 'en_attente_validation' end,
      updated_at = now()
  where id = v_c;
  return jsonb_build_object('score_prat', v_pts, 'score_total', v_total);
end $function$;

revoke all on function public.commercial_scenarios(), public.commercial_pick_choice(uuid, text, integer), public.commercial_finish_theo(), public.commercial_submit_epreuve(integer, integer, jsonb), public.commercial_finish_prat() from public;
grant execute on function public.commercial_scenarios(), public.commercial_pick_choice(uuid, text, integer), public.commercial_finish_theo(), public.commercial_submit_epreuve(integer, integer, jsonb), public.commercial_finish_prat() to anon, authenticated;
