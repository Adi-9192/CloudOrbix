UPDATE dbo.audit_logs
SET action = REPLACE(action, N'Client', N'Project')
WHERE action LIKE N'%Client%';
