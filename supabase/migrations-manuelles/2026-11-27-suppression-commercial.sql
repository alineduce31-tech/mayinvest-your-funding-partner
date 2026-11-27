-- Suppression définitive d'un commercial (direction uniquement).
-- Ses dossiers ne sont pas supprimés : ils repassent « Sans conseiller ».
-- Ses épreuves, son fil avec la direction, ses rappels et ses sessions sont supprimés.
create or replace function public.admin_delete_commercial(p_commercial_id uuid)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare v_n int; v_nom text;
begin
  perform public.mi_require_admin(true);
  select trim(coalesce(prenom, '') || ' ' || coalesce(nom, '')) into v_nom from public.commercial_candidates where id = p_commercial_id;
  if v_nom is null then raise exception 'Commercial introuvable.'; end if;
  update public.leads set agent_commercial_id = null where agent_commercial_id = p_commercial_id;
  get diagnostics v_n = row_count;
  update public.leads set agent_id = null where agent_id = p_commercial_id;
  delete from public.lead_rappels where commercial_id = p_commercial_id;
  delete from public.app_sessions where kind = 'commercial' and subject_id = p_commercial_id;
  delete from public.commercial_candidates where id = p_commercial_id;
  return jsonb_build_object('supprime', true, 'nom', v_nom, 'dossiers_liberes', v_n);
end $$;
revoke all on function public.admin_delete_commercial(uuid) from public;
grant execute on function public.admin_delete_commercial(uuid) to anon, authenticated;
