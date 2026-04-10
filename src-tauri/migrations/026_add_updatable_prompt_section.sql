-- Add updatable_prompt_section column to agents table
-- This column stores the learned/updated section of an agent's system prompt
-- that can be automatically refined by background tasks based on conversation learnings
ALTER TABLE agents ADD COLUMN updatable_prompt_section TEXT;
