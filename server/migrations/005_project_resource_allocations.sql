IF OBJECT_ID('dbo.project_resources', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.project_resources (
        id INT IDENTITY(1,1) PRIMARY KEY,
        client_id INT NOT NULL,
        resource_name NVARCHAR(255) NOT NULL,
        fte DECIMAL(9,2) NULL,
        created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),

        CONSTRAINT FK_project_resources_clients
            FOREIGN KEY (client_id)
            REFERENCES dbo.clients(id)
            ON DELETE CASCADE
    );

    CREATE INDEX idx_project_resources_client_id
    ON dbo.project_resources(client_id);
END;

INSERT INTO dbo.project_resources(client_id, resource_name, fte)
SELECT c.id, LTRIM(RTRIM(c.resources)), c.fte
FROM dbo.clients c
WHERE NULLIF(LTRIM(RTRIM(c.resources)), '') IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.project_resources pr
      WHERE pr.client_id = c.id
  );
