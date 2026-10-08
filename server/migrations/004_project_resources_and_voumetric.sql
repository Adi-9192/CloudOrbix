IF COL_LENGTH('dbo.clients', 'resources') IS NULL
BEGIN
    ALTER TABLE dbo.clients
    ADD resources NVARCHAR(500) NULL;
END;

IF COL_LENGTH('dbo.clients', 'fte') IS NULL
BEGIN
    ALTER TABLE dbo.clients
    ADD fte DECIMAL(9,2) NULL;
END;

IF COL_LENGTH('dbo.clients', 'voumetric') IS NULL
BEGIN
    ALTER TABLE dbo.clients
    ADD voumetric INT NULL;
END;
