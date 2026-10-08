IF COL_LENGTH('dbo.clients', 'project_billing_code') IS NULL
BEGIN
    ALTER TABLE dbo.clients
    ADD project_billing_code VARCHAR(100) NULL;
END;