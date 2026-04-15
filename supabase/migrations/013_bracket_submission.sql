-- ============================================================
-- Polla: Bracket submission lock
--
-- Adds a `bracket_submitted_at` timestamp to the users table so
-- a completed bracket can be "locked in" by the user before the
-- tournament-wide LOCK_DEADLINE. Once set, the client treats the
-- bracket as read-only — no further edits until an admin clears
-- the value (or the column is reset via a manual SQL update).
--
-- Nullable: NULL = still editable, non-NULL = submitted & locked.
-- ============================================================

alter table public.users
  add column if not exists bracket_submitted_at timestamptz;

comment on column public.users.bracket_submitted_at is
  'When the user pressed-and-held Submit to lock in their 104-match bracket. NULL means they can still edit. Non-NULL means the bracket is frozen.';
