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

### Approval requester details and notifications
- Displayed the requesting Manager's name and email on each Admin approval record.
- Sent active Admin users a notification when a project approval request is submitted, including the requester's name, email, and project identifier.
- Sent the requesting user a notification when the request is approved or rejected, including the decision-maker's name.
- Persisted notifications in Azure SQL and added migration `server/migrations/006_approval_notifications.sql`; the notification center now displays the notification message and refreshes when opened.
- Fixed requests failing when `dbo.notifications` had not yet been created by ensuring the table and its lookup index exist before notification reads and writes.

### Project risk status and Excel export
- Replaced risk status options (`Open`, `Closed`, `On Hold`) with the shared project statuses: `On-track`, `ON Hold`, `Delayed`, `Completed`, and `Cancelled`.
- Normalized legacy risk statuses when loading risk records and reject unsupported status values in the risk API.
- Added formatted `.xlsx` downloads for both the global Risk Register and each project's Risk details, with consistent headers, filtering, and a frozen header row.

### Dashboard metrics and refresh
- Corrected Delayed Projects to count approved projects whose status is Delayed (including legacy Blocked values), not every project with a past estimated end date.
- Reconciled project totals, active/completed/delayed counts, revenue, completion, and risk KPIs to approved project records and the current status model.
- Corrected service adoption, regional, trend, and upcoming-activity queries to exclude pending project records; chart trends now group by the selected period and include both onboarding and offboarding.
- Refreshed dashboard data when revisited, when the browser regains focus, and every 30 seconds; replaced the hard-coded last-updated timestamp and exposed load errors.

### Project repository synchronization
- Changed the repository from completed-only to all approved projects so newly added projects appear after approval.
- Returned project manager/account manager, region, year, hyperscaler, status, completion, update time, and document count for each repository record.
- Allowed approved projects to open their associated documents from the repository and refreshed repository data on focus, every 30 seconds, or manually.
