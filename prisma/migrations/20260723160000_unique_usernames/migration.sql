-- Make usernames unique. Resolve any existing duplicates first.
WITH ranked AS (
  SELECT
    user_id,
    ROW_NUMBER() OVER (PARTITION BY username ORDER BY user_id ASC) AS rn
  FROM users
  WHERE username IS NOT NULL
    AND btrim(username) <> ''
)
UPDATE users AS u
SET username = '@user' || u.user_id::text
FROM ranked AS r
WHERE u.user_id = r.user_id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "users_username_key" ON "users"("username");
