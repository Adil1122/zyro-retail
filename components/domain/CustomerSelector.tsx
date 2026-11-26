'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Loader2, Plus, User, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { footwearPosService } from '@/features/pos/services/footwear-pos.service';
import { useZyro } from '@/hooks/useZyro';
import { formatPhone, formatRs, getInitials, isValidPkPhone } from '@/lib/format';
import type { Customer } from '@/types';
import type { PosCustomerRecord } from '@/types/footwear';

export interface CustomerSelectorProps {
  open: boolean;
  onClose: () => void;
  currentId: string | null;
  onPick: (customer: Customer | null) => void;
}

export function CustomerSelector({
  open,
  onClose,
  currentId,
  onPick,
}: CustomerSelectorProps) {
  const { state, addCustomer, notify } = useZyro();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [err, setErr] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    if (!q) return state.customers;
    return state.customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (qDigits.length >= 2 && c.phone.includes(qDigits))
    );
  }, [state.customers, query]);

  const handleCreate = () => {
    if (!newName.trim()) {
      setErr('Enter customer name.');
      return;
    }
    if (!isValidPkPhone(newPhone)) {
      setErr('Enter a valid 11-digit mobile number (03XX XXXXXXX).');
      return;
    }
    const created = addCustomer(newName, newPhone);
    notify(`Added ${created.name}`, 'ok');
    setCreating(false);
    setNewName('');
    setNewPhone('');
    setErr('');
    onPick(created);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={creating ? 'Add new customer' : 'Select customer'}
      subtitle={creating ? 'Saved to this shop for bills and Khata' : 'Search by name or phone number'}
      maxWidth="md"
    >
      {creating ? (
        <div className="space-y-4">
          <Input
            label="Full name"
            placeholder="e.g. Tariq Mahmood"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setErr('');
            }}
            autoFocus
          />
          <Input
            label="Mobile number"
            placeholder="0300 1234567"
            value={newPhone}
            onChange={(e) => {
              setNewPhone(e.target.value);
              setErr('');
            }}
            error={err}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreating(false)}>
              Back to list
            </Button>
            <Button variant="primary" onClick={handleCreate}>
              <UserPlus className="w-4 h-4" />
              Save & select
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Name or 03XX phone..."
              autoFocus
            />
            <Button variant="copperTint" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" />
              New
            </Button>
          </div>

          {currentId && (
            <button
              type="button"
              onClick={() => {
                onPick(null);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-[10px] border border-[#E7E0D7] bg-[#FBF8F4] hover:bg-[#F1EBE3] text-[13px] font-medium text-[#3D5357]"
            >
              <span>Switch back to Walk-in customer</span>
              <span className="text-[#B42318] font-semibold">Clear</span>
            </button>
          )}

          <div className="divide-y divide-[#F1EBE3] border border-[#E7E0D7] rounded-[12px] overflow-hidden max-h-[340px] overflow-y-auto">
            {filtered.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <User className="w-8 h-8 text-[#52666A] mx-auto" />
                <div className="text-[14px] font-semibold text-[#0B2A2F]">No matching customer</div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setNewName(query);
                    setCreating(true);
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  Add “{query || 'New customer'}”
                </Button>
              </div>
            ) : (
              filtered.map((c) => {
                const selected = c.id === currentId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onPick(c);
                      onClose();
                    }}
                    className={`w-full px-4 py-3 text-start flex items-center justify-between gap-3 transition-colors ${
                      selected ? 'bg-[#FCEFE4]' : 'bg-white hover:bg-[#FBF8F4]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#E1EEEE] text-[#0B4F55] font-bold text-[13px] flex items-center justify-center shrink-0">
                        {getInitials(c.name)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px] text-[#0B2A2F] truncate flex items-center gap-2">
                          {c.name}
                          {selected && <Check className="w-4 h-4 text-[#C9682E]" />}
                        </div>
                        <div className="text-[12px] text-[#52666A] mono">
                          {formatPhone(c.phone)} · Last visit {c.last}
                        </div>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      {c.khata > 0 ? (
                        <Badge tone="warn">Owes {formatRs(c.khata)}</Badge>
                      ) : (
                        <Badge tone="neutral">Settled</Badge>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

export interface LiveCustomerSelectorProps {
  open: boolean;
  onClose: () => void;
  branchId?: string;
  currentId: string | null;
  onPick: (customer: PosCustomerRecord | null) => void;
}

export function LiveCustomerSelector({
  open,
  onClose,
  branchId,
  currentId,
  onPick,
}: LiveCustomerSelectorProps) {
  const { notify } = useZyro();
  const [query, setQuery] = useState('');
  const [customers, setCustomers] = useState<PosCustomerRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newCity, setNewCity] = useState('');
  const [err, setErr] = useState('');

  const loadCustomers = useCallback(
    async (qText: string) => {
      setLoading(true);
      try {
        const res = await footwearPosService.searchCustomers(qText.trim() || undefined, branchId);
        setCustomers(res.customers);
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Failed to load customers', 'err');
      } finally {
        setLoading(false);
      }
    },
    [branchId, notify]
  );

  useEffect(() => {
    if (!open || creating) return;
    const timer = window.setTimeout(() => {
      void loadCustomers(query);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [open, creating, query, loadCustomers]);

  const handleCreate = async () => {
    if (!newName.trim()) {
      setErr('Enter customer name.');
      return;
    }
    if (newPhone.trim() && newPhone.replace(/\D/g, '').length < 7) {
      setErr('Enter a valid mobile number (e.g. 0300 1234567).');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const res = await footwearPosService.createCustomer({
        branchId,
        fullName: newName.trim(),
        phone: newPhone.trim() || undefined,
        city: newCity.trim() || undefined,
      });
      notify(`Added ${res.customer.fullName}`, 'ok');
      setCreating(false);
      setNewName('');
      setNewPhone('');
      setNewCity('');
      onPick(res.customer);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to create customer');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={creating ? 'Add new customer' : 'Select customer'}
      subtitle={creating ? 'Saved to this shop for bills and Khata' : 'Search by name or phone number'}
      maxWidth="md"
    >
      {creating ? (
        <div className="space-y-4">
          <Input
            label="Full name"
            placeholder="e.g. Tariq Mahmood"
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value);
              setErr('');
            }}
            autoFocus
          />
          <Input
            label="Mobile number"
            placeholder="0300 1234567"
            value={newPhone}
            onChange={(e) => {
              setNewPhone(e.target.value);
              setErr('');
            }}
          />
          <Input
            label="City (optional)"
            placeholder="e.g. Lahore"
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            error={err}
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setCreating(false)} disabled={saving}>
              Back to list
            </Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Save & select
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Name or 03XX phone..."
              autoFocus
            />
            <Button variant="copperTint" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" />
              New
            </Button>
          </div>

          {currentId && (
            <button
              type="button"
              onClick={() => {
                onPick(null);
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-[10px] border border-[#E7E0D7] bg-[#FBF8F4] hover:bg-[#F1EBE3] text-[13px] font-medium text-[#3D5357]"
            >
              <span>Switch back to Walk-in customer</span>
              <span className="text-[#B42318] font-semibold">Clear</span>
            </button>
          )}

          <div className="divide-y divide-[#F1EBE3] border border-[#E7E0D7] rounded-[12px] overflow-hidden max-h-[340px] overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-[13px] text-[#52666A] flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> Searching customers...
              </div>
            ) : customers.length === 0 ? (
              <div className="p-6 text-center space-y-3">
                <User className="w-8 h-8 text-[#52666A] mx-auto" />
                <div className="text-[14px] font-semibold text-[#0B2A2F]">No matching customer</div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setNewName(query);
                    setCreating(true);
                  }}
                >
                  <UserPlus className="w-4 h-4" />
                  Add “{query || 'New customer'}”
                </Button>
              </div>
            ) : (
              customers.map((c) => {
                const selected = c.id === currentId;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onPick(c);
                      onClose();
                    }}
                    className={`w-full px-4 py-3 text-start flex items-center justify-between gap-3 transition-colors ${
                      selected ? 'bg-[#FCEFE4]' : 'bg-white hover:bg-[#FBF8F4]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#E1EEEE] text-[#0B4F55] font-bold text-[13px] flex items-center justify-center shrink-0">
                        {getInitials(c.fullName)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-[14px] text-[#0B2A2F] truncate flex items-center gap-2">
                          {c.fullName}
                          {selected && <Check className="w-4 h-4 text-[#C9682E]" />}
                        </div>
                        <div className="text-[12px] text-[#52666A] mono">
                          {c.phone ? formatPhone(c.phone) : 'No phone'}
                          {c.city ? ` · ${c.city}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="text-end shrink-0">
                      {c.khataBalance > 0 ? (
                        <Badge tone="warn">Owes {formatRs(c.khataBalance)}</Badge>
                      ) : (
                        <Badge tone="neutral">Settled</Badge>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
