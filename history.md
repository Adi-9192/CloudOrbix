# Project History

## 2026-10-07

### Status list update
- Updated the project status options to the requested list in `src/components/Clients.tsx`:
  - `On-track`
  - `ON Hold`
  - `Delayed`
  - `Completed`
  - `Cancelled`
- Set the default project status to `On-track` for newly created projects.
- Kept status styling compatibility in place for legacy values to avoid UI regressions.

### Branch created
- Created feature branch: `status-options-history`

### Notes
- This repository already had other unrelated local modifications present before this task. Only the project status update and this history log were included in the commit.

## 2026-10-08

### Excel import status normalization
- Normalized imported Excel `Current Status` values before inserting or updating client records.
- Mapped accepted Excel status variations to the app's canonical status set: `On-track`, `ON Hold`, `Delayed`, `Completed`, and `Cancelled`.
- Added the same normalization in the client API so existing DB values render correctly even if legacy statuses were imported previously.

### Manager project edit authorization
- Fixed manager project edits failing with “You are not authorized to edit this client.”
- The backend had an assignment-name check that rejected Managers when their account/project manager name did not exactly match the stored assignment, even though the project UI permits Managers to edit.
- Updated project edit authorization to allow the Manager role to submit edits for administrator approval; Admin and Operations Team edit access remains unchanged, and Viewer access remains denied.
- Added regression coverage for Manager, Viewer, and Operations Team edit permissions.
