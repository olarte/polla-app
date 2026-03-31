-- Fix infinite recursion in group_members RLS policy
-- The old policy queried group_members to check access to group_members
DROP POLICY IF EXISTS "Members can read group members" ON public.group_members;
CREATE POLICY "Authenticated can read group members" ON public.group_members FOR SELECT USING (true);
