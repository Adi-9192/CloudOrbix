IF COL_LENGTH(N'dbo.clients', N'phase') IS NULL
BEGIN
    ALTER TABLE dbo.clients ADD phase NVARCHAR(100) NULL;
END;

UPDATE dbo.clients
SET current_status = CASE
    WHEN LOWER(LTRIM(RTRIM(current_status))) IN (N'canceled', N'cancelled') THEN N'Cancelled'
    WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(LTRIM(RTRIM(current_status))), N'(', N''), N')', N''), N' ', N''), N'-', N''), N'_', N'') IN
         (N'delayedexternal', N'offtrackexternal') THEN N'Off Track (External)'
    WHEN REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(LOWER(LTRIM(RTRIM(current_status))), N'(', N''), N')', N''), N' ', N''), N'-', N''), N'_', N'') IN
         (N'delayedinternal', N'offtrackinternal') THEN N'Off Track (Internal)'
    WHEN LOWER(LTRIM(RTRIM(current_status))) IN
         (N'completed', N'finished', N'closed') THEN N'Completed'
    WHEN LOWER(LTRIM(RTRIM(current_status))) IN (N'on hold', N'hold') THEN N'On Hold'
    WHEN LOWER(LTRIM(RTRIM(current_status))) IN (N'at risk', N'delayed', N'awaiting approval',
         N'awaiting sign off', N'scope finalisation') THEN N'At Risk'
    WHEN LOWER(LTRIM(RTRIM(current_status))) IN (N'on track', N'in progress', N'onboarded',
         N'pending onboarding') THEN N'On Track'
    ELSE N'On Track'
END;
