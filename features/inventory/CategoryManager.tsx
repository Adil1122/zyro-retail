'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { CTYPE_ORDER, CTYPES, SIZESETS } from '@/constants/kits';
import { useZyro } from '@/hooks/useZyro';
import type { CategoryTypeId, ProductCategory } from '@/types';

export function CategoryManager() {
  const { state, saveCategories, notify } = useZyro();
  const [addOpen, setAddOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [type, setType] = useState<CategoryTypeId>('sc');
  const [sizeSetId, setSizeSetId] = useState('sxxl');
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);

  const toggleCounter = (id: string) => {
    saveCategories(
      state.categories.map((c) =>
        c.id === id ? { ...c, counterVisible: !c.counterVisible } : c
      )
    );
    notify('Updated counter visibility', 'info');
  };

  const handleAdd = () => {
    if (!label.trim()) {
      notify('Enter a category name', 'err');
      return;
    }
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    if (state.categories.some((c) => c.id === id)) {
      notify('A category with this name already exists', 'err');
      return;
    }
    const next: ProductCategory = {
      id,
      label: label.trim(),
      type,
      sizeSetId: type === 'sc' ? sizeSetId : undefined,
      counterVisible: true,
      order: state.categories.length,
    };
    saveCategories([...state.categories, next]);
    notify(`Added category “${next.label}”`, 'ok');
    setLabel('');
    setAddOpen(false);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const count = state.items.filter((i) => i.cat === deleteTarget.id).length;
    if (count > 0) {
      notify(`Move or delete the ${count} items in ${deleteTarget.label} first`, 'err');
      return;
    }
    saveCategories(state.categories.filter((c) => c.id !== deleteTarget.id));
    notify(`Deleted category “${deleteTarget.label}”`, 'info');
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Owner only · Catalog structure"
        title="Categories"
        subtitle="Each category controls which variant fields Zyro asks when you add stock."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/inventory">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4" /> Back to stock
              </Button>
            </Link>
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add category
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {state.categories.map((cat) => {
          const itemCount = state.items.filter((i) => i.cat === cat.id).length;
          const cinfo = CTYPES[cat.type];
          return (
            <Card key={cat.id} className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-[16px] text-[#0B2A2F]">
                    {cat.label}
                  </span>
                  <Badge tone="neutral">{itemCount} items</Badge>
                </div>
                <div className="text-[13px] text-[#3D5357] font-medium">{cinfo.label}</div>
                <div className="text-[12px] text-[#52666A]">Example: {cinfo.ex}</div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant={cat.counterVisible ? 'secondary' : 'ghost'}
                  onClick={() => toggleCounter(cat.id)}
                  title={cat.counterVisible ? 'Shown on counter' : 'Hidden on counter'}
                >
                  {cat.counterVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {cat.counterVisible ? 'Counter on' : 'Hidden'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(cat)}
                  aria-label={`Delete ${cat.label}`}
                >
                  <Trash2 className="w-4 h-4 text-[#B42318]" />
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add category"
        subtitle="Pick what kind of items belong in this group."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAdd}>Save category</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Category name"
            placeholder="e.g. Winter Shawls, Sports Shoes"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Select
            label="How items are tracked"
            value={type}
            onChange={(e) => setType(e.target.value as CategoryTypeId)}
            options={CTYPE_ORDER.map((id) => ({
              value: id,
              label: `${CTYPES[id].label} (${CTYPES[id].ex})`,
            }))}
          />
          {type === 'sc' && (
            <Select
              label="Default size set"
              value={sizeSetId}
              onChange={(e) => setSizeSetId(e.target.value)}
              options={SIZESETS.map(([id, lbl]) => ({ value: id, label: lbl }))}
            />
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete ${deleteTarget?.label || ''}?`}
        body="Empty categories can be removed safely. Categories containing items must be emptied first."
        confirmLabel="Delete category"
      />
    </div>
  );
}
