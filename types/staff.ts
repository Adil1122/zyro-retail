export interface StaffQuickProfile {
  id: string;
  name: string;
  short: string;
  role: string;
  ini: string;
  bg: string;
  fg: string;
}

export interface EmployeeRecord {
  id: string;
  code: string;
  name: string;
  job: string;
  login: string;
  salary: number;
  rev: number;
  active: boolean;
  phone?: string;
  pin?: string;
  roleId?: 'owner' | 'cashier' | 'inventory' | 'manager';
}

export interface SalaryAdvance {
  id: string;
  emp: string;
  amt: number;
  rec: number;
  d: number;
  note?: string;
}

// [employeeId, paidDays, allowance, bonus, overtime, reduction, advanceRecovery, paidInCash]
export type PayrollLineTuple = [string, number, number, number, number, number, number, number];

export interface PayrollRun {
  period: string; // YYYY-MM
  days: number;
  status: 'draft' | 'posted';
  lines: PayrollLineTuple[];
}
