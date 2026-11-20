'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  FolderKanban,
  Plus,
  Printer,
  Save,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { BarcodePreview } from '@/components/domain/BarcodePreview';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { SWATCHES } from '@/constants/kits';
import { footwearInventoryService } from '@/features/inventory/services/footwear-inventory.service';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import {
  BAG_STANDARD_SIZES,
  FOOTWEAR_GENDERS,
  FOOTWEAR_TYPES,
  SIZING_SYSTEMS,
  formatVariantDisplay,
  formatVariantSizeLabel,
  type FootwearCategoryRecord,
  type FootwearProductRecord,
  type SizingSystem,
} from '@/types/footwear';

const SWATCH_LIST = Object.keys(SWATCHES);

interface VariantDraft {
  id?: string;
  colourName: string;
  sizeName: string;
  sizingSystem: SizingSystem;
  sku: string;
  barcode: string;
  costPrice: string;
  sellingPrice: string;
  reorderLevel: string;
  openingStock: string;
  isActive: boolean;
  skuTouched?: boolean;
  barcodeTouched?: boolean;
}

interface ImageDraft {
  storagePath: string;
  signedUrl: string | null;
  imageUrl?: string | null;
  isPrimary: boolean;
}

function makeSkuPart(val: string, len = 3): string {
  return val.replace(/[^a-zA-Z0-9]/g, '').slice(0, len).toUpperCase() || 'STD';
}

function buildAutoBaseSku(name: string, brand: string, model: string, categoryName: string): string {
  const cleanName = (model || name).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleanName.length >= 3) {
    const prefix = brand ? `${makeSkuPart(brand, 3)}-` : '';
    return `${prefix}${cleanName.slice(0, 10)}`;
  }
  return `${makeSkuPart(brand || categoryName || 'PRD', 3)}-${makeSkuPart(name || 'ITEM', 4)}`;
}

function buildAutoVariantSku(baseCode: string, colourName: string, sizeName: string): string {
  const colPart = makeSkuPart(colourName, 3);
  const szPart = sizeName.replace(/[^A-Za-z0-9.]/g, '').toUpperCase().slice(0, 8) || 'STD';
  return `${baseCode}-${colPart}-${szPart}`;
}

function makeBarcode(sku: string, idx: number): string {
  const clean = sku.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) || 'PRD';
  const suffix = String(1000 + ((idx * 137 + Date.now()) % 8999));
  return `ZR-${clean}-${suffix}`;
}

function isBagCategoryName(name: string | null | undefined): boolean {
  if (!name) return false;
  return /\b(bag|bags|handbag|handbags|purse|purses|clutch|clutches|tote|totes|backpack|backpacks|wallet|wallets|satchel)\b/i.test(
    name,
  );
}

function inferGenderFromCategoryName(name: string | null | undefined): string | null {
  if (!name) return null;
  const lower = name.toLowerCase();
  if (lower.includes('women') || lower.includes('ladies')) return 'Women';
  if (lower.includes('men') && !lower.includes('women')) return 'Men';
  if (lower.includes('kid') || lower.includes('child')) return 'Kids';
  if (lower.includes('boy')) return 'Boys';
  if (lower.includes('girl')) return 'Girls';
  return null;
}

export function ItemEditorForm({ itemId }: { itemId?: string }) {
  const router = useRouter();
  const { notify } = useZyro();

  const [loading, setLoading] = useState(Boolean(itemId));
  const [saving, setSaving] = useState(false);
  const [savingCategorySizes, setSavingCategorySizes] = useState(false);
  const [uploadingImg, setUploadingImg] = useState(false);
  const [categories, setCategories] = useState<FootwearCategoryRecord[]>([]);
  const [loadedProduct, setLoadedProduct] = useState<FootwearProductRecord | null>(null);

  // Section 1: Category & Product Info
  const [parentCategoryId, setParentCategoryId] = useState<string>('');
  const [childCategoryId, setChildCategoryId] = useState<string>('');
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<ImageDraft[]>([]);

  // Optional extended details (kept collapsible for speed, preserved for existing footwear records)
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [footwearType, setFootwearType] = useState<string>(FOOTWEAR_TYPES[0]);
  const [gender, setGender] = useState<string>('');
  const [material, setMaterial] = useState('');
  const [upperMaterial, setUpperMaterial] = useState('');
  const [soleMaterial, setSoleMaterial] = useState('');
  const [description, setDescription] = useState('');

  // Section 2: Pricing, Colours & Configurable Sizes
  const [baseCostPrice, setBaseCostPrice] = useState('');
  const [baseSellingPrice, setBaseSellingPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('3');
  const [sizingSystem, setSizingSystem] = useState<SizingSystem>('EU');
  const [selectedColours, setSelectedColours] = useState<string[]>(['Black']);
  const [customColourInput, setCustomColourInput] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [bulkQtyInput, setBulkQtyInput] = useState('5');

  // Section 3: Auto-generated Variant Matrix & Barcode Preview
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  const hydratedRef = useRef(!itemId);
  const initialCategoryAppliedRef = useRef(false);
  const prevBaseCostRef = useRef('');
  const prevBaseSellingRef = useRef('');

  // Load categories & existing product (if editing)
  useEffect(() => {
    let cancelled = false;
    footwearInventoryService
      .listCategories()
      .then((res) => {
        if (!cancelled) setCategories(res.categories);
      })
      .catch(() => undefined);

    if (itemId) {
      footwearInventoryService
        .getProduct(itemId)
        .then((res) => {
          if (cancelled) return;
          const p = res.product;
          setLoadedProduct(p);
          setName(p.name);
          setBrand(p.brand || '');
          setModel(p.model || '');
          setFootwearType(p.footwearType || FOOTWEAR_TYPES[0]);
          setGender(p.gender || '');
          setMaterial(p.material || '');
          setUpperMaterial(p.upperMaterial || '');
          setSoleMaterial(p.soleMaterial || '');
          setDescription(p.description || '');
          setIsActive(p.isActive);
          setSku(p.sku);
          setBaseSellingPrice(String(p.baseSellingPrice));
          setBaseCostPrice(String(p.baseCostPrice));
          prevBaseSellingRef.current = String(p.baseSellingPrice);
          prevBaseCostRef.current = String(p.baseCostPrice);
          setSizingSystem(p.sizingSystem || 'EU');
          setSelectedColours(p.colours.length > 0 ? p.colours : ['Black']);
          setSelectedSizes(p.sizes.length > 0 ? p.sizes : []);
          if (p.brand || p.model || p.material || p.upperMaterial || p.soleMaterial || p.description) {
            setShowMoreDetails(true);
          }
          setImages(
            p.images.map((img) => ({
              storagePath: img.storagePath,
              signedUrl: img.signedUrl ?? img.imageUrl ?? null,
              imageUrl: img.imageUrl,
              isPrimary: img.isPrimary,
            })),
          );
          setVariants(
            p.variants.map((v) => ({
              id: v.id,
              colourName: v.colourName,
              sizeName: v.sizeName,
              sizingSystem: v.sizingSystem,
              sku: v.sku,
              barcode: v.primaryBarcode || '',
              costPrice: String(v.costPrice),
              sellingPrice: String(v.sellingPrice),
              reorderLevel: String(v.reorderLevel),
              openingStock: String(v.stockOnHand),
              isActive: v.isActive,
            })),
          );
          hydratedRef.current = true;
        })
        .catch((err) => {
          notify(err instanceof Error ? err.message : 'Failed to load product', 'err');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [itemId, notify]);

  // Parent & child hierarchy derived from loaded categories
  const parentCategories = useMemo(
    () => categories.filter((c) => !c.parentId && c.isActive),
    [categories],
  );

  const childrenByParent = useMemo(() => {
    const map = new Map<string, FootwearCategoryRecord[]>();
    for (const c of categories) {
      if (c.parentId && c.isActive) {
        const list = map.get(c.parentId) ?? [];
        list.push(c);
        map.set(c.parentId, list);
      }
    }
    return map;
  }, [categories]);

  // Initialize parent/child category selection once categories (and product if editing) load
  useEffect(() => {
    if (categories.length === 0 || initialCategoryAppliedRef.current) return;

    if (itemId) {
      if (!loadedProduct) return;
      const matched = loadedProduct.categoryId
        ? categories.find((c) => c.id === loadedProduct.categoryId)
        : null;
      if (matched?.parentId) {
        setParentCategoryId(matched.parentId);
        setChildCategoryId(matched.id);
      } else if (loadedProduct.parentCategoryId && loadedProduct.categoryId) {
        setParentCategoryId(loadedProduct.parentCategoryId);
        setChildCategoryId(loadedProduct.categoryId);
      } else if (matched) {
        setParentCategoryId(matched.id);
        setChildCategoryId('');
      }
      initialCategoryAppliedRef.current = true;
      return;
    }

    // New product: default to Footwear (or first parent) and its first child if any
    if (parentCategories.length > 0) {
      const preferred =
        parentCategories.find((c) => c.name.toLowerCase().includes('footwear')) ||
        parentCategories[0];
      const kids = childrenByParent.get(preferred.id) ?? [];
      const firstChild = kids[0] ?? null;
      setParentCategoryId(preferred.id);
      setChildCategoryId(firstChild?.id ?? '');

      const targetCat = firstChild ?? preferred;
      const nextSizing: SizingSystem =
        isBagCategoryName(targetCat.name) || isBagCategoryName(preferred.name)
          ? 'STANDARD'
          : targetCat.defaultSizingSystem || preferred.defaultSizingSystem || 'EU';
      setSizingSystem(nextSizing);

      const configuredSizes =
        targetCat.sizeOptions.length > 0
          ? targetCat.sizeOptions
          : preferred.sizeOptions.length > 0
            ? preferred.sizeOptions
            : nextSizing === 'STANDARD'
              ? ['One Size']
              : [];
      if (configuredSizes.length > 0) {
        setSelectedSizes(nextSizing === 'STANDARD' ? [configuredSizes[0]] : configuredSizes);
      }
    }
    initialCategoryAppliedRef.current = true;
  }, [categories, parentCategories, childrenByParent, itemId, loadedProduct]);

  const selectedParent = useMemo(
    () => categories.find((c) => c.id === parentCategoryId) ?? null,
    [categories, parentCategoryId],
  );

  const availableChildren = useMemo(
    () => (parentCategoryId ? childrenByParent.get(parentCategoryId) ?? [] : []),
    [childrenByParent, parentCategoryId],
  );

  const selectedChild = useMemo(
    () => availableChildren.find((c) => c.id === childCategoryId) ?? null,
    [availableChildren, childCategoryId],
  );

  const effectiveCategory = selectedChild ?? selectedParent ?? null;

  const isBagProduct = useMemo(
    () =>
      sizingSystem === 'STANDARD' ||
      isBagCategoryName(effectiveCategory?.name) ||
      isBagCategoryName(selectedParent?.name),
    [sizingSystem, effectiveCategory, selectedParent],
  );

  const unitLabel = isBagProduct ? 'piece' : 'pair';
  const unitPlural = isBagProduct ? 'pcs' : 'pairs';

  // Category-configured size options (NOT hardcoded for footwear)
  const categoryConfiguredSizes = useMemo(() => {
    const childOpts = selectedChild?.sizeOptions ?? [];
    if (childOpts.length > 0) return childOpts;
    const parentOpts = selectedParent?.sizeOptions ?? [];
    if (parentOpts.length > 0) return parentOpts;
    return [] as string[];
  }, [selectedChild, selectedParent]);

  // Selectable size chips shown to user: category-configured sizes + (for Bags/Standard: One Size/Small/Medium/Large) + any custom selected sizes
  const selectableSizeOptions = useMemo(() => {
    const ordered: string[] = [];
    const seen = new Set<string>();
    const addUnique = (val: string) => {
      const clean = val.trim();
      if (!clean) return;
      const key = clean.toLowerCase();
      if (seen.has(key)) return;
      seen.add(key);
      ordered.push(clean);
    };
    categoryConfiguredSizes.forEach(addUnique);
    if (isBagProduct) {
      BAG_STANDARD_SIZES.forEach(addUnique);
    }
    selectedSizes.forEach(addUnique);
    return ordered;
  }, [categoryConfiguredSizes, isBagProduct, selectedSizes]);

  const applyCategoryDefaults = (
    nextParent: FootwearCategoryRecord | null,
    nextChild: FootwearCategoryRecord | null,
  ) => {
    const target = nextChild ?? nextParent;
    if (!target) return;
    const bagMode =
      isBagCategoryName(target.name) ||
      isBagCategoryName(nextParent?.name) ||
      target.defaultSizingSystem === 'STANDARD';
    const nextSizing: SizingSystem = bagMode
      ? 'STANDARD'
      : target.defaultSizingSystem || nextParent?.defaultSizingSystem || 'EU';
    setSizingSystem(nextSizing);

    const inferredGender = inferGenderFromCategoryName(target.name);
    if (inferredGender) setGender(inferredGender);
    else if (bagMode) setGender('');

    if (!itemId) {
      const configured =
        target.sizeOptions.length > 0
          ? target.sizeOptions
          : nextParent && nextParent.sizeOptions.length > 0
            ? nextParent.sizeOptions
            : [];
      if (bagMode) {
        setSelectedSizes(configured.length > 0 ? [configured[0]] : ['One Size']);
      } else {
        setSelectedSizes(configured);
      }
    }
  };

  const handleParentCategoryChange = (nextParentId: string) => {
    setParentCategoryId(nextParentId);
    const nextParent = categories.find((c) => c.id === nextParentId) ?? null;
    const kids = nextParentId ? childrenByParent.get(nextParentId) ?? [] : [];
    const nextChild = kids[0] ?? null;
    setChildCategoryId(nextChild?.id ?? '');
    applyCategoryDefaults(nextParent, nextChild);
  };

  const handleChildCategoryChange = (nextChildId: string) => {
    setChildCategoryId(nextChildId);
    const nextChild = availableChildren.find((c) => c.id === nextChildId) ?? null;
    applyCategoryDefaults(selectedParent, nextChild);
  };

  // Automatically sync variants whenever selectedColours, selectedSizes, or sizingSystem changes
  useEffect(() => {
    if (!hydratedRef.current) return;
    setVariants((prev) => {
      const existingByPair = new Map<string, VariantDraft>();
      for (const v of prev) {
        existingByPair.set(`${v.colourName.toLowerCase()}|${v.sizeName.toLowerCase()}`, v);
      }

      const baseCode = (
        sku.trim() ||
        buildAutoBaseSku(name, brand, model, effectiveCategory?.name || '')
      ).toUpperCase();

      const next: VariantDraft[] = [];
      let idx = 0;
      for (const col of selectedColours) {
        for (const sz of selectedSizes) {
          const key = `${col.toLowerCase()}|${sz.toLowerCase()}`;
          const existing = existingByPair.get(key);
          if (existing) {
            next.push({
              ...existing,
              sizingSystem,
            });
          } else {
            const vSku = buildAutoVariantSku(baseCode, col, sz);
            next.push({
              colourName: col,
              sizeName: sz,
              sizingSystem,
              sku: vSku,
              barcode: makeBarcode(vSku, idx),
              costPrice: baseCostPrice || '0',
              sellingPrice: baseSellingPrice || '0',
              reorderLevel: reorderLevel || '3',
              openingStock: bulkQtyInput || '0',
              isActive: true,
              skuTouched: false,
              barcodeTouched: false,
            });
          }
          idx += 1;
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColours, selectedSizes, sizingSystem]);

  // Keep auto-generated SKUs & barcodes in sync as user types product name / base SKU
  useEffect(() => {
    if (!hydratedRef.current) return;
    const baseCode = (
      sku.trim() ||
      buildAutoBaseSku(name, brand, model, effectiveCategory?.name || '')
    ).toUpperCase();

    setVariants((prev) => {
      let changed = false;
      const next = prev.map((v, idx) => {
        if (v.id || v.skuTouched) return v;
        const nextSku = buildAutoVariantSku(baseCode, v.colourName, v.sizeName);
        if (nextSku === v.sku) return v;
        changed = true;
        return {
          ...v,
          sku: nextSku,
          barcode: v.barcodeTouched ? v.barcode : makeBarcode(nextSku, idx),
        };
      });
      return changed ? next : prev;
    });
  }, [name, sku, brand, model, effectiveCategory?.name]);

  // Propagate base cost / selling price changes smoothly to variants that haven't been individually customized
  const handleBaseCostChange = (nextVal: string) => {
    const prevVal = prevBaseCostRef.current;
    prevBaseCostRef.current = nextVal;
    setBaseCostPrice(nextVal);
    setVariants((prev) =>
      prev.map((v) =>
        !v.costPrice || v.costPrice === '0' || v.costPrice === prevVal
          ? { ...v, costPrice: nextVal || '0' }
          : v,
      ),
    );
  };

  const handleBaseSellingChange = (nextVal: string) => {
    const prevVal = prevBaseSellingRef.current;
    prevBaseSellingRef.current = nextVal;
    setBaseSellingPrice(nextVal);
    setVariants((prev) =>
      prev.map((v) =>
        !v.sellingPrice || v.sellingPrice === '0' || v.sellingPrice === prevVal
          ? { ...v, sellingPrice: nextVal || '0' }
          : v,
      ),
    );
  };

  const applyBasePricesToAll = () => {
    setVariants((prev) =>
      prev.map((v) => ({
        ...v,
        costPrice: baseCostPrice || v.costPrice,
        sellingPrice: baseSellingPrice || v.sellingPrice,
      })),
    );
    notify('Applied cost & selling price to all variants', 'ok');
  };

  const applyQtyToAll = () => {
    const cleanQty = String(Math.max(0, parseInt(bulkQtyInput, 10) || 0));
    setVariants((prev) =>
      prev.map((v) => (v.id ? v : { ...v, openingStock: cleanQty })),
    );
    notify(`Set quantity to ${cleanQty} for all new variants`, 'ok');
  };

  const numPrice = Number(baseSellingPrice) || 0;
  const numCost = Number(baseCostPrice) || 0;
  const marginPct =
    numPrice > 0 && numCost > 0 ? Math.round(((numPrice - numCost) / numPrice) * 100) : null;

  const autoGenerateSku = () => {
    const nextSku = buildAutoBaseSku(name, brand, model, effectiveCategory?.name || '');
    setSku(nextSku);
    return nextSku;
  };

  const toggleColour = (col: string) => {
    setSelectedColours((prev) =>
      prev.includes(col) ? (prev.length > 1 ? prev.filter((c) => c !== col) : prev) : [...prev, col],
    );
  };

  const addCustomColour = () => {
    const clean = customColourInput.trim();
    if (!clean) return;
    if (!selectedColours.some((c) => c.toLowerCase() === clean.toLowerCase())) {
      setSelectedColours((prev) => [...prev, clean]);
    }
    setCustomColourInput('');
  };

  const toggleSize = (sz: string) => {
    setSelectedSizes((prev) =>
      prev.some((s) => s.toLowerCase() === sz.toLowerCase())
        ? prev.filter((s) => s.toLowerCase() !== sz.toLowerCase())
        : [...prev, sz],
    );
  };

  const addCustomSizes = () => {
    const parts = customSizeInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length === 0) return;
    setSelectedSizes((prev) => {
      const next = [...prev];
      const existingLower = new Set(prev.map((s) => s.toLowerCase()));
      for (const p of parts) {
        if (!existingLower.has(p.toLowerCase())) {
          existingLower.add(p.toLowerCase());
          next.push(p);
        }
      }
      return next;
    });
    setCustomSizeInput('');
  };

  const handleSaveSizesToCategory = async () => {
    if (!effectiveCategory || selectedSizes.length === 0) return;
    setSavingCategorySizes(true);
    try {
      const merged = Array.from(new Set([...categoryConfiguredSizes, ...selectedSizes]));
      const res = await footwearInventoryService.updateCategory(effectiveCategory.id, {
        sizeOptions: merged,
        defaultSizingSystem: sizingSystem,
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === res.category.id ? { ...c, ...res.category } : c)),
      );
      notify(`Saved ${merged.length} default size options to ${effectiveCategory.name}`, 'ok');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Could not save category size options', 'err');
    } finally {
      setSavingCategorySizes(false);
    }
  };

  const updateVariantField = (idx: number, field: keyof VariantDraft, value: string | boolean) => {
    setVariants((prev) =>
      prev.map((row, i) => {
        if (i !== idx) return row;
        return {
          ...row,
          [field]: value,
          ...(field === 'sku' ? { skuTouched: true } : {}),
          ...(field === 'barcode' ? { barcodeTouched: true } : {}),
        };
      }),
    );
  };

  const removeVariantRow = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImg(true);
    try {
      const uploaded = await footwearInventoryService.uploadProductImage(file);
      setImages((prev) => [
        ...prev,
        {
          storagePath: uploaded.storagePath,
          signedUrl: uploaded.signedUrl,
          isPrimary: prev.length === 0,
        },
      ]);
      notify('Product photo uploaded', 'ok');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Image upload failed', 'err');
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      notify('Enter an article number or product name', 'err');
      return;
    }
    if (parentCategories.length > 0 && !parentCategoryId) {
      notify('Select a category first', 'err');
      return;
    }
    if (availableChildren.length > 0 && !childCategoryId) {
      notify(`Select a child category under ${selectedParent?.name || 'this category'}`, 'err');
      return;
    }
    if (numPrice <= 0) {
      notify('Enter a valid selling price', 'err');
      return;
    }
    if (variants.length === 0) {
      notify('Select at least one colour and one size so variants can be created', 'err');
      return;
    }

    const finalSku = (sku.trim() || autoGenerateSku()).toUpperCase();
    const resolvedCategoryId = childCategoryId || parentCategoryId || null;
    const resolvedFootwearType = isBagProduct
      ? effectiveCategory?.name || 'Bags / Handbags'
      : footwearType || effectiveCategory?.name || FOOTWEAR_TYPES[0];

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        brand: brand.trim() || null,
        model: model.trim() || null,
        categoryId: resolvedCategoryId,
        footwearType: resolvedFootwearType,
        gender: gender || inferGenderFromCategoryName(effectiveCategory?.name) || null,
        description: description.trim() || null,
        material: material.trim() || null,
        upperMaterial: upperMaterial.trim() || null,
        soleMaterial: soleMaterial.trim() || null,
        sizingSystem,
        sku: finalSku,
        baseCostPrice: numCost,
        baseSellingPrice: numPrice,
        reorderLevel: Number(reorderLevel) || 3,
        isActive,
        images: images.map((img, i) => ({
          storagePath: img.storagePath,
          imageUrl: img.imageUrl ?? null,
          isPrimary: img.isPrimary || i === 0,
        })),
        variants: variants.map((v, idx) => ({
          ...(v.id ? { id: v.id } : {}),
          colourName: v.colourName,
          sizeName: v.sizeName,
          sizingSystem: v.sizingSystem,
          sku:
            v.sku.trim().toUpperCase() ||
            `${finalSku}-${makeSkuPart(v.colourName, 3)}-${v.sizeName.replace(/[^A-Za-z0-9.]/g, '').toUpperCase() || idx + 1}`,
          barcode: v.barcode.trim().toUpperCase() || undefined,
          costPrice: Number(v.costPrice) || numCost,
          sellingPrice: Number(v.sellingPrice) || numPrice,
          reorderLevel: Number(v.reorderLevel) || Number(reorderLevel) || 3,
          openingStock: Math.max(0, Number(v.openingStock) || 0),
          isActive: v.isActive,
        })),
      };

      if (itemId) {
        await footwearInventoryService.updateProduct(itemId, payload);
        notify(`Updated ${name.trim()}`, 'ok');
      } else {
        await footwearInventoryService.createProduct(payload);
        notify(`Added ${name.trim()} (${variants.length} variants) to stock`, 'ok');
      }
      router.push('/inventory');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to save product', 'err');
    } finally {
      setSaving(false);
    }
  };

  const previewVariant = useMemo(
    () => variants[previewIdx] ?? variants[0] ?? null,
    [variants, previewIdx],
  );

  const totalNewQty = useMemo(
    () => variants.reduce((sum, v) => sum + Math.max(0, Number(v.openingStock) || 0), 0),
    [variants],
  );

  const hasUnsavedSizesForCategory = useMemo(() => {
    if (!effectiveCategory || selectedSizes.length === 0) return false;
    const existingLower = new Set(categoryConfiguredSizes.map((s) => s.toLowerCase()));
    return selectedSizes.some((s) => !existingLower.has(s.toLowerCase()));
  }, [effectiveCategory, selectedSizes, categoryConfiguredSizes]);

  if (loading) {
    return (
      <div className="max-w-[920px] space-y-5">
        <PageHeader eyebrow="Stock catalog" title="Loading product..." />
        <Card className="p-8 text-center text-[14px] text-[#52666A]">
          Fetching product details, variants, and barcodes from Supabase...
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[960px] space-y-5 pb-8">
      <PageHeader
        eyebrow={itemId ? `Edit product · ${sku}` : 'New stock item'}
        title={itemId ? name || 'Edit product' : 'Add product'}
        subtitle="Select a category, add colours and sizes, and enter quantities for each variant automatically."
        actions={
          <div className="flex items-center gap-2">
            <Link href="/inventory/categories">
              <Button variant="secondary" size="sm">
                <FolderKanban className="w-4 h-4" /> Categories
              </Button>
            </Link>
            <Link href="/inventory">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="w-4 h-4" /> Back to stock
              </Button>
            </Link>
          </div>
        }
      />

      {/* Section 1: Category & Product Info */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div>
            <h2 className="font-display text-[16px] font-bold text-[#0B2A2F]">
              1. Category &amp; product info
            </h2>
            <p className="text-[12px] text-[#52666A]">
              Choose parent category (e.g. Footwear or Bags / Handbags) and child category if applicable.
            </p>
          </div>
          {effectiveCategory && (
            <Badge tone="neutral">
              {selectedChild && selectedParent
                ? `${selectedParent.name} › ${selectedChild.name}`
                : effectiveCategory.name}
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Category"
            value={parentCategoryId}
            onChange={(e) => handleParentCategoryChange(e.target.value)}
            options={[
              {
                value: '',
                label:
                  parentCategories.length > 0
                    ? 'Select parent category...'
                    : 'No categories yet — create in Categories',
              },
              ...parentCategories.map((c) => ({
                value: c.id,
                label: c.name,
              })),
            ]}
          />

          {availableChildren.length > 0 ? (
            <Select
              label={`${selectedParent?.name || 'Parent'} sub-category`}
              value={childCategoryId}
              onChange={(e) => handleChildCategoryChange(e.target.value)}
              options={[
                { value: '', label: 'Select child category...' },
                ...availableChildren.map((c) => ({
                  value: c.id,
                  label: c.name,
                })),
              ]}
            />
          ) : (
            <Select
              label="Product status"
              value={isActive ? 'active' : 'inactive'}
              onChange={(e) => setIsActive(e.target.value === 'active')}
              options={[
                { value: 'active', label: 'Active (visible on POS)' },
                { value: 'inactive', label: 'Inactive (hidden from POS)' },
              ]}
            />
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <Input
              label="Article number / product name"
              placeholder={
                isBagProduct
                  ? 'e.g. Handbag 001 / Classic Leather Tote'
                  : 'e.g. ART-402 Runner / Nike Pegasus 40'
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Input
            label="Base SKU (optional)"
            placeholder="Auto-generated if empty"
            value={sku}
            onChange={(e) => setSku(e.target.value.toUpperCase())}
            suffixNode={
              <button
                type="button"
                onClick={autoGenerateSku}
                className="text-[12px] font-semibold text-[#08343A] flex items-center gap-1"
              >
                <Sparkles className="w-3.5 h-3.5" /> Auto
              </button>
            }
          />
        </div>

        {/* Optional Product Image */}
        <div className="space-y-2 pt-2 border-t border-[#F1EBE3]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-[13px] font-semibold text-[#0B2A2F]">
              Product image (optional){images.length > 0 ? ` · ${images.length}` : ''}
            </div>
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] border border-[#D6CDC1] bg-white text-[12px] font-semibold text-[#0B2A2F] cursor-pointer hover:bg-[#F8F4EF]">
              <Upload className="w-3.5 h-3.5" />
              {uploadingImg ? 'Uploading...' : 'Upload photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleImageUpload}
                disabled={uploadingImg}
                className="hidden"
              />
            </label>
          </div>
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2.5">
              {images.map((img, i) => (
                <div
                  key={img.storagePath}
                  className="relative w-20 h-20 rounded-[10px] border border-[#E7E0D7] overflow-hidden bg-[#F1EBE3]"
                >
                  {img.signedUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={img.signedUrl}
                      alt="Product preview"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center"
                    aria-label="Remove image"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible Optional Product Attributes */}
        <div className="pt-2 border-t border-[#F1EBE3]">
          <button
            type="button"
            onClick={() => setShowMoreDetails((v) => !v)}
            className="text-[13px] font-semibold text-[#08343A] flex items-center gap-1.5 hover:underline"
          >
            {showMoreDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            More product details (brand, style, materials, notes)
          </button>

          {showMoreDetails && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Brand (optional)"
                  placeholder="e.g. Nike, Bata, Servis, Aldo"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
                <Input
                  label="Model / style code (optional)"
                  placeholder="e.g. Runner Pro / Classic Tote"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
                {availableChildren.length > 0 && (
                  <Select
                    label="Product status"
                    value={isActive ? 'active' : 'inactive'}
                    onChange={(e) => setIsActive(e.target.value === 'active')}
                    options={[
                      { value: 'active', label: 'Active (visible on POS)' },
                      { value: 'inactive', label: 'Inactive (hidden from POS)' },
                    ]}
                  />
                )}
              </div>

              {!isBagProduct && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Footwear style (optional)"
                    value={footwearType}
                    onChange={(e) => setFootwearType(e.target.value)}
                    options={FOOTWEAR_TYPES.map((t) => ({ value: t, label: t }))}
                  />
                  <Select
                    label="Gender tag (optional)"
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    options={[
                      { value: '', label: 'Auto from category' },
                      ...FOOTWEAR_GENDERS.map((g) => ({ value: g, label: g })),
                    ]}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Material"
                  placeholder="e.g. Leather, Canvas, Mesh"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                />
                {!isBagProduct && (
                  <>
                    <Input
                      label="Upper material"
                      placeholder="e.g. Knit / Synthetic"
                      value={upperMaterial}
                      onChange={(e) => setUpperMaterial(e.target.value)}
                    />
                    <Input
                      label="Sole material"
                      placeholder="e.g. Rubber / EVA"
                      value={soleMaterial}
                      onChange={(e) => setSoleMaterial(e.target.value)}
                    />
                  </>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-semibold text-[#0B2A2F]">
                  Description / notes
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Fit guidance, compartments, or care instructions..."
                  className="field rounded-[10px] border border-[#8A8276] p-3 text-[13px] bg-white"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Section 2: Pricing, Colours & Configurable Sizes */}
      <Card className="space-y-5">
        <div>
          <h2 className="font-display text-[16px] font-bold text-[#0B2A2F]">
            2. Pricing, colours &amp; sizes
          </h2>
          <p className="text-[12px] text-[#52666A]">
            Set prices and pick colours &amp; sizes — variants are generated automatically below.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label={`Cost price (Rs / ${unitLabel})`}
            type="number"
            min={0}
            placeholder="e.g. 2500"
            value={baseCostPrice}
            onChange={(e) => handleBaseCostChange(e.target.value)}
          />
          <Input
            label={`Selling price (Rs / ${unitLabel})`}
            type="number"
            min={0}
            placeholder="e.g. 4200"
            value={baseSellingPrice}
            onChange={(e) => handleBaseSellingChange(e.target.value)}
          />
          <Input
            label="Low-stock alert"
            type="number"
            min={0}
            value={reorderLevel}
            onChange={(e) => setReorderLevel(e.target.value)}
          />
        </div>

        {marginPct !== null && (
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge tone={marginPct >= 20 ? 'ok' : 'warn'}>Margin: {marginPct}%</Badge>
              <span className="text-[12px] text-[#52666A] num">
                Profit per {unitLabel}: {formatRs(numPrice - numCost)}
              </span>
            </div>
            {variants.length > 0 && (
              <Button size="sm" variant="secondary" type="button" onClick={applyBasePricesToAll}>
                Apply base prices to all variants
              </Button>
            )}
          </div>
        )}

        {/* Colours */}
        <div className="space-y-3 pt-3 border-t border-[#F1EBE3]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-[13px] font-semibold text-[#0B2A2F]">
              Colours ({selectedColours.length} selected)
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={customColourInput}
                onChange={(e) => setCustomColourInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomColour();
                  }
                }}
                placeholder="Add custom colour..."
                className="field h-[34px] px-2.5 rounded-[8px] border border-[#8A8276] text-[12px] bg-white"
              />
              <Button size="sm" variant="secondary" type="button" onClick={addCustomColour}>
                <Plus className="w-3.5 h-3.5" /> Add
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {Array.from(new Set([...SWATCH_LIST.slice(0, 14), ...selectedColours])).map((c) => {
              const active = selectedColours.includes(c);
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => toggleColour(c)}
                  className={`px-2.5 py-1.5 rounded-[9px] border text-[12px] font-semibold flex items-center gap-1.5 transition-colors ${
                    active
                      ? 'border-[#08343A] bg-[#08343A] text-white'
                      : 'border-[#D6CDC1] bg-white text-[#0B2A2F] hover:bg-[#F8F4EF]'
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/20"
                    style={{ backgroundColor: SWATCHES[c] || '#8C918E' }}
                  />
                  {c}
                  {active && <Check className="w-3 h-3" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Configurable Sizes */}
        <div className="space-y-3 pt-3 border-t border-[#F1EBE3]">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-[13px] font-semibold text-[#0B2A2F]">
                Sizes ({selectedSizes.length} selected)
              </div>
              <div className="text-[12px] text-[#52666A]">
                {isBagProduct
                  ? 'Pick One Size, Small, Medium, Large, or add custom bag sizes.'
                  : effectiveCategory
                    ? `Configurable sizes for ${effectiveCategory.name}. Click to toggle or add custom sizes.`
                    : 'Select a category or add sizes below.'}
              </div>
            </div>
            {hasUnsavedSizesForCategory && effectiveCategory && (
              <Button
                size="sm"
                variant="secondary"
                type="button"
                disabled={savingCategorySizes}
                onClick={() => void handleSaveSizesToCategory()}
              >
                <Save className="w-3.5 h-3.5" />
                {savingCategorySizes
                  ? 'Saving...'
                  : `Save sizes to ${effectiveCategory.name}`}
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <Select
              label="Size format"
              value={sizingSystem}
              onChange={(e) => setSizingSystem(e.target.value as SizingSystem)}
              options={SIZING_SYSTEMS.map((sys) => ({
                value: sys,
                label:
                  sys === 'STANDARD'
                    ? 'Standard (One Size / S / M / L / Custom)'
                    : `${sys} Sizing`,
              }))}
            />
            <Input
              label="Add custom sizes (comma separated)"
              placeholder={
                sizingSystem === 'STANDARD'
                  ? 'e.g. Mini, Extra Large, 14 inch'
                  : 'e.g. 38, 39, 40, 41, 42'
              }
              value={customSizeInput}
              onChange={(e) => setCustomSizeInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomSizes();
                }
              }}
            />
            <Button variant="secondary" type="button" onClick={addCustomSizes}>
              <Plus className="w-4 h-4" /> Add sizes
            </Button>
          </div>

          {selectableSizeOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {selectableSizeOptions.map((sz) => {
                const active = selectedSizes.some(
                  (s) => s.toLowerCase() === sz.toLowerCase(),
                );
                return (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => toggleSize(sz)}
                    className={`px-3 py-1.5 rounded-[9px] border text-[12px] font-semibold flex items-center gap-1.5 transition-colors ${
                      active
                        ? 'border-[#08343A] bg-[#08343A] text-white'
                        : 'border-[#D6CDC1] bg-white text-[#0B2A2F] hover:bg-[#F8F4EF]'
                    }`}
                  >
                    {formatVariantSizeLabel(sz, sizingSystem)}
                    {active && <Check className="w-3 h-3" />}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-3 rounded-[10px] border border-dashed border-[#D6CDC1] bg-[#FBF8F4] text-[12px] text-[#52666A]">
              No sizes configured for{' '}
              <strong className="text-[#0B2A2F]">
                {effectiveCategory?.name || 'this category'}
              </strong>{' '}
              yet. Enter sizes above (e.g. <span className="mono">40, 41, 42, 43</span>) or
              configure default sizes in{' '}
              <Link href="/inventory/categories" className="font-semibold text-[#08343A] underline">
                Categories
              </Link>
              .
            </div>
          )}
        </div>
      </Card>

      {/* Section 3: Auto-generated Variants & Quantities */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-display text-[16px] font-bold text-[#0B2A2F]">
              3. Variants &amp; quantities ({variants.length})
            </h2>
            <p className="text-[12px] text-[#52666A]">
              Auto-generated for every colour &times; size combination. Enter quantities against each
              row ({totalNewQty} total {unitPlural}).
            </p>
          </div>
          {!itemId && (
            <div className="flex items-end gap-2">
              <div className="w-[110px]">
                <Input
                  label="Quick qty"
                  type="number"
                  min={0}
                  value={bulkQtyInput}
                  onChange={(e) => setBulkQtyInput(e.target.value)}
                />
              </div>
              <Button size="sm" variant="secondary" type="button" onClick={applyQtyToAll}>
                Set all
              </Button>
            </div>
          )}
        </div>

        {variants.length === 0 ? (
          <div className="p-6 rounded-[11px] border border-dashed border-[#D6CDC1] bg-[#FBF8F4] text-center text-[13px] text-[#52666A]">
            Select at least one <strong>colour</strong> and one <strong>size</strong> above to
            automatically build the variant matrix.
          </div>
        ) : (
          <div className="overflow-x-auto border border-[#E7E0D7] rounded-[11px]">
            <table className="w-full text-[12px]">
              <thead className="bg-[#FBF8F4] text-[#52666A] text-left">
                <tr>
                  <th className="p-2.5 font-semibold">Colour &amp; Size</th>
                  <th className="p-2.5 font-semibold text-end">
                    {itemId ? 'Stock / Opening' : `Qty (${unitPlural})`}
                  </th>
                  <th className="p-2.5 font-semibold text-end">Cost (Rs)</th>
                  <th className="p-2.5 font-semibold text-end">Selling (Rs)</th>
                  <th className="p-2.5 font-semibold">SKU</th>
                  <th className="p-2.5 font-semibold">Barcode</th>
                  <th className="p-2.5 font-semibold text-center">Remove</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EBE3]">
                {variants.map((v, idx) => (
                  <tr key={`${v.colourName}-${v.sizeName}-${idx}`} className="bg-white">
                    <td className="p-2 font-semibold text-[#0B2A2F] whitespace-nowrap">
                      <span className="inline-flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                          style={{ backgroundColor: SWATCHES[v.colourName] || '#8C918E' }}
                        />
                        {formatVariantDisplay(v.colourName, v.sizeName, v.sizingSystem)}
                      </span>
                    </td>
                    <td className="p-2 text-end">
                      {v.id ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-[7px] bg-[#FBF8F4] border border-[#E7E0D7] text-[#3D5357] font-semibold num">
                          {v.openingStock} {unitPlural}
                        </span>
                      ) : (
                        <input
                          type="number"
                          min={0}
                          value={v.openingStock}
                          onChange={(e) => updateVariantField(idx, 'openingStock', e.target.value)}
                          className="field w-[72px] h-[32px] px-2 rounded-[7px] border border-[#D6CDC1] text-end num font-semibold"
                        />
                      )}
                    </td>
                    <td className="p-2 text-end">
                      <input
                        type="number"
                        min={0}
                        value={v.costPrice}
                        onChange={(e) => updateVariantField(idx, 'costPrice', e.target.value)}
                        className="field w-[82px] h-[32px] px-2 rounded-[7px] border border-[#D6CDC1] text-end num"
                      />
                    </td>
                    <td className="p-2 text-end">
                      <input
                        type="number"
                        min={0}
                        value={v.sellingPrice}
                        onChange={(e) => updateVariantField(idx, 'sellingPrice', e.target.value)}
                        className="field w-[82px] h-[32px] px-2 rounded-[7px] border border-[#D6CDC1] text-end num font-semibold"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={v.sku}
                        onChange={(e) =>
                          updateVariantField(idx, 'sku', e.target.value.toUpperCase())
                        }
                        className="field w-[135px] h-[32px] px-2 rounded-[7px] border border-[#D6CDC1] mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={v.barcode}
                        onChange={(e) =>
                          updateVariantField(idx, 'barcode', e.target.value.toUpperCase())
                        }
                        className="field w-[150px] h-[32px] px-2 rounded-[7px] border border-[#D6CDC1] mono"
                      />
                    </td>
                    <td className="p-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeVariantRow(idx)}
                        className="text-[#B42318] hover:opacity-75 p-1"
                        title="Remove variant"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {previewVariant && (
          <div className="pt-2 space-y-2 border-t border-[#F1EBE3]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-[12px] font-semibold uppercase tracking-wider text-[#52666A]">
                Barcode label preview
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={Math.min(previewIdx, Math.max(0, variants.length - 1))}
                  onChange={(e) => setPreviewIdx(Number(e.target.value))}
                  className="h-[32px] px-2 rounded-[8px] border border-[#D6CDC1] text-[12px] bg-white"
                >
                  {variants.map((v, i) => (
                    <option key={i} value={i}>
                      {formatVariantDisplay(v.colourName, v.sizeName, v.sizingSystem)}
                    </option>
                  ))}
                </select>
                <Button size="sm" variant="secondary" type="button" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5" /> Print
                </Button>
              </div>
            </div>
            <div className="zyro-print-area">
              <BarcodePreview
                code={previewVariant.barcode || previewVariant.sku}
                label={`${name || 'Product'} · ${formatVariantDisplay(
                  previewVariant.colourName,
                  previewVariant.sizeName,
                  previewVariant.sizingSystem,
                )}`}
                priceText={formatRs(Number(previewVariant.sellingPrice) || numPrice)}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-3 border-t border-[#F1EBE3]">
          <Link href="/inventory">
            <Button variant="secondary" type="button">
              Cancel
            </Button>
          </Link>
          <Button variant="primary" size="lg" disabled={saving} onClick={() => void handleSave()}>
            {saving
              ? 'Saving...'
              : itemId
                ? 'Save product changes'
                : `Save product (${variants.length} variant${variants.length === 1 ? '' : 's'})`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
