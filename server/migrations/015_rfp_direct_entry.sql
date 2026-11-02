IF COL_LENGTH(N'dbo.rfp_projects', N'direct_entry') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects
    ADD direct_entry BIT NOT NULL
        CONSTRAINT DF_rfp_projects_direct_entry DEFAULT 0;
END;

IF COL_LENGTH(N'dbo.rfp_projects', N'direct_budget') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects
    ADD direct_budget DECIMAL(18,2) NOT NULL
        CONSTRAINT DF_rfp_projects_direct_budget DEFAULT 0;
END;
