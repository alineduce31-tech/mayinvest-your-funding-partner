-- Retour arrière de l'étape 2 (à n'utiliser qu'en cas de panne) : remet les anciennes règles ouvertes.
do $$
declare r record;
begin
  for r in select schemaname, tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('leads','messages','documents','commercial_candidates','commercial_chats','quiz_attempts','simulation_attempts','practical_attempts','haki_events','report_logs','banques','bancarisation_suivi','packs_vendus')
  loop execute format('drop policy %I on %I.%I', r.policyname, r.schemaname, r.tablename); end loop;
end $$;
drop trigger if exists trg_guard_candidate_update on public.commercial_candidates;
create policy bancarisation_authenticated_all on public.bancarisation_suivi as PERMISSIVE for ALL to public using ((auth.uid() IS NOT NULL)) with check ((auth.uid() IS NOT NULL));
create policy banques_authenticated_read on public.banques as PERMISSIVE for SELECT to public using ((auth.uid() IS NOT NULL));
create policy banques_authenticated_write on public.banques as PERMISSIVE for ALL to public using ((auth.uid() IS NOT NULL)) with check ((auth.uid() IS NOT NULL));
create policy anon_insert_candidate on public.commercial_candidates as PERMISSIVE for INSERT to anon with check (true);
create policy anon_read_candidates on public.commercial_candidates as PERMISSIVE for SELECT to anon using (true);
create policy anon_update_own_candidate on public.commercial_candidates as PERMISSIVE for UPDATE to anon using (true) with check (true);
create policy anon_insert_chats on public.commercial_chats as PERMISSIVE for INSERT to anon with check (true);
create policy anon_read_chats on public.commercial_chats as PERMISSIVE for SELECT to anon using (true);
create policy anon_update_chats on public.commercial_chats as PERMISSIVE for UPDATE to anon using (true) with check (true);
create policy admin_all_documents on public.documents as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy anon_insert_documents on public.documents as PERMISSIVE for INSERT to anon with check ((uploaded_by = 'client'::text));
create policy anon_select_documents on public.documents as PERMISSIVE for SELECT to anon using (true);
create policy anon_update_documents on public.documents as PERMISSIVE for UPDATE to anon using ((uploaded_by = 'client'::text));
create policy anon_insert_haki_events on public.haki_events as PERMISSIVE for INSERT to anon with check (true);
create policy anon_select_haki_events_admin on public.haki_events as PERMISSIVE for SELECT to anon using (true);
create policy "Directors see all leads" on public.leads as PERMISSIVE for SELECT to anon, authenticated using (true);
create policy admin_all_leads on public.leads as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy anon_insert_leads on public.leads as PERMISSIVE for INSERT to anon with check ((statut = 'Nouveau'::text));
create policy leads_authenticated_all on public.leads as PERMISSIVE for ALL to public using ((auth.uid() IS NOT NULL)) with check ((auth.uid() IS NOT NULL));
create policy admin_all_msgs on public.messages as PERMISSIVE for ALL to authenticated using (true) with check (true);
create policy anon_insert_client_msg on public.messages as PERMISSIVE for INSERT to anon with check ((sender = 'client'::text));
create policy anon_read_msgs on public.messages as PERMISSIVE for SELECT to anon using (true);
create policy packs_authenticated_all on public.packs_vendus as PERMISSIVE for ALL to public using ((auth.uid() IS NOT NULL)) with check ((auth.uid() IS NOT NULL));
create policy anon_insert_practical_attempt on public.practical_attempts as PERMISSIVE for INSERT to anon with check (true);
create policy anon_read_practical_attempts on public.practical_attempts as PERMISSIVE for SELECT to anon using (true);
create policy anon_insert_quiz_attempt on public.quiz_attempts as PERMISSIVE for INSERT to anon with check (true);
create policy anon_read_quiz_attempts on public.quiz_attempts as PERMISSIVE for SELECT to anon using (true);
create policy admins_read_reports on public.report_logs as PERMISSIVE for SELECT to public using (true);
create policy anon_insert_sim_attempt on public.simulation_attempts as PERMISSIVE for INSERT to anon with check (true);
create policy anon_read_sim_attempts on public.simulation_attempts as PERMISSIVE for SELECT to anon using (true);
