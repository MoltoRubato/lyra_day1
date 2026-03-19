DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'ColumnType'
      AND e.enumlabel = 'USER'
  ) THEN
    ALTER TYPE "ColumnType" ADD VALUE 'USER';
  END IF;
END $$;
