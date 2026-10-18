export interface AuditReport {
  id: string;
  auditor: string;
  date: string;
  scope: string;
  link: string;
}

export const auditReports: AuditReport[] = [
  {
    id: "audit-1",
    auditor: "OtterSec",
    date: "2025-03-15",
    scope: "Soroban Smart Contracts",
    link: "https://github.com/AgesEmpire/StellarSwipe-FrontEnd/security/audits/ottersec-2025-03.pdf",
  },
  {
    id: "audit-2",
    auditor: "Kudelski Security",
    date: "2025-01-10",
    scope: "Bridge Ingestion & Horizon Integration",
    link: "https://github.com/AgesEmpire/StellarSwipe-FrontEnd/security/audits/kudelski-2025-01.pdf",
  },
];
