-- Rapports automatiques : la cle est lue dans le coffre Supabase (Vault, secret "mi_cron_key")
-- au lieu d'etre ecrite en clair dans les taches. Deja applique par Claude le 26/11/2026.
select cron.alter_job(j.jobid, command := format($cmd$
  SELECT net.http_post(
    url := %L,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'mi_cron_key')
    ),
    body := '{}'::jsonb
  );
$cmd$, 'https://uhlohqngavpmdcvujytt.supabase.co/functions/v1/' || f.slug))
from cron.job j
join (values ('mayinvest-weekly-leads','report-weekly-leads'),
             ('mayinvest-monthly-bancarisation','report-monthly-bancarisation'),
             ('mayinvest-monthly-banks','report-monthly-banks')) f(job, slug) on f.job = j.jobname;
