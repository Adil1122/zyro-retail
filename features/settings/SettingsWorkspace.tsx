'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Building2,
  ExternalLink,
  Globe,
  Monitor,
  Plus,
  Printer,
  Receipt as ReceiptIcon,
  RefreshCw,
  Shield,
  Store,
  WifiOff,
} from 'lucide-react';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';
import { Receipt } from '@/components/domain/Receipt';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { KITS } from '@/constants/kits';
import { ROLE_DEFINITIONS } from '@/constants/navigation';
import { useZyro } from '@/hooks/useZyro';
import { formatPhone, isValidPkPhone } from '@/lib/format';
import type { EmployeeRecord, FbrMode, ShopKitId } from '@/types';

type SectionId = 'shop' | 'staff' | 'device' | 'printer' | 'receipt' | 'fbr' | 'lang' | 'conn';

const SECTIONS: Array<{ id: SectionId; label: string; icon: React.ReactNode }> = [
  { id: 'shop', label: 'Shop & kit', icon: <Store className="w-4 h-4" /> },
  { id: 'staff', label: 'Permissions', icon: <Shield className="w-4 h-4" /> },
  { id: 'device', label: 'Branch & counter', icon: <Monitor className="w-4 h-4" /> },
  { id: 'printer', label: 'Receipt printer', icon: <Printer className="w-4 h-4" /> },
  { id: 'receipt', label: 'Receipt layout', icon: <ReceiptIcon className="w-4 h-4" /> },
  { id: 'fbr', label: 'FBR POS tax', icon: <Building2 className="w-4 h-4" /> },
  { id: 'lang', label: 'Language', icon: <Globe className="w-4 h-4" /> },
  { id: 'conn', label: 'Offline & demo', icon: <WifiOff className="w-4 h-4" /> },
];

export function SettingsWorkspace() {
  const {
    state,
    settings,
    kit,
    updateSettings,
    setKit,
    setBranch,
    addEmployee,
    updateEmployeePin,
    resetDemoState,
    notify,
  } = useZyro();

  const [section, setSection] = useState<SectionId>('shop');
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [addStaffOpen, setAddStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffPhone, setStaffPhone] = useState('');
  const [staffRole, setStaffRole] = useState<NonNullable<EmployeeRecord['roleId']>>('cashier');
  const [staffPin, setStaffPin] = useState('');
  const [staffSalary, setStaffSalary] = useState('30000');
  const [editingPinId, setEditingPinId] = useState<string | null>(null);
  const [pinDraft, setPinDraft] = useState('');

  const sampleBill = state.bills[0];

  const handleAddStaff = () => {
    if (!staffName.trim()) {
      notify('Enter staff member name', 'warn');
      return;
    }
    if (!isValidPkPhone(staffPhone)) {
      notify('Enter an 11-digit Pakistani mobile number (03XX)', 'warn');
      return;
    }
    if (!/^\d{4}$/.test(staffPin)) {
      notify('Enter a 4-digit counter PIN', 'warn');
      return;
    }
    const roleLabel =
      staffRole === 'inventory'
        ? 'Stockkeeper'
        : staffRole === 'manager'
          ? 'Floor manager'
          : 'Cashier';
    const prefix = staffName.trim().slice(0, 3).toUpperCase().replace(/[^A-Z]/g, 'S');
    const code = `${prefix || 'STF'}-${String(state.employees.length + 1).padStart(2, '0')}`;
    addEmployee({
      id: `e-${Date.now()}`,
      code,
      name: staffName.trim(),
      job: roleLabel,
      login:
        staffRole === 'manager'
          ? 'Manager override PIN'
          : staffRole === 'inventory'
            ? 'Stockkeeper login'
            : 'Cashier login',
      salary: Math.max(0, parseInt(staffSalary, 10) || 30000),
      rev: 0,
      active: true,
      phone: staffPhone.replace(/\D/g, ''),
      pin: staffPin,
      roleId: staffRole,
    });
    notify(`Invited ${staffName.trim()} (${code}) · PIN ${staffPin}`, 'ok');
    setStaffName('');
    setStaffPhone('');
    setStaffPin('');
    setStaffSalary('30000');
    setAddStaffOpen(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Owner configuration"
        title="Settings"
        subtitle="Configure shop profile, thermal printer, FBR POS ID, language, and offline mode."
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Section selector */}
        <div className="lg:col-span-3">
          <Card padding="sm" className="flex lg:flex-col gap-1 overflow-x-auto">
            {SECTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setSection(s.id)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-[13px] font-semibold whitespace-nowrap transition-colors ${
                  section === s.id
                    ? 'bg-[#08343A] text-white'
                    : 'text-[#3D5357] hover:bg-[#F1EBE3]'
                }`}
              >
                {s.icon}
                <span>{s.label}</span>
              </button>
            ))}
          </Card>
        </div>

        {/* Section body */}
        <div className="lg:col-span-9">
          {section === 'shop' && (
            <Card className="space-y-4">
              <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">
                Shop details &amp; retail kit
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Shop name"
                  value={settings.shopName}
                  onChange={(e) => updateSettings({ shopName: e.target.value })}
                />
                <Input
                  label="Phone number"
                  value={settings.phone}
                  onChange={(e) => updateSettings({ phone: e.target.value })}
                />
                <Input
                  label="Street address"
                  value={settings.address}
                  onChange={(e) => updateSettings({ address: e.target.value })}
                />
                <Input
                  label="City"
                  value={settings.city}
                  onChange={(e) => updateSettings({ city: e.target.value })}
                />
              </div>

              <div className="pt-2 border-t border-[#F1EBE3] space-y-2">
                <Select
                  label="Active retail business kit"
                  value={kit}
                  onChange={(e) => {
                    const next = e.target.value as ShopKitId;
                    setKit(next);
                    notify(`Switched demo shop kit to ${KITS.find((k) => k.id === next)?.name}`, 'ok');
                  }}
                  options={KITS.map((k) => ({ value: k.id, label: `${k.name} — ${k.sub}` }))}
                />
              </div>
            </Card>
          )}

          {section === 'staff' && (
            <Card className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">
                  Counter rules &amp; staff permissions
                </h2>
                <Button variant="primary" size="sm" onClick={() => setAddStaffOpen(true)}>
                  <Plus className="w-4 h-4" /> Add staff by mobile
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Cashier max discount (%)"
                  type="number"
                  value={String(settings.cashierMaxDiscountPct)}
                  onChange={(e) =>
                    updateSettings({ cashierMaxDiscountPct: Math.max(0, parseInt(e.target.value, 10) || 0) })
                  }
                />
                <label className="flex items-center gap-3 p-3 rounded-[10px] border border-[#E7E0D7] bg-[#FBF8F4] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.requireManagerForNoBillReturn}
                    onChange={(e) =>
                      updateSettings({ requireManagerForNoBillReturn: e.target.checked })
                    }
                    className="w-4 h-4 accent-[#08343A]"
                  />
                  <span className="text-[13px] font-medium text-[#0B2A2F]">
                    Require Manager PIN for returns without bill
                  </span>
                </label>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#F1EBE3]">
                <div className="text-[12px] font-semibold uppercase tracking-wider text-[#52666A]">
                  Staff logins &amp; counter PINs
                </div>
                {state.employees.map((emp) => (
                  <div
                    key={emp.id}
                    className="p-3 rounded-[10px] bg-[#FBF8F4] border border-[#E7E0D7] flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-[14px] text-[#0B2A2F]">
                        {emp.name}{' '}
                        <span className="text-[12px] font-normal text-[#52666A]">· {emp.job}</span>
                      </div>
                      <div className="text-[12px] text-[#52666A] mono">
                        {emp.code} · {emp.phone ? formatPhone(emp.phone) : 'No phone'}
                      </div>
                    </div>
                    {editingPinId === emp.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          maxLength={4}
                          value={pinDraft}
                          onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, ''))}
                          placeholder="4-digit PIN"
                          className="w-24 h-8 px-2 rounded-[8px] border border-[#D6CDC1] bg-white text-[13px] mono"
                        />
                        <Button
                          size="sm"
                          variant="primary"
                          onClick={() => {
                            if (!/^\d{4}$/.test(pinDraft)) {
                              notify('PIN must be 4 digits', 'warn');
                              return;
                            }
                            updateEmployeePin(emp.id, pinDraft);
                            notify(`Updated counter PIN for ${emp.name}`, 'ok');
                            setEditingPinId(null);
                            setPinDraft('');
                          }}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setEditingPinId(null);
                            setPinDraft('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Badge tone="neutral">PIN {emp.pin || '1234'}</Badge>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setEditingPinId(emp.id);
                            setPinDraft(emp.pin || '1234');
                          }}
                        >
                          Change PIN
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-2 pt-2">
                {ROLE_DEFINITIONS.map((r) => (
                  <div key={r.id} className="p-3 rounded-[10px] bg-[#FBF8F4] border border-[#E7E0D7]">
                    <div className="font-bold text-[14px] text-[#0B2A2F]">{r.name}</div>
                    <div className="text-[12px] text-[#52666A]">{r.can}</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {section === 'device' && (
            <Card className="space-y-4">
              <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">
                Active branch &amp; register
              </h2>
              <Select
                label="Branch on this device"
                value={state.session.branchId}
                onChange={(e) => {
                  setBranch(e.target.value);
                  notify('Switched active branch', 'ok');
                }}
                options={state.session.branches.map((b) => ({
                  value: b.id,
                  label: `${b.name} · ${b.city}`,
                }))}
              />
            </Card>
          )}

          {section === 'printer' && (
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">
                  Thermal receipt printer
                </h2>
                <Badge tone={settings.printer.status === 'connected' ? 'ok' : 'err'}>
                  {settings.printer.status}
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Printer device"
                  value={settings.printer.name}
                  onChange={(e) =>
                    updateSettings({ printer: { ...settings.printer, name: e.target.value } })
                  }
                />
                <Select
                  label="Paper roll width"
                  value={settings.printer.paperWidth}
                  onChange={(e) =>
                    updateSettings({
                      printer: { ...settings.printer, paperWidth: e.target.value as '80mm' | '58mm' },
                    })
                  }
                  options={[
                    { value: '80mm', label: '80 mm thermal' },
                    { value: '58mm', label: '58 mm compact' },
                  ]}
                />
                <Input
                  label="Receipt copies"
                  type="number"
                  min={1}
                  max={3}
                  value={String(settings.printer.copies)}
                  onChange={(e) =>
                    updateSettings({
                      printer: {
                        ...settings.printer,
                        copies: Math.min(3, Math.max(1, parseInt(e.target.value, 10) || 1)),
                      },
                    })
                  }
                />
              </div>
              <div className="flex flex-wrap gap-3">
                <label className="flex items-center gap-2 text-[13px] font-medium">
                  <input
                    type="checkbox"
                    checked={settings.printer.autoPrint}
                    onChange={(e) =>
                      updateSettings({
                        printer: { ...settings.printer, autoPrint: e.target.checked },
                      })
                    }
                    className="w-4 h-4 accent-[#08343A]"
                  />
                  Auto-print receipt on payment
                </label>
                <label className="flex items-center gap-2 text-[13px] font-medium">
                  <input
                    type="checkbox"
                    checked={settings.printer.openDrawerOnCash}
                    onChange={(e) =>
                      updateSettings({
                        printer: { ...settings.printer, openDrawerOnCash: e.target.checked },
                      })
                    }
                    className="w-4 h-4 accent-[#08343A]"
                  />
                  Kick cash drawer on cash tender
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => notify('Test slip sent to printer', 'ok')}>
                  Print test page
                </Button>
                <Button
                  variant="ghost"
                  onClick={() =>
                    updateSettings({
                      printer: {
                        ...settings.printer,
                        status: settings.printer.status === 'connected' ? 'error' : 'connected',
                      },
                    })
                  }
                >
                  Simulate printer {settings.printer.status === 'connected' ? 'jam/offline' : 'online'}
                </Button>
                <Link href="/pos/printer">
                  <Button variant="ghost">
                    Open print queue <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </Card>
          )}

          {section === 'receipt' && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 items-start">
              <Card className="space-y-4">
                <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">
                  Receipt template
                </h2>
                <Input
                  label="Header greeting"
                  value={settings.receipt.headerNote}
                  onChange={(e) =>
                    updateSettings({
                      receipt: { ...settings.receipt, headerNote: e.target.value },
                    })
                  }
                />
                <Input
                  label="Exchange / return policy footer"
                  value={settings.receipt.footerNote}
                  onChange={(e) =>
                    updateSettings({
                      receipt: { ...settings.receipt, footerNote: e.target.value },
                    })
                  }
                />
                <div className="space-y-2 text-[13px]">
                  {(
                    [
                      ['showPhone', 'Show shop phone number'],
                      ['showAddress', 'Show shop address'],
                      ['showCashier', 'Show cashier & counter name'],
                      ['showBarcode', 'Show bill barcode at bottom'],
                      ['showUrduLabels', 'Show Urdu labels on receipt'],
                    ] as const
                  ).map(([key, lbl]) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.receipt[key]}
                        onChange={(e) =>
                          updateSettings({
                            receipt: { ...settings.receipt, [key]: e.target.checked },
                          })
                        }
                        className="w-4 h-4 accent-[#08343A]"
                      />
                      <span>{lbl}</span>
                    </label>
                  ))}
                </div>
              </Card>

              {sampleBill && <Receipt bill={sampleBill} />}
            </div>
          )}

          {section === 'fbr' && (
            <Card className="space-y-4">
              <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">
                FBR POS tax integration
              </h2>
              <Select
                label="FBR integration mode"
                value={settings.fbr.mode}
                onChange={(e) => {
                  updateSettings({ fbr: { ...settings.fbr, mode: e.target.value as FbrMode } });
                  notify('Updated FBR POS status', 'ok');
                }}
                options={[
                  { value: 'notRequired', label: 'Not required (Tier-1 exempt)' },
                  { value: 'connected', label: 'Connected · Live FBR QR on bills' },
                  { value: 'queued', label: 'Queued · Hold invoices for sync' },
                ]}
              />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Input
                  label="POS ID"
                  value={settings.fbr.posId}
                  onChange={(e) =>
                    updateSettings({ fbr: { ...settings.fbr, posId: e.target.value } })
                  }
                />
                <Input
                  label="NTN"
                  value={settings.fbr.ntn}
                  onChange={(e) =>
                    updateSettings({ fbr: { ...settings.fbr, ntn: e.target.value } })
                  }
                />
                <Input
                  label="STRN"
                  value={settings.fbr.strn}
                  onChange={(e) =>
                    updateSettings({ fbr: { ...settings.fbr, strn: e.target.value } })
                  }
                />
              </div>
            </Card>
          )}

          {section === 'lang' && (
            <Card className="space-y-4">
              <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">
                App language &amp; script
              </h2>
              <p className="text-[13px] text-[#52666A]">
                Switch seamlessly between English, Roman Urdu, and Urdu (full right-to-left layout).
              </p>
              <LanguageSwitcher />
            </Card>
          )}

          {section === 'conn' && (
            <Card className="space-y-4">
              <h2 className="font-display text-[18px] font-bold text-[#0B2A2F]">
                Offline resilience &amp; demo data
              </h2>
              <div className="p-4 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[14px] text-[#0B2A2F]">
                    Simulate offline counter
                  </div>
                  <div className="text-[12px] text-[#52666A]">
                    Bills continue ringing up on device and queue for sync.
                  </div>
                </div>
                <Button
                  variant={settings.offlineModeSimulated ? 'copperTint' : 'secondary'}
                  onClick={() => {
                    updateSettings({ offlineModeSimulated: !settings.offlineModeSimulated });
                    notify(
                      settings.offlineModeSimulated
                        ? 'Internet connection restored'
                        : 'Simulated offline mode enabled',
                      'info'
                    );
                  }}
                >
                  {settings.offlineModeSimulated ? 'Go back online' : 'Simulate offline'}
                </Button>
              </div>

              <div className="p-4 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[14px] text-[#0B2A2F]">
                    Sync queue &amp; offline diagnostics
                  </div>
                  <div className="text-[12px] text-[#52666A]">
                    Inspect queued offline bills, FBR invoice queue, and push pending records.
                  </div>
                </div>
                <Link href="/pos/sync-check">
                  <Button variant="secondary">
                    Open sync check <ExternalLink className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>

              <div className="p-4 rounded-[12px] bg-[#FDF0EF] border border-[#F0C8C3] flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold text-[14px] text-[#B42318]">
                    Reset demo workspace
                  </div>
                  <div className="text-[12px] text-[#7A271A]">
                    Restore original seed bills, customers, stock, and cash entries.
                  </div>
                </div>
                <Button variant="danger" onClick={() => setResetConfirmOpen(true)}>
                  <RefreshCw className="w-4 h-4" /> Reset data
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal
        open={addStaffOpen}
        onClose={() => setAddStaffOpen(false)}
        title="Add staff by mobile"
        maxWidth="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddStaffOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleAddStaff}>
              Send invite &amp; save PIN
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Input
            label="Staff member name"
            placeholder="e.g. Bilal Tariq"
            value={staffName}
            onChange={(e) => setStaffName(e.target.value)}
          />
          <Input
            label="Mobile number"
            placeholder="03001234567"
            value={staffPhone}
            onChange={(e) => setStaffPhone(e.target.value)}
          />
          <Select
            label="Counter role"
            value={staffRole}
            onChange={(e) => setStaffRole(e.target.value as NonNullable<EmployeeRecord['roleId']>)}
            options={[
              { value: 'cashier', label: 'Cashier — Register, Bills, Khata' },
              { value: 'inventory', label: 'Stockkeeper — Stock & Purchasing' },
              { value: 'manager', label: 'Floor manager — Counter override PIN' },
            ]}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="4-digit counter PIN"
              maxLength={4}
              placeholder="e.g. 4455"
              value={staffPin}
              onChange={(e) => setStaffPin(e.target.value.replace(/\D/g, ''))}
            />
            <Input
              label="Monthly salary (Rs)"
              type="number"
              value={staffSalary}
              onChange={(e) => setStaffSalary(e.target.value)}
            />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={() => {
          resetDemoState();
          notify('Restored original Zyro demo state', 'ok');
        }}
        title="Reset all demo data?"
        body="Any new bills, items, or changes saved in your browser will be replaced with the original sample shop."
        confirmLabel="Reset demo data"
      />
    </div>
  );
}
