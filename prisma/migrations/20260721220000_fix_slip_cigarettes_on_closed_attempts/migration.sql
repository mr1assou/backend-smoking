-- Attribute slip cigarettes to the attempt they closed, not the next one.
-- Closing slips were stored with slip_cigarettes_smoked = 0 due to a
-- half-open [start, end) window that excluded loggedAt === endedAt.
UPDATE quit_attempts AS qa
SET slip_cigarettes_smoked = COALESCE(se."cigarettesCount", 0)
FROM slip_events AS se
WHERE se.closed_attempt_id = qa.attempt_id
  AND qa.ended_at IS NOT NULL
  AND COALESCE(se."cigarettesCount", 0) <> qa.slip_cigarettes_smoked;
