;WITH normalized AS (
    SELECT
        id,
        requested_date,
        UPPER(LTRIM(RTRIM(
            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                project_name, N'-', N' '), N'_', N' '), N'.', N' '), N',', N' '),
                N':', N' '), N';', N' '), N'/', N' '), N'&', N' ')
        ))) AS raw_name
    FROM dbo.rfp_projects
    WHERE rfp_code IS NULL
),
collapsed AS (
    SELECT
        id,
        requested_date,
        LTRIM(RTRIM(REPLACE(REPLACE(REPLACE(REPLACE(raw_name, N'  ', N' '), N'  ', N' '), N'  ', N' '), N'  ', N' '))) AS project_words
    FROM normalized
),
first_word AS (
    SELECT
        id,
        requested_date,
        project_words,
        LEFT(project_words, CHARINDEX(N' ', project_words + N' ') - 1) AS word_one,
        LTRIM(SUBSTRING(project_words, CHARINDEX(N' ', project_words + N' ') + 1, 255)) AS remaining_words
    FROM collapsed
),
base_codes AS (
    SELECT
        id,
        N'RFP_' +
        CASE
            WHEN remaining_words = N'' THEN LEFT(word_one, 2)
            ELSE LEFT(word_one, 1) + LEFT(remaining_words, 1)
        END + N'_' +
        RIGHT(N'0' + CONVERT(NVARCHAR(2), DAY(requested_date)), 2) +
        RIGHT(N'0' + CONVERT(NVARCHAR(2), MONTH(requested_date)), 2) +
        RIGHT(CONVERT(NVARCHAR(4), YEAR(requested_date)), 2) AS base_code
    FROM first_word
),
ranked_codes AS (
    SELECT
        id,
        base_code,
        ROW_NUMBER() OVER (PARTITION BY base_code ORDER BY id) AS duplicate_number
    FROM base_codes
)
UPDATE project
SET rfp_code = ranked.base_code +
    CASE WHEN ranked.duplicate_number = 1
        THEN N''
        ELSE N'_' + CONVERT(NVARCHAR(10), ranked.duplicate_number)
    END
FROM dbo.rfp_projects AS project
JOIN ranked_codes AS ranked ON ranked.id = project.id;

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.rfp_projects')
      AND name = N'UX_rfp_projects_rfp_code'
)
BEGIN
    CREATE UNIQUE INDEX UX_rfp_projects_rfp_code
        ON dbo.rfp_projects (rfp_code)
        WHERE rfp_code IS NOT NULL;
END;
