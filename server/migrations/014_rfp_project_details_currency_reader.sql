IF COL_LENGTH(N'dbo.clients', N'currency_code') IS NULL
BEGIN
    ALTER TABLE dbo.clients
      ADD currency_code CHAR(3) NOT NULL
        CONSTRAINT DF_clients_currency_code DEFAULT 'INR';
END;

IF COL_LENGTH(N'dbo.clients', N'project_overview') IS NULL
BEGIN
    ALTER TABLE dbo.clients ADD project_overview NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH(N'dbo.clients', N'in_scope') IS NULL
BEGIN
    ALTER TABLE dbo.clients ADD in_scope NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH(N'dbo.clients', N'out_of_scope') IS NULL
BEGIN
    ALTER TABLE dbo.clients ADD out_of_scope NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH(N'dbo.clients', N'assumption') IS NULL
BEGIN
    ALTER TABLE dbo.clients ADD assumption NVARCHAR(MAX) NULL;
END;

UPDATE dbo.rfp_projects
SET working_days_per_month = 19.67
WHERE working_days_per_month <> 19.67;

;WITH calculated_costs AS (
    SELECT
        p.id AS project_id,
        SUM(
            CASE
                WHEN LOWER(r.resource_plan_type) = 'monthly'
                    THEN COALESCE(rate.daily_rate, 0) * 19.67 * COALESCE(a.fte, 0)
                WHEN LOWER(r.resource_plan_type) = 'daily'
                    THEN COALESCE(rate.daily_rate, 0) * COALESCE(r.daily_man_days, 0) * COALESCE(a.fte, 0)
                ELSE 0
            END
        ) AS base_cost_inr
    FROM dbo.rfp_projects p
    LEFT JOIN dbo.rfp_resources r ON r.project_id = p.id
    LEFT JOIN dbo.rfp_resource_monthly_allocations a ON a.resource_id = r.id
    LEFT JOIN dbo.resource_rate_card_versions rate_version ON rate_version.[year] = p.[year]
    LEFT JOIN dbo.resource_rate_cards rate
        ON rate.version_id = rate_version.id
        AND rate.grade = r.grade
        AND rate.resource_type = r.resource_type
    GROUP BY p.id
)
UPDATE cost_summary
SET
    base_cost_inr = costs.base_cost_inr,
    allowance_cost_inr = costs.base_cost_inr * project.allowance_percent / 100,
    grand_total_inr = costs.base_cost_inr * (1 + project.allowance_percent / 100),
    selected_currency_total = costs.base_cost_inr * (1 + project.allowance_percent / 100) / NULLIF(cost_summary.exchange_rate, 0),
    updated_at = SYSUTCDATETIME()
FROM dbo.rfp_cost_summary cost_summary
JOIN dbo.rfp_projects project ON project.id = cost_summary.project_id
JOIN calculated_costs costs ON costs.project_id = project.id;

EXEC sys.sp_executesql N'
    UPDATE client
    SET
        client.revenue = summary.selected_currency_total,
        client.currency_code = project.currency_code,
        client.project_overview = project.project_overview,
        client.in_scope = project.in_scope,
        client.out_of_scope = project.out_of_scope,
        client.assumption = project.assumption
    FROM dbo.clients client
    JOIN dbo.rfp_projects project ON project.id = client.rfp_project_id
    JOIN dbo.rfp_cost_summary summary ON summary.project_id = project.id;
';

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_rfp_projects_fixed_working_days_per_month'
)
BEGIN
    ALTER TABLE dbo.rfp_projects
      ADD CONSTRAINT CK_rfp_projects_fixed_working_days_per_month
      CHECK (working_days_per_month = 19.67);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.roles WHERE name = 'Reader')
BEGIN
    INSERT INTO dbo.roles(name, description)
    VALUES ('Reader', 'Read-only access to the Portfolio page only');
END;
