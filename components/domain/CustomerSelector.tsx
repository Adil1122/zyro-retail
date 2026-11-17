'use client';

import React, { useMemo, useState } from 'react';
import { Check, Plus, User, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { SearchInput } from '@/components/ui/SearchInput';
import { useZyro } from '@/hooks/useZyro';
import { formatPhone, formatRs, getInitials, isValidPkPhone } from '@/lib/format';
import type { Customer } from '@/types';

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
