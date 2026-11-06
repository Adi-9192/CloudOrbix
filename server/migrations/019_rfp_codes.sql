IF COL_LENGTH(N'dbo.rfp_projects', N'rfp_code') IS NULL
BEGIN
    ALTER TABLE dbo.rfp_projects ADD rfp_code NVARCHAR(100) NULL;
END;
