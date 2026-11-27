-- Pièces du dossier : valider / refuser en un clic, et ranger un fichier reçu dans la discussion
-- Autorisé à la direction (dossiers visibles) et au commercial à qui le dossier est attribué.

create or replace function public.mi_peut_gerer_pieces(p_lead_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select (public.mi_admin_id() is not null and public.mi_can_see_lead(p_lead_id))
      or (public.mi_commercial_id() is not null and exists (select 1 from public.leads where id = p_lead_id and agent_commercial_id = public.mi_commercial_id()))
$$;

-- Valider ou refuser une pièce reçue (motif obligatoire pour un refus : le client le voit)
create or replace function public.mi_piece_statut(p_doc_id uuid, p_statut text, p_note text default null) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_lead uuid;
begin
  select lead_id into v_lead from public.documents where id = p_doc_id;
  if v_lead is null then raise exception 'Pièce introuvable.'; end if;
  if not public.mi_peut_gerer_pieces(v_lead) then raise exception 'Accès refusé : reconnectez-vous.'; end if;
  if p_statut not in ('validated', 'rejected') then raise exception 'Statut invalide.'; end if;
  if p_statut = 'rejected' and length(trim(coalesce(p_note, ''))) = 0 then raise exception 'Indiquez le motif du refus.'; end if;
  update public.documents set status = p_statut, admin_note = case when p_statut = 'rejected' then left(trim(p_note), 500) else null end
  where id = p_doc_id;
  return jsonb_build_object('ok', true);
end $$;
grant execute on function public.mi_piece_statut(uuid, text, text) to anon, authenticated;

-- Ranger un fichier partagé dans la discussion comme pièce du dossier (pièce existante, ou nouvelle pièce nommée) : validée directement.
create or replace function public.mi_ranger_fichier(p_lead_id uuid, p_doc_id uuid, p_label text, p_url text, p_nom text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare v_id uuid := p_doc_id; v_ext text;
begin
  if not public.mi_peut_gerer_pieces(p_lead_id) then raise exception 'Accès refusé : reconnectez-vous.'; end if;
  -- Seuls les fichiers de ce dossier, déposés dans l'espace de stockage de la plateforme
  if p_url is null or position('/storage/v1/object/public/lead-documents/' || p_lead_id::text || '/' in p_url) = 0 then
    raise exception 'Ce fichier ne vient pas de ce dossier.';
  end if;
  if v_id is null then
    if length(trim(coalesce(p_label, ''))) = 0 then raise exception 'Nom de la pièce manquant.'; end if;
    insert into public.documents (lead_id, doc_type, doc_label, status) values (p_lead_id, 'autre', left(trim(p_label), 120), 'pending')
    on conflict (lead_id, doc_label) do nothing returning id into v_id;
    if v_id is null then select id into v_id from public.documents where lead_id = p_lead_id and doc_label = left(trim(p_label), 120); end if;
  elsif not exists (select 1 from public.documents where id = v_id and lead_id = p_lead_id) then
    raise exception 'Pièce introuvable.';
  end if;
  v_ext := lower(regexp_replace(coalesce(p_nom, ''), '^.*\.', ''));
  update public.documents set file_url = p_url, file_name = left(coalesce(nullif(trim(p_nom), ''), 'Fichier'), 200),
    mime_type = case when v_ext in ('jpg', 'jpeg') then 'image/jpeg' when v_ext = 'png' then 'image/png' when v_ext = 'webp' then 'image/webp' when v_ext = 'pdf' then 'application/pdf' else mime_type end,
    uploaded_at = now(), uploaded_by = coalesce(uploaded_by, 'client'), status = 'validated', admin_note = null
  where id = v_id;
  return jsonb_build_object('ok', true, 'doc_id', v_id);
end $$;
grant execute on function public.mi_ranger_fichier(uuid, uuid, text, text, text) to anon, authenticated;
