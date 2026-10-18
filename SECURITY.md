# Security Policy

## Supported Versions

StellarSwipe-FrontEnd ships continuously from the `main` branch — there are no
maintained release branches. Only the latest commit on `main` (what's
deployed in production) is supported with security fixes.

| Version         | Supported          |
| --------------- | ------------------- |
| `main` (latest) | :white_check_mark:  |
| older commits   | :x:                 |

## Reporting a Vulnerability

**Please do not open a public GitHub issue for security vulnerabilities.**

Report suspected vulnerabilities privately using GitHub's private
vulnerability reporting, via the **Security** tab on this repository, or
directly at:

<https://github.com/AgesEmpire/StellarSwipe-FrontEnd/security/advisories/new>

This is the same private-report channel referenced by the app's in-app
[Responsible Disclosure program](app/security/page.tsx) (see
[`content/security.ts`](content/security.ts) for the full scope and
reward-tier review process). When reporting, please include:

- A clear summary and the affected route, component, or contract call
- Reproducible steps and, where relevant, a proof-of-concept payload
- The impact you believe the issue has (e.g. wallet/funds risk, account
  takeover, data exposure)
- Screenshots or logs if useful

In scope: authentication and session handling, wallet connection and
transaction-signing flows, signal/portfolio/subscription/webhook data access,
and XSS/injection/authorization bypasses. Full scope and reward-tier
criteria are documented at `/security` in the app and in
[`content/security.ts`](content/security.ts).

### What to expect

- **Acknowledgement:** within 3 business days of your report.
- **Triage:** we will confirm whether the report is in scope and its
  severity within 7 business days.
- **Resolution:** timelines vary with severity and complexity; we will keep
  you updated as we work on a fix.

### Disclosure policy

We follow coordinated disclosure. Please give us a reasonable window to
investigate and remediate a confirmed issue before any public disclosure.
We'll credit reporters (unless you prefer to remain anonymous) once a fix
ships.
