-- Ensure every stored username starts with @.
UPDATE users
SET username = '@' || username
WHERE username IS NOT NULL
  AND btrim(username) <> ''
  AND username NOT LIKE '@%';
