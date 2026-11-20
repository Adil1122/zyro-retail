'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CornerDownRight,
  Edit3,
  Eye,
  EyeOff,
  FolderTree,
  Plus,
  Trash2,
} from 'lucide-react';
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
  BAG_STANDARD_SIZES,
  FOOTWEAR_CHILD_GROUPS,
  FOOTWEAR_SIZING_SYSTEMS,
  FOOTWEAR_TYPES,
  PARENT_CATEGORY_OPTIONS,
  type FootwearCategoryRecord,
  type ParentCategoryKey,
  type SizingSystem,
} from '@/types/footwear';

function parseSizeInput(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  );
}

function sizingBadgeLabel(sys: SizingSystem): string {
  return sys === 'STANDARD' ? 'Standard (S / M / L)' : `${sys} sizing`;
}

function detectParentKey(cat: FootwearCategoryRecord | null | undefined): ParentCategoryKey {
  if (!cat) return 'footwear';
  if (cat.categoryScope === 'bags' || cat.defaultSizingSystem === 'STANDARD') return 'bags';
  const combined = `${cat.parentName || ''} ${cat.name}`.toLowerCase();
  if (combined.includes('bag') || combined.includes('handbag') || combined.includes('purse')) {
    return 'bags';
  }
  return 'footwear';
}

function formatSuggestedFootwearCategoryName(childGroup: string, footwearType: string): string {
  const prefix = childGroup === 'Kids' ? "Kids'" : `${childGroup}'s`;
  return `${prefix} ${footwearType}`;
}

export function CategoryManager() {
  const { notify } = useZyro();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<FootwearCategoryRecord[]>([]);

  // Create / Edit modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<FootwearCategoryRecord | null>(null);
  const [parentKey, setParentKey] = useState<ParentCategoryKey>('footwear');
  const [childGroup, setChildGroup] = useState<string>(FOOTWEAR_CHILD_GROUPS[0]);
  const [footwearType, setFootwearType] = useState<string>(FOOTWEAR_TYPES[0]);
  const [name, setName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [defaultSizingSystem, setDefaultSizingSystem] = useState<SizingSystem>('EU');
  const [sizeOptions, setSizeOptions] = useState<string[]>([]);
  const [sizeDraft, setSizeDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<FootwearCategoryRecord | null>(null);

  const loadCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await footwearInventoryService.listCategories();
      setCategories(res.categories);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to load categories', 'err');
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  // Build clean 2-level hierarchy using existing `parent_id`
  const { topLevelCategories, childrenByParentId } = useMemo(() => {
    const idSet = new Set(categories.map((c) => c.id));
    const tops: FootwearCategoryRecord[] = [];
    const childMap = new Map<string, FootwearCategoryRecord[]>();

    for (const c of categories) {
      if (!c.parentId || !idSet.has(c.parentId)) {
        tops.push(c);
      } else {
        const list = childMap.get(c.parentId) ?? [];
        list.push(c);
        childMap.set(c.parentId, list);
      }
    }
    return { topLevelCategories: tops, childrenByParentId: childMap };
  }, [categories]);

  const editingIsParentContainer = useMemo(() => {
    if (!editingCat) return false;
    const hasChildren = (childrenByParentId.get(editingCat.id)?.length ?? 0) > 0;
    const isTopPreset =
      !editingCat.parentId &&
      (editingCat.name.toLowerCase() === 'footwear' ||
        editingCat.name.toLowerCase() === 'bags / handbags');
    return hasChildren || isTopPreset;
  }, [editingCat, childrenByParentId]);

  const openAddModal = (presetParent: ParentCategoryKey = 'footwear') => {
    setEditingCat(null);
    setParentKey(presetParent);
    const defaultChild = FOOTWEAR_CHILD_GROUPS[0];
    const defaultType = FOOTWEAR_TYPES[0];
    setChildGroup(defaultChild);
    setFootwearType(defaultType);
    setNameTouched(false);

    if (presetParent === 'bags') {
      setName('');
      setDefaultSizingSystem('STANDARD');
      setSizeOptions([...BAG_STANDARD_SIZES]);
    } else {
      setName(formatSuggestedFootwearCategoryName(defaultChild, defaultType));
      setDefaultSizingSystem('EU');
      setSizeOptions([]);
    }
    setSizeDraft('');
    setModalOpen(true);
  };

  const openEditModal = (cat: FootwearCategoryRecord) => {
    const detected = detectParentKey(cat);
    setEditingCat(cat);
    setParentKey(detected);
    setChildGroup(cat.childGroup || FOOTWEAR_CHILD_GROUPS[0]);
    setFootwearType(cat.footwearType || FOOTWEAR_TYPES[0]);
    setName(cat.name);
    setNameTouched(true);
    setDefaultSizingSystem(
      detected === 'bags'
        ? 'STANDARD'
        : cat.defaultSizingSystem === 'STANDARD'
          ? 'EU'
          : cat.defaultSizingSystem || 'EU',
    );
    setSizeOptions(cat.sizeOptions ? [...cat.sizeOptions] : []);
    setSizeDraft('');
    setModalOpen(true);
  };

  const handleParentKeyChange = (nextKey: ParentCategoryKey) => {
    setParentKey(nextKey);
    if (nextKey === 'bags') {
      setDefaultSizingSystem('STANDARD');
      if (sizeOptions.length === 0) {
        setSizeOptions([...BAG_STANDARD_SIZES]);
      }
      if (!nameTouched) {
        setName('');
      }
    } else {
      setDefaultSizingSystem((prev) => (prev === 'STANDARD' ? 'EU' : prev));
      if (!nameTouched) {
        setName(formatSuggestedFootwearCategoryName(childGroup, footwearType));
      }
      setSizeOptions((prev) =>
        prev.filter(
          (sz) => !BAG_STANDARD_SIZES.some((b) => b.toLowerCase() === sz.toLowerCase()),
        ),
      );
    }
  };

  const handleChildGroupChange = (nextGroup: string) => {
    setChildGroup(nextGroup);
    if (!nameTouched && parentKey === 'footwear') {
      setName(formatSuggestedFootwearCategoryName(nextGroup, footwearType));
    }
  };

  const handleFootwearTypeChange = (nextType: string) => {
    setFootwearType(nextType);
    if (!nameTouched && parentKey === 'footwear') {
      setName(formatSuggestedFootwearCategoryName(childGroup, nextType));
    }
  };

  const addSizesFromDraft = () => {
    const parsed = parseSizeInput(sizeDraft);
    if (parsed.length === 0) return;
    setSizeOptions((prev) => Array.from(new Set([...prev, ...parsed])));
    setSizeDraft('');
  };

  const removeSizeOption = (sz: string) => {
    setSizeOptions((prev) => prev.filter((item) => item !== sz));
  };

  const handleSave = async () => {
    const cleanName = name.trim();
    if (!cleanName) {
      notify('Enter a category name', 'err');
      return;
    }

    const finalSizes = Array.from(
      new Set([...sizeOptions, ...parseSizeInput(sizeDraft)]),
    );

    const finalSizingSystem: SizingSystem =
      parentKey === 'bags'
        ? 'STANDARD'
        : defaultSizingSystem === 'STANDARD'
          ? 'EU'
          : defaultSizingSystem;

    setSaving(true);
    try {
      if (editingCat) {
        await footwearInventoryService.updateCategory(editingCat.id, {
          name: cleanName,
          ...(editingIsParentContainer ? {} : { parentCategoryType: parentKey }),
          childGroup: parentKey === 'footwear' && !editingIsParentContainer ? childGroup : null,
          footwearType: parentKey === 'footwear' && !editingIsParentContainer ? footwearType : null,
          defaultSizingSystem: finalSizingSystem,
          sizeOptions: finalSizes,
        });
        notify(`Updated category “${cleanName}”`, 'ok');
      } else {
        await footwearInventoryService.createCategory({
          name: cleanName,
          parentCategoryType: parentKey,
          childGroup: parentKey === 'footwear' ? childGroup : null,
          footwearType: parentKey === 'footwear' ? footwearType : null,
          defaultSizingSystem: finalSizingSystem,
          sizeOptions: finalSizes,
          counterVisible: true,
        });
        notify(`Added category “${cleanName}”`, 'ok');
      }
      setModalOpen(false);
      await loadCategories();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save category', 'err');
    } finally {
      setSaving(false);
    }
  };

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

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await footwearInventoryService.deleteCategory(deleteTarget.id);
      notify(`Deleted category “${deleteTarget.name}”`, 'info');
      setDeleteTarget(null);
      await loadCategories();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to delete category', 'err');
    }
  };

  const sizingModeOptions =
    parentKey === 'bags'
      ? [{ value: 'STANDARD', label: 'Standard (One Size / S / M / L)' }]
      : FOOTWEAR_SIZING_SYSTEMS.map((sys) => ({
          value: sys,
          label: `${sys} Sizing`,
        }));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Catalog hierarchy"
        title="Categories"
        subtitle="Manage Footwear (Men, Women, Kids & styles) and Bags / Handbags categories with configurable sizing."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/inventory">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4" /> Back to stock
              </Button>
            </Link>
            <Button variant="dark" size="lg" onClick={() => openAddModal('footwear')}>
              <Plus className="w-4 h-4" /> Add category
            </Button>
          </div>
        }
      />

      {loading ? (
        <Card className="p-8 text-center text-[14px] text-[#52666A]">
          Loading categories from Supabase...
        </Card>
      ) : topLevelCategories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          body="Add your first Footwear or Bags / Handbags category to organize products and configurable sizes."
          action={
            <Button variant="primary" onClick={() => openAddModal('footwear')}>
              <Plus className="w-4 h-4" /> Add category
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {topLevelCategories.map((parent) => {
            const children = childrenByParentId.get(parent.id) ?? [];
            const totalProducts = parent.totalProductCount ?? parent.productCount ?? 0;
            const pKey = detectParentKey(parent);

            return (
              <Card key={parent.id} className="space-y-3">
                {/* Parent Category Row */}
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FolderTree className="w-4 h-4 text-[#08343A] shrink-0" />
                      <span className="font-display font-bold text-[16px] text-[#0B2A2F]">
                        {parent.name}
                      </span>
                      <Badge tone="neutral">Parent</Badge>
                      <Badge tone="neutral">
                        {totalProducts} product{totalProducts === 1 ? '' : 's'}
                      </Badge>
                      {children.length > 0 && (
                        <Badge tone="ok">
                          {children.length} subcategor{children.length === 1 ? 'y' : 'ies'}
                        </Badge>
                      )}
                    </div>

                    <div className="text-[13px] text-[#3D5357] font-medium">
                      {sizingBadgeLabel(parent.defaultSizingSystem)}
                      {parent.sizeOptions.length > 0
                        ? ` · Sizes: ${parent.sizeOptions.join(', ')}`
                        : children.length === 0
                          ? ' · Add child categories or configure sizes'
                          : ' · Configure sizes on each child category'}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openAddModal(pKey)}
                    >
                      <Plus className="w-3.5 h-3.5" /> Add child
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => openEditModal(parent)}
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={parent.counterVisible ? 'secondary' : 'ghost'}
                      onClick={() => void toggleCounter(parent)}
                      title={parent.counterVisible ? 'Shown on counter' : 'Hidden on counter'}
                    >
                      {parent.counterVisible ? (
                        <Eye className="w-4 h-4" />
                      ) : (
                        <EyeOff className="w-4 h-4" />
                      )}
                      {parent.counterVisible ? 'Counter on' : 'Hidden'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDeleteTarget(parent)}
                      aria-label={`Delete ${parent.name}`}
                    >
                      <Trash2 className="w-4 h-4 text-[#B42318]" />
                    </Button>
                  </div>
                </div>

                {/* Child Categories List */}
                {children.length > 0 && (
                  <div className="pl-4 sm:pl-6 pt-2 border-t border-[#F1EBE3] space-y-2">
                    {children.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between gap-3 flex-wrap p-3 rounded-[10px] border border-[#E7E0D7] bg-[#FBF8F4]"
                      >
                        <div className="flex items-start gap-2 min-w-0">
                          <CornerDownRight className="w-4 h-4 text-[#52666A] shrink-0 mt-0.5" />
                          <div className="space-y-0.5 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[14px] text-[#0B2A2F]">
                                {child.name}
                              </span>
                              {child.childGroup && (
                                <Badge tone="neutral">{child.childGroup}</Badge>
                              )}
                              {child.footwearType && (
                                <Badge tone="neutral">{child.footwearType}</Badge>
                              )}
                              <Badge tone="neutral">
                                {child.productCount ?? 0} product
                                {(child.productCount ?? 0) === 1 ? '' : 's'}
                              </Badge>
                            </div>
                            <div className="text-[12px] text-[#52666A]">
                              {sizingBadgeLabel(child.defaultSizingSystem)}
                              {child.sizeOptions.length > 0
                                ? ` · Sizes: ${child.sizeOptions.join(', ')}`
                                : ' · No default sizes set yet (click Edit to configure)'}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => openEditModal(child)}
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant={child.counterVisible ? 'secondary' : 'ghost'}
                            onClick={() => void toggleCounter(child)}
                            title={child.counterVisible ? 'Shown on counter' : 'Hidden on counter'}
                          >
                            {child.counterVisible ? (
                              <Eye className="w-3.5 h-3.5" />
                            ) : (
                              <EyeOff className="w-3.5 h-3.5" />
                            )}
                            {child.counterVisible ? 'Counter on' : 'Hidden'}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeleteTarget(child)}
                            aria-label={`Delete ${child.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#B42318]" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Add / Edit Category Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingCat ? `Edit category · ${editingCat.name}` : 'Add category'}
        subtitle={
          editingCat
            ? 'Update category details, sizing mode, or configurable size options.'
            : 'Choose a parent category (Footwear or Bags / Handbags) and configure its options.'
        }
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving...' : editingCat ? 'Save changes' : 'Save category'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* 1. Parent Category Dropdown: Footwear or Bags / Handbags */}
          <Select
            label="Parent category"
            value={parentKey}
            disabled={editingIsParentContainer}
            onChange={(e) => handleParentKeyChange(e.target.value as ParentCategoryKey)}
            options={PARENT_CATEGORY_OPTIONS.map((opt) => ({
              value: opt.key,
              label: opt.label,
            }))}
          />

          {/* 2 & 3. Child Category (Men / Women / Kids) & Footwear Type (Sneakers etc.) — ONLY for Footwear */}
          {parentKey === 'footwear' && !editingIsParentContainer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select
                label="Child category"
                value={childGroup}
                onChange={(e) => handleChildGroupChange(e.target.value)}
                options={FOOTWEAR_CHILD_GROUPS.map((g) => ({
                  value: g,
                  label: g,
                }))}
              />
              <Select
                label="Footwear category"
                value={footwearType}
                onChange={(e) => handleFootwearTypeChange(e.target.value)}
                options={FOOTWEAR_TYPES.map((t) => ({
                  value: t,
                  label: t,
                }))}
              />
            </div>
          )}

          <Input
            label="Category name"
            placeholder={
              parentKey === 'bags'
                ? 'e.g. Handbags, Tote Bags, Clutches, Backpacks'
                : "e.g. Men's Sneakers, Women's Sandals, Kids' School Shoes"
            }
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameTouched(true);
            }}
          />

          {/* 4. Sizing Mode: EU/UK/US for Footwear, Standard S/M/L for Bags */}
          <Select
            label="Sizing system"
            value={parentKey === 'bags' ? 'STANDARD' : defaultSizingSystem}
            onChange={(e) => setDefaultSizingSystem(e.target.value as SizingSystem)}
            options={sizingModeOptions}
          />

          {/* Configurable Sizes for this Category */}
          <div className="space-y-2 pt-2 border-t border-[#F1EBE3]">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[13px] font-semibold text-[#0B2A2F]">
                Available sizes for this category (optional)
              </label>
              {parentKey === 'bags' && (
                <button
                  type="button"
                  onClick={() =>
                    setSizeOptions((prev) =>
                      Array.from(new Set([...prev, ...BAG_STANDARD_SIZES])),
                    )
                  }
                  className="text-[12px] font-semibold text-[#C9682E] hover:underline"
                >
                  + Add One Size / S / M / L
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sizeDraft}
                onChange={(e) => setSizeDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addSizesFromDraft();
                  }
                }}
                placeholder={
                  parentKey === 'bags'
                    ? 'e.g. One Size, Small, Medium, Large'
                    : 'Comma-separated sizes, e.g. 40, 41, 42, 43, 44'
                }
                className="field flex-1 h-[38px] px-3 rounded-[9px] border border-[#8A8276] text-[13px] bg-white"
              />
              <Button size="sm" variant="secondary" type="button" onClick={addSizesFromDraft}>
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>

            {sizeOptions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {sizeOptions.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => removeSizeOption(sz)}
                    className="px-2.5 py-1 rounded-[8px] border border-[#08343A] bg-[#08343A] text-white text-[12px] font-semibold"
                    title="Click to remove size"
                  >
                    {sz} ×
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-[12px] text-[#52666A]">
                Add sizes relevant to this category so they appear automatically when adding products.
              </p>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void confirmDelete()}
        title={`Delete ${deleteTarget?.name || ''}?`}
        body="Empty categories without child categories or products can be deleted safely."
        confirmLabel="Delete category"
      />
    </div>
  );
}
