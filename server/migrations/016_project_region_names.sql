UPDATE dbo.clients
SET region = CASE
    WHEN UPPER(LTRIM(RTRIM(region))) = 'NORTH AMERICA' THEN 'America'
    WHEN UPPER(LTRIM(RTRIM(region))) = 'APAC' THEN 'Asia Pacific'
END
WHERE UPPER(LTRIM(RTRIM(region))) IN ('NORTH AMERICA', 'APAC');

UPDATE dbo.rfp_projects
SET region = CASE
    WHEN UPPER(LTRIM(RTRIM(region))) = 'NORTH AMERICA' THEN 'America'
    WHEN UPPER(LTRIM(RTRIM(region))) = 'APAC' THEN 'Asia Pacific'
END
WHERE UPPER(LTRIM(RTRIM(region))) IN ('NORTH AMERICA', 'APAC');

UPDATE dbo.clients
SET pending_payload = JSON_MODIFY(
    pending_payload,
    '$.region',
    CASE
        WHEN UPPER(LTRIM(RTRIM(JSON_VALUE(pending_payload, '$.region')))) = 'NORTH AMERICA' THEN 'America'
        WHEN UPPER(LTRIM(RTRIM(JSON_VALUE(pending_payload, '$.region')))) = 'APAC' THEN 'Asia Pacific'
    END
)
WHERE ISJSON(pending_payload) = 1
  AND UPPER(LTRIM(RTRIM(JSON_VALUE(pending_payload, '$.region')))) IN ('NORTH AMERICA', 'APAC');
