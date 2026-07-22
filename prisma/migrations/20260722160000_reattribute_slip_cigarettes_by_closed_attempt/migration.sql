-- Re-attribute slip cigarettes to the attempt they closed (closed_attempt_id).
-- Active attempts must show 0; closed attempts get only their closing slip count.
UPDATE quit_attempts AS qa
SET slip_cigarettes_smoked = COALESCE(se."cigarettesCount", 0)
FROM slip_events AS se
WHERE se.closed_attempt_id = qa.attempt_id
  AND qa.ended_at IS NOT NULL;

UPDATE quit_attempts
SET slip_cigarettes_smoked = 0
WHERE ended_at IS NULL
  AND slip_cigarettes_smoked <> 0;
