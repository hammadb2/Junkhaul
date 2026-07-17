# Manual Admin Acceptance Checklist

Date: 2026-07-17

Environment: approved Supabase environment with local rebuilt Next.js production server during verification.

No customer-sensitive screenshots were committed.

| Check | Result | Evidence |
| --- | --- | --- |
| Owner/staff auth route available | Passed | `/api/admin/login` supports staff email/password and sets staff session plus admin shell cookie. |
| Employee blocked from admin action | Passed | Integration test asserts employee receives `403` on Booking Detail action. |
| Owner-only route denial for admin/manager/employee | Passed | Integration test asserts admin, manager and employee receive `403` on payroll approval. |
| Runtime migration endpoint disabled | Passed | Integration test asserts owner receives `410`. |
| Booking Detail action succeeds | Passed | Integration test writes manager-scoped internal note and verifies timeline event. |
| Booking scope denial understandable | Passed | Integration test asserts active deny manager scope returns `403`. |
| Lead Detail action succeeds | Passed | Integration test adds a lead to waitlist and merges a duplicate lead while preserving message history. |
| Campaign created | Passed | Integration test creates campaign and tracking code. |
| Duplicate tracking code rejected | Passed | Integration test asserts duplicate code returns `409`. |
| Communications displayed | Passed | Integration test reads communications dashboard messages. |
| Donation reviewed/uploaded | Passed | Integration test covers donation draft, private upload, replace, remove and submit. |
| Manager dashboard scoped correctly | Passed | Integration test verifies manager scoped context, deny/expiry behavior and daily closeout persistence. |
| Audit viewer shows actions | Passed | Integration test reads `/api/admin/audit-events`; audit viewer renders redacted audit records. |
| Permission-denied UI/API behavior | Passed | APIs return `401` unauthenticated and `403` authenticated unauthorized; admin components surface action errors. |
| Sensitive data leaks in tested responses | Passed | Audit viewer route redacts sensitive keys; sensitive employee routes were already covered by previous operational tests. |

Remaining manual UX polish:

- Booking Detail actions are available through a JSON action payload control, not polished per-action forms.
- Staff Access and Manager Dashboard have functional controls but should receive design polish after merge.
- Full production-browser acceptance should be repeated after deployment with real owner/admin/manager accounts and no test fixtures.
