'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { footwearInventoryService } from '@/features/inventory/services/footwear-inventory.service';
import { useZyro } from '@/hooks/useZyro';
import {
  FOOTWEAR_TYPES,
  SIZING_SYSTEMS,
  type FootwearCategoryRecord,
  type SizingSystem,
} from '@/types/footwear';

export function CategoryManager() {
  const { notify } = useZyro();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<FootwearCategoryRecord[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [defaultSizingSystem, setDefaultSizingSystem] = useState<SizingSystem>('EU');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<FootwearCategoryRecord | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await footwearInventoryService.listCategories();
      setCategories(res.categories);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to load footwear categories', 'err');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const toggleCounter = async (cat: FootwearCategoryRecord) => {
    try {
      await footwearInventoryService.updateCategory(cat.id, {
        counterVisible: !cat.counterVisible,
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, counterVisible: !c.counterVisible } : c)),
      );
      notify(`Updated counter visibility for ${cat.name}`, 'info');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to update category', 'err');
    }
  };

  const handleAdd = async () => {
    if (!name.trim()) {
      notify('Enter a footwear category name', 'err');
      return;
    }
    setSaving(true);
    try {
      const res = await footwearInventoryService.createCategory({
        name: name.trim(),
        defaultSizingSystem,
        counterVisible: true,
      });
      setCategories((prev) => [...prev, res.category]);
      notify(`Added footwear category “${res.category.name}”`, 'ok');
      setName('');
      setAddOpen(false);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to add category', 'err');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await footwearInventoryService.deleteCategory(deleteTarget.id);
      setCategories((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      notify(`Deleted category “${deleteTarget.name}”`, 'info');
      setDeleteTarget(null);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to delete category', 'err');
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Footwear catalog structure"
        title="Footwear categories"
        subtitle="Manage Footwear subcategories shown on the POS register and configure default EU/UK/US sizing."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/inventory">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4" /> Back to stock
              </Button>
            </Link>
            <Button variant="dark" size="lg" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add category
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card className="p-8 text-center text-[14px] text-[#52666A]">
          Loading footwear categories from Supabase...
        </Card>
      ) : categories.length === 0 ? (
        <EmptyState
          title="No footwear categories yet"
          body="Create Footwear categories like Sneakers, Formal Shoes, Sandals, Slippers, or Boots."
          action={
            <Button variant="primary" onClick={() => setAddOpen(true)}>
              <Plus className="w-4 h-4" /> Add category
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {categories.map((cat) => (
            <Card key={cat.id} className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-display font-bold text-[16px] text-[#0B2A2F]">
                    {cat.name}
                  </span>
                  <Badge tone="neutral">{cat.productCount ?? 0} products</Badge>
                </div>
                <div className="text-[13px] text-[#3D5357] font-medium">
                  Footwear · Sizes &amp; colours ({cat.defaultSizingSystem} default)
                </div>
                <div className="text-[12px] text-[#52666A]">
                  Tracks pairs independently per size, colour, and branch
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant={cat.counterVisible ? 'secondary' : 'ghost'}
                  onClick={() => void toggleCounter(cat)}
                  title={cat.counterVisible ? 'Shown on counter' : 'Hidden on counter'}
                >
                  {cat.counterVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  {cat.counterVisible ? 'Counter on' : 'Hidden'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDeleteTarget(cat)}
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2 className="w-4 h-4 text-[#B42318]" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add footwear category"
        subtitle="Create a Footwear subcategory for organizing stock and POS quick filters."
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={saving} onClick={() => void handleAdd()}>
              {saving ? 'Saving...' : 'Save category'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Footwear category name"
            placeholder="e.g. Sneakers, Formal Shoes, Sandals, Boots"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <div className="flex flex-wrap gap-1.5">
            {FOOTWEAR_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setName(t)}
                className="px-2.5 py-1 rounded-[8px] border border-[#D6CDC1] bg-[#FBF8F4] text-[12px] font-medium text-[#0B2A2F] hover:border-[#E2B48F]"
              >
                {t}
              </button>
            ))}
          </div>
          <Select
            label="Default sizing system"
            value={defaultSizingSystem}
            onChange={(e) => setDefaultSizingSystem(e.target.value as SizingSystem)}
            options={SIZING_SYSTEMS.map((s) => ({ value: s, label: `${s} Sizing` }))}
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title={`Delete ${deleteTarget?.name || ''}?`}
        body="Empty footwear categories can be removed safely. Categories containing products must be emptied first."
        confirmLabel="Delete category"
      />
    </div>
  );
}
