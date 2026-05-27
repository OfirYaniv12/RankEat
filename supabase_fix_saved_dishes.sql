-- ============================================================
-- FIX: saved_dishes.dish_id column type mismatch
-- 
-- Problem: saved_dishes.dish_id is currently UUID, but
--          dishes.id is bigint (integer). Every insert fails
--          with: "invalid input syntax for type uuid"
--
-- Run this in Supabase Dashboard → SQL Editor
-- ============================================================

-- Step 1: Drop the existing foreign key constraint on dish_id
ALTER TABLE saved_dishes DROP CONSTRAINT IF EXISTS saved_dishes_dish_id_fkey;

-- Step 2: Drop the unique constraint that includes dish_id
ALTER TABLE saved_dishes DROP CONSTRAINT IF EXISTS saved_dishes_user_id_dish_id_key;

-- Step 3: Also drop the primary key if it needs to be recreated
-- (Only needed if the PK type is wrong — usually id is uuid, leave it)

-- Step 4: Change dish_id column type from uuid to bigint
ALTER TABLE saved_dishes
  ALTER COLUMN dish_id TYPE bigint
  USING dish_id::text::bigint;

-- Step 5: Re-add the foreign key constraint pointing to dishes.id
ALTER TABLE saved_dishes
  ADD CONSTRAINT saved_dishes_dish_id_fkey
  FOREIGN KEY (dish_id) REFERENCES dishes(id) ON DELETE CASCADE;

-- Step 6: Re-add the unique constraint
ALTER TABLE saved_dishes
  ADD CONSTRAINT saved_dishes_user_id_dish_id_key
  UNIQUE (user_id, dish_id);

-- Step 7: Verify
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'saved_dishes'
ORDER BY ordinal_position;
