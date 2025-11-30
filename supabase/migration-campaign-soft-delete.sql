-- Migration: Add soft delete support for campaigns
-- This migration adds 'deleted' status to campaigns and updates RLS policies

-- Step 1: Drop and recreate the status constraint to include 'deleted'
ALTER TABLE campaigns 
DROP CONSTRAINT IF EXISTS campaigns_status_check;

ALTER TABLE campaigns 
ADD CONSTRAINT campaigns_status_check 
CHECK (status IN ('draft', 'active', 'closed', 'completed', 'deleted'));

-- Step 2: Drop the old delete policy that only allowed deleting drafts
DROP POLICY IF EXISTS "Organizers can delete own draft campaigns" ON campaigns;

-- Step 3: Create new policy allowing organizers to update status to 'deleted' for any of their campaigns
-- (We use UPDATE instead of DELETE since we're doing soft delete)
-- The existing update policy already allows organizers to update their own campaigns

-- Step 4: Update the public viewing policy to exclude deleted campaigns
DROP POLICY IF EXISTS "Public can view active campaigns" ON campaigns;

CREATE POLICY "Public can view active campaigns"
  ON campaigns FOR SELECT
  USING (status IN ('active', 'closed'));

-- Step 5: Create index for deleted campaigns queries
CREATE INDEX IF NOT EXISTS idx_campaigns_deleted ON campaigns(organizer_id) WHERE status = 'deleted';

-- Step 6: Add deleted_at timestamp for tracking when campaign was deleted
ALTER TABLE campaigns 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Step 7: Create index on deleted_at for efficient queries
CREATE INDEX IF NOT EXISTS idx_campaigns_deleted_at ON campaigns(deleted_at) WHERE deleted_at IS NOT NULL;


