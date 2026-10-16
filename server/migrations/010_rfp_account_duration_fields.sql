IF COL_LENGTH(N'dbo.rfp_projects', N'project_type') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD project_type NVARCHAR(20) NULL;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'project_status') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects
    ADD project_status NVARCHAR(30) NOT NULL CONSTRAINT DF_rfp_projects_project_status DEFAULT N'Tentative';
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'request_from_by') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD request_from_by NVARCHAR(255) NULL;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'requestor_email') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD requestor_email NVARCHAR(255) NULL;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'requested_date') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects
    ADD requested_date DATE NOT NULL CONSTRAINT DF_rfp_projects_requested_date DEFAULT CONVERT(date, SYSUTCDATETIME());
    UPDATE dbo.rfp_projects SET requested_date = start_month;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'region') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD region NVARCHAR(100) NULL;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'cloud') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD cloud NVARCHAR(20) NULL;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'project_overview') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD project_overview NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'assumption') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD assumption NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'out_of_scope') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD out_of_scope NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'in_scope') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD in_scope NVARCHAR(MAX) NULL;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'duration_months') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects
    ADD duration_months INT NOT NULL CONSTRAINT DF_rfp_projects_duration_months DEFAULT 1;
    UPDATE dbo.rfp_projects
    SET duration_months = CASE
        WHEN end_month_half_month = 1 AND DATEDIFF(month, start_month, end_month) > 0 THEN DATEDIFF(month, start_month, end_month)
        WHEN end_month_half_month = 1 THEN 0
        ELSE CASE WHEN DATEDIFF(month, start_month, end_month) + 1 > 0 THEN DATEDIFF(month, start_month, end_month) + 1 ELSE 1 END
    END;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'duration_days') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects
    ADD duration_days INT NOT NULL CONSTRAINT DF_rfp_projects_duration_days DEFAULT 0;
    UPDATE dbo.rfp_projects SET duration_days = CASE WHEN end_month_half_month = 1 THEN 15 ELSE 0 END;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'initiated_at') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD initiated_at DATETIME2 NULL;
END;
