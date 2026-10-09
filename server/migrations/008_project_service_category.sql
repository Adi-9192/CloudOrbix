IF COL_LENGTH('dbo.clients', 'service_category') IS NULL
BEGIN
    ALTER TABLE dbo.clients
    ADD service_category NVARCHAR(255) NULL;
END;
