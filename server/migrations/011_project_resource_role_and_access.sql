IF COL_LENGTH('dbo.project_resources', 'role_for_project') IS NULL
BEGIN
    ALTER TABLE dbo.project_resources
    ADD role_for_project NVARCHAR(255) NULL;
END;

IF COL_LENGTH('dbo.project_resources', 'infrastructure_access') IS NULL
BEGIN
    ALTER TABLE dbo.project_resources
    ADD infrastructure_access BIT NOT NULL
        CONSTRAINT DF_project_resources_infrastructure_access DEFAULT (0) WITH VALUES;
END;
