-- Boîte de réception commerciale : ajoute le dernier rendez-vous proposé (date, lieu, réponse)
-- A coller dans Supabase > SQL Editor (appliqué par Claude le 26/11/2026)

drop function if exists public.commercial_inbox();
create function public.commercial_inbox()
returns table(lead_id uuid, nom text, statut text, type text, montant numeric, activite text, ville text, tel text,
              score integer, last_message text, last_sender text, last_visibility text, last_at timestamptz,
              unread bigint, waiting_since timestamptz, docs_total bigint, docs_ok bigint, docs_uploaded bigint,
              created_at timestamptz, rdv_at timestamptz, rdv_lieu text, rdv_statut text, last_public_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
declare v_com uuid := public.mi_commercial_id();
begin
  if v_com is null then raise exception 'Session expirée, reconnecte-toi.'; end if;
  return query
  select l.id,
         case when l.type in ('physique', 'Personne physique')
              then trim(coalesce(l.identite->>'prenom', '') || ' ' || coalesce(l.identite->>'nom', ''))
              else coalesce(l.situation->>'raison_sociale', l.identite->>'raison_sociale', 'Entreprise') end,
         l.statut, l.type, l.montant_demande, l.activite, l.ville, l.identite->>'tel', l.score,
         m.content, m.sender, m.visibility, m.created_at,
         (select count(*) from public.messages u where u.lead_id = l.id and u.sender = 'client' and u.read_at is null),
         (select min(u.created_at) from public.messages u where u.lead_id = l.id and u.sender = 'client' and u.read_at is null),
         (select count(*) from public.documents d where d.lead_id = l.id),
         (select count(*) from public.documents d where d.lead_id = l.id and d.status = 'validated'),
         (select count(*) from public.documents d where d.lead_id = l.id and d.status = 'uploaded'),
         l.created_at,
         (r.payload->>'at')::timestamptz, r.payload->>'lieu', r.payload->>'statut',
         (select max(x.created_at) from public.messages x where x.lead_id = l.id and x.visibility = 'all')
  from public.leads l
  left join lateral (select x.content, x.sender, x.visibility, x.created_at from public.messages x
                     where x.lead_id = l.id order by x.created_at desc limit 1) m on true
  left join lateral (select x.payload from public.messages x
                     where x.lead_id = l.id and x.kind = 'rdv' order by x.created_at desc limit 1) r on true
  where l.agent_commercial_id = v_com
  order by coalesce(m.created_at, l.created_at) desc;
end $$;
revoke all on function public.commercial_inbox() from public;
grant execute on function public.commercial_inbox() to anon, authenticated;
