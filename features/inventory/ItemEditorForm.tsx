'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Plus, Printer, Save, Sparkles, Trash2, Upload } from 'lucide-react';
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
  FOOTWEAR_CHILD_GROUPS,
  FOOTWEAR_SIZING_SYSTEMS,
  FOOTWEAR_TYPES,
  PARENT_CATEGORY_OPTIONS,
  formatVariantDisplay,
  formatVariantSizeLabel,
  type FootwearCategoryRecord,
  type FootwearProductRecord,
  type ParentCategoryKey,
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

function buildAutoBaseSku(name: string, brand: string, model: string, fallback: string): string {
  const cleanName = (model || name).replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  if (cleanName.length >= 3) {
    const prefix = brand ? `${makeSkuPart(brand, 3)}-` : '';
    return `${prefix}${cleanName.slice(0, 10)}`;
  }
  return `${makeSkuPart(brand || fallback || 'PRD', 3)}-${makeSkuPart(name || 'ITEM', 4)}`;
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

function isBagLikeText(text: string | null | undefined): boolean {
  if (!text) return false;
  return /\b(bag|bags|handbag|handbags|purse|purses|clutch|clutches|tote|totes|backpack|backpacks|wallet|wallets)\b/i.test(
    text,
  );
}

function detectCategoryScope(cat: FootwearCategoryRecord | null | undefined): ParentCategoryKey {
  if (!cat) return 'footwear';
  if (cat.categoryScope === 'bags' || cat.defaultSizingSystem === 'STANDARD') return 'bags';
  if (isBagLikeText(cat.name) || isBagLikeText(cat.parentName)) return 'bags';
  return 'footwear';
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

  // Original 3-tab stepper design
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Product Details
  const [parentKey, setParentKey] = useState<ParentCategoryKey>('footwear');
  const [childGroup, setChildGroup] = useState<string>(FOOTWEAR_CHILD_GROUPS[0]);
  const [footwearType, setFootwearType] = useState<string>(FOOTWEAR_TYPES[0]);
  const [categoryId, setCategoryId] = useState<string>('');
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [material, setMaterial] = useState('');
  const [upperMaterial, setUpperMaterial] = useState('');
  const [soleMaterial, setSoleMaterial] = useState('');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [images, setImages] = useState<ImageDraft[]>([]);

  // Step 2: Pricing & Configurable Variants
  const [sku, setSku] = useState('');
  const [baseSellingPrice, setBaseSellingPrice] = useState('');
  const [baseCostPrice, setBaseCostPrice] = useState('');
  const [reorderLevel, setReorderLevel] = useState('3');
  const [sizingSystem, setSizingSystem] = useState<SizingSystem>('EU');
  const [selectedColours, setSelectedColours] = useState<string[]>(['Black']);
  const [customColourInput, setCustomColourInput] = useState('');
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [customSizeInput, setCustomSizeInput] = useState('');
  const [defaultOpeningQty, setDefaultOpeningQty] = useState('5');

  // Step 3: Barcodes & Stock
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [previewIdx, setPreviewIdx] = useState(0);

  const hydratedRef = useRef(!itemId);
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
          const bagMode =
            p.sizingSystem === 'STANDARD' ||
            p.unitOfMeasure === 'piece' ||
            isBagLikeText(p.categoryPath) ||
            isBagLikeText(p.categoryName);
          setParentKey(bagMode ? 'bags' : 'footwear');
          setName(p.name);
          setBrand(p.brand || '');
          setModel(p.model || '');
          setFootwearType(
            FOOTWEAR_TYPES.includes(p.footwearType as (typeof FOOTWEAR_TYPES)[number])
              ? p.footwearType
              : FOOTWEAR_TYPES[0],
          );
          setCategoryId(p.categoryId || '');
          if (p.gender && FOOTWEAR_CHILD_GROUPS.includes(p.gender as (typeof FOOTWEAR_CHILD_GROUPS)[number])) {
            setChildGroup(p.gender);
          } else if (p.gender === 'Boys' || p.gender === 'Girls') {
            setChildGroup('Kids');
          } else {
            setChildGroup('Men');
          }
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
          setSizingSystem(bagMode ? 'STANDARD' : p.sizingSystem === 'STANDARD' ? 'EU' : p.sizingSystem || 'EU');
          setSelectedColours(p.colours.length > 0 ? p.colours : ['Black']);
          setSelectedSizes(p.sizes.length > 0 ? p.sizes : []);
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
              skuTouched: true,
              barcodeTouched: true,
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

  // Filter catalog categories matching the selected parent (Footwear vs Bags / Handbags)
  const matchingCatalogCategories = useMemo(() => {
    return categories.filter((c) => c.isActive && detectCategoryScope(c) === parentKey);
  }, [categories, parentKey]);

  const selectedCategoryRecord = useMemo(
    () => categories.find((c) => c.id === categoryId) ?? null,
    [categories, categoryId],
  );

  // Sync loaded product's category scope once categories arrive (if editing)
  useEffect(() => {
    if (!loadedProduct || categories.length === 0) return;
    const cat = categories.find((c) => c.id === loadedProduct.categoryId);
    if (cat?.childGroup && FOOTWEAR_CHILD_GROUPS.includes(cat.childGroup as (typeof FOOTWEAR_CHILD_GROUPS)[number])) {
      setChildGroup(cat.childGroup);
    }
  }, [loadedProduct, categories]);

  const isBagProduct = parentKey === 'bags';
  const unitLabel = isBagProduct ? 'piece' : 'pair';
  const unitPlural = isBagProduct ? 'pcs' : 'pairs';

  // Category-configured size options (NOT hardcoded for footwear)
  const categoryConfiguredSizes = useMemo(() => {
    if (selectedCategoryRecord?.sizeOptions?.length) {
      return selectedCategoryRecord.sizeOptions;
    }
    // Check if there is a category matching childGroup + footwearType
    if (!isBagProduct) {
      const matched = matchingCatalogCategories.find(
        (c) =>
          (c.childGroup?.toLowerCase() === childGroup.toLowerCase() &&
            c.footwearType?.toLowerCase() === footwearType.toLowerCase()) ||
          c.name.toLowerCase().includes(childGroup.toLowerCase()),
      );
      if (matched?.sizeOptions?.length) return matched.sizeOptions;
    }
    return [] as string[];
  }, [selectedCategoryRecord, isBagProduct, matchingCatalogCategories, childGroup, footwearType]);

  // Selectable size chips shown in Step 2
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

  const handleParentKeyChange = (nextKey: ParentCategoryKey) => {
    setParentKey(nextKey);
    setCategoryId('');
    if (nextKey === 'bags') {
      setSizingSystem('STANDARD');
      if (!itemId) {
        setSelectedSizes(['One Size']);
      }
    } else {
      setSizingSystem((prev) => (prev === 'STANDARD' ? 'EU' : prev));
      if (!itemId) {
        setSelectedSizes((prev) =>
          prev.filter(
            (sz) => !BAG_STANDARD_SIZES.some((b) => b.toLowerCase() === sz.toLowerCase()),
          ),
        );
      }
    }
  };

  const handleCategorySelect = (nextCatId: string) => {
    setCategoryId(nextCatId);
    const cat = categories.find((c) => c.id === nextCatId);
    if (!cat) return;
    if (parentKey === 'footwear') {
      if (cat.childGroup && FOOTWEAR_CHILD_GROUPS.includes(cat.childGroup as (typeof FOOTWEAR_CHILD_GROUPS)[number])) {
        setChildGroup(cat.childGroup);
      }
      if (cat.footwearType && FOOTWEAR_TYPES.includes(cat.footwearType as (typeof FOOTWEAR_TYPES)[number])) {
        setFootwearType(cat.footwearType);
      }
      if (cat.defaultSizingSystem && cat.defaultSizingSystem !== 'STANDARD') {
        setSizingSystem(cat.defaultSizingSystem);
      }
      if (!itemId && cat.sizeOptions.length > 0) {
        setSelectedSizes(cat.sizeOptions);
      }
    } else if (!itemId && cat.sizeOptions.length > 0) {
      setSelectedSizes([cat.sizeOptions[0]]);
    }
  };

  const numPrice = Number(baseSellingPrice) || 0;
  const numCost = Number(baseCostPrice) || 0;
  const marginPct =
    numPrice > 0 && numCost > 0 ? Math.round(((numPrice - numCost) / numPrice) * 100) : null;

  const autoGenerateSku = () => {
    const nextSku = buildAutoBaseSku(
      name,
      brand,
      model,
      isBagProduct ? 'BAG' : footwearType,
    );
    setSku(nextSku);
    return nextSku;
  };

  // Auto-sync variants whenever selectedColours, selectedSizes, or sizingSystem changes
  useEffect(() => {
    if (!hydratedRef.current) return;
    setVariants((prev) => {
      const existingByPair = new Map<string, VariantDraft>();
      for (const v of prev) {
        existingByPair.set(`${v.colourName.toLowerCase()}|${v.sizeName.toLowerCase()}`, v);
      }

      const baseCode = (
        sku.trim() ||
        buildAutoBaseSku(name, brand, model, isBagProduct ? 'BAG' : footwearType)
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
              openingStock: defaultOpeningQty || '0',
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

  // Keep unedited variant SKUs & barcodes synced to product name / base SKU
  useEffect(() => {
    if (!hydratedRef.current) return;
    const baseCode = (
      sku.trim() ||
      buildAutoBaseSku(name, brand, model, isBagProduct ? 'BAG' : footwearType)
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
  }, [name, sku, brand, model, isBagProduct, footwearType]);

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

  const generateVariantCombinations = () => {
    if (selectedColours.length === 0 || selectedSizes.length === 0) {
      notify('Add at least one colour and one size before generating variants', 'err');
      return;
    }
    const baseCode = sku.trim().toUpperCase() || autoGenerateSku();
    const existingMap = new Map(
      variants.map((v) => [`${v.colourName.toLowerCase()}|${v.sizeName.toLowerCase()}`, v]),
    );

    const next: VariantDraft[] = [];
    let idx = 0;
    for (const col of selectedColours) {
      for (const sz of selectedSizes) {
        const key = `${col.toLowerCase()}|${sz.toLowerCase()}`;
        const prev = existingMap.get(key);
        if (prev) {
          next.push({
            ...prev,
            sizingSystem,
            openingStock: prev.id ? prev.openingStock : prev.openingStock || defaultOpeningQty || '0',
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
            openingStock: defaultOpeningQty || '0',
            isActive: true,
            skuTouched: false,
            barcodeTouched: false,
          });
        }
        idx += 1;
      }
    }
    setVariants(next);
    notify(`Prepared ${next.length} variant combinations`, 'ok');
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
    if (!selectedCategoryRecord || selectedSizes.length === 0) return;
    setSavingCategorySizes(true);
    try {
      const merged = Array.from(new Set([...categoryConfiguredSizes, ...selectedSizes]));
      const res = await footwearInventoryService.updateCategory(selectedCategoryRecord.id, {
        sizeOptions: merged,
        defaultSizingSystem: sizingSystem,
      });
      setCategories((prev) =>
        prev.map((c) => (c.id === res.category.id ? { ...c, ...res.category } : c)),
      );
      notify(`Saved ${merged.length} size options to ${selectedCategoryRecord.name}`, 'ok');
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
      notify('Product photo uploaded to Supabase Storage', 'ok');
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Image upload failed', 'err');
    } finally {
      setUploadingImg(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      notify('Enter a product name or article number', 'err');
      setStep(1);
      return;
    }
    if (numPrice <= 0) {
      notify('Enter a valid selling price', 'err');
      setStep(2);
      return;
    }

    const finalSku = (sku.trim() || autoGenerateSku()).toUpperCase();
    let finalVariants = variants;
    if (finalVariants.length === 0 && selectedColours.length > 0 && selectedSizes.length > 0) {
      const built: VariantDraft[] = [];
      let idx = 0;
      for (const col of selectedColours) {
        for (const sz of selectedSizes) {
          const vSku = buildAutoVariantSku(finalSku, col, sz);
          built.push({
            colourName: col,
            sizeName: sz,
            sizingSystem,
            sku: vSku,
            barcode: makeBarcode(vSku, idx),
            costPrice: String(numCost),
            sellingPrice: String(numPrice),
            reorderLevel: reorderLevel || '3',
            openingStock: defaultOpeningQty || '0',
            isActive: true,
          });
          idx += 1;
        }
      }
      finalVariants = built;
    }

    if (finalVariants.length === 0) {
      notify('Select at least one colour and one size to generate variants', 'err');
      setStep(2);
      return;
    }

    // Resolve categoryId: use chosen catalog category, or auto-match the parent Bags / Handbags category if present
    let resolvedCategoryId = categoryId || null;
    if (!resolvedCategoryId && isBagProduct) {
      const bagParent = categories.find(
        (c) => !c.parentId && isBagLikeText(c.name) && c.isActive,
      );
      if (bagParent) resolvedCategoryId = bagParent.id;
    }

    const finalSizingSystem: SizingSystem = isBagProduct
      ? 'STANDARD'
      : sizingSystem === 'STANDARD'
        ? 'EU'
        : sizingSystem;

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        brand: brand.trim() || null,
        model: model.trim() || null,
        categoryId: resolvedCategoryId,
        footwearType: isBagProduct ? 'Bags / Handbags' : footwearType,
        gender: isBagProduct ? null : childGroup,
        description: description.trim() || null,
        material: material.trim() || null,
        upperMaterial: isBagProduct ? null : upperMaterial.trim() || null,
        soleMaterial: isBagProduct ? null : soleMaterial.trim() || null,
        sizingSystem: finalSizingSystem,
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
        variants: finalVariants.map((v) => ({
          ...(v.id ? { id: v.id } : {}),
          colourName: v.colourName,
          sizeName: v.sizeName,
          sizingSystem: finalSizingSystem,
          sku: v.sku.trim().toUpperCase(),
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
        notify(`Added ${name.trim()} (${finalVariants.length} variants) to stock`, 'ok');
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

  const hasUnsavedSizesForCategory = useMemo(() => {
    if (!selectedCategoryRecord || selectedSizes.length === 0) return false;
    const existingLower = new Set(categoryConfiguredSizes.map((s) => s.toLowerCase()));
    return selectedSizes.some((s) => !existingLower.has(s.toLowerCase()));
  }, [selectedCategoryRecord, selectedSizes, categoryConfiguredSizes]);

  const sizingOptions = isBagProduct
    ? [{ value: 'STANDARD', label: 'Standard (One Size / S / M / L)' }]
    : FOOTWEAR_SIZING_SYSTEMS.map((sys) => ({
        value: sys,
        label: `${sys} Sizing (${sys === 'EU' ? 'e.g. 38–46' : sys === 'UK' ? 'e.g. 5–12' : 'e.g. 6–13'})`,
      }));

  if (loading) {
    return (
      <div className="max-w-[880px] space-y-5">
        <PageHeader eyebrow="Stock catalog" title="Loading product..." />
        <Card className="p-8 text-center text-[14px] text-[#52666A]">
          Fetching product attributes, variants, and barcodes from Supabase...
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[920px] space-y-5">
      <PageHeader
        eyebrow={itemId ? `Edit product · ${sku}` : 'New stock product'}
        title={itemId ? name || 'Edit product' : 'Add product'}
        subtitle={
          isBagProduct
            ? 'Configure bag details, Standard S / M / L or custom sizes, colours, barcodes, and opening stock.'
            : 'Configure footwear specs, EU/UK/US size matrix, colours, barcodes, and opening branch stock.'
        }
        actions={
          <Link href="/inventory">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to stock
            </Button>
          </Link>
        }
      />

      {/* Original 3-tab Stepper */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { n: 1 as const, label: '1. Product details' },
          { n: 2 as const, label: '2. Pricing & variants' },
          { n: 3 as const, label: '3. Barcodes & stock' },
        ].map((s) => (
          <button
            key={s.n}
            type="button"
            onClick={() => setStep(s.n)}
            className={`p-3 rounded-[11px] border text-start text-[13px] font-semibold transition-all ${
              step === s.n
                ? 'border-[#08343A] bg-[#08343A] text-white'
                : step > s.n
                  ? 'border-[#8AC7A4] bg-[#E3F4EA] text-[#14532D]'
                  : 'border-[#E7E0D7] bg-white text-[#52666A]'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Step 1: Product Details */}
      {step === 1 && (
        <Card className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select
              label="Parent category"
              value={parentKey}
              onChange={(e) => handleParentKeyChange(e.target.value as ParentCategoryKey)}
              options={PARENT_CATEGORY_OPTIONS.map((opt) => ({
                value: opt.key,
                label: opt.label,
              }))}
            />
            {!isBagProduct ? (
              <Select
                label="Child category"
                value={childGroup}
                onChange={(e) => setChildGroup(e.target.value)}
                options={FOOTWEAR_CHILD_GROUPS.map((g) => ({ value: g, label: g }))}
              />
            ) : (
              <Select
                label="Catalog category"
                value={categoryId}
                onChange={(e) => handleCategorySelect(e.target.value)}
                options={[
                  { value: '', label: 'Auto-assign (Bags / Handbags)' },
                  ...matchingCatalogCategories.map((c) => ({
                    value: c.id,
                    label: c.parentName ? `${c.parentName} › ${c.name}` : c.name,
                  })),
                ]}
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Article number / product name"
              placeholder={
                isBagProduct
                  ? 'e.g. Handbag 001 / Classic Leather Tote'
                  : 'e.g. Nike Air Zoom Pegasus 40 / ART-402'
              }
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <Input
              label="Brand"
              placeholder={
                isBagProduct
                  ? 'e.g. Jafferjees, Stylo, Aldo, Zara'
                  : 'e.g. Nike, Adidas, Bata, Servis, Skechers'
              }
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
            />
          </div>

          {!isBagProduct ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Model / style code"
                  placeholder="e.g. Pegasus 40 / Runner Pro"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
                <Select
                  label="Footwear category"
                  value={footwearType}
                  onChange={(e) => setFootwearType(e.target.value)}
                  options={FOOTWEAR_TYPES.map((t) => ({ value: t, label: t }))}
                />
                <Select
                  label="Catalog category"
                  value={categoryId}
                  onChange={(e) => handleCategorySelect(e.target.value)}
                  options={[
                    { value: '', label: `Auto-assign (${footwearType})` },
                    ...matchingCatalogCategories.map((c) => ({
                      value: c.id,
                      label: c.parentName ? `${c.parentName} › ${c.name}` : c.name,
                    })),
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Material"
                  placeholder="e.g. Full-grain leather, Breathable mesh"
                  value={material}
                  onChange={(e) => setMaterial(e.target.value)}
                />
                <Input
                  label="Upper material"
                  placeholder="e.g. Engineered knit / Synthetic leather"
                  value={upperMaterial}
                  onChange={(e) => setUpperMaterial(e.target.value)}
                />
                <Input
                  label="Sole material"
                  placeholder="e.g. Rubber / EVA foam / TPR"
                  value={soleMaterial}
                  onChange={(e) => setSoleMaterial(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Product status"
                  value={isActive ? 'active' : 'inactive'}
                  onChange={(e) => setIsActive(e.target.value === 'active')}
                  options={[
                    { value: 'active', label: 'Active (sellable on POS)' },
                    { value: 'inactive', label: 'Inactive (hidden from POS)' },
                  ]}
                />
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Model / style code"
                placeholder="e.g. Classic Tote / Crossbody 01"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              />
              <Input
                label="Material"
                placeholder="e.g. Genuine leather, Canvas, PU"
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
              />
              <Select
                label="Product status"
                value={isActive ? 'active' : 'inactive'}
                onChange={(e) => setIsActive(e.target.value === 'active')}
                options={[
                  { value: 'active', label: 'Active (sellable on POS)' },
                  { value: 'inactive', label: 'Inactive (hidden from POS)' },
                ]}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-semibold text-[#0B2A2F]">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                isBagProduct
                  ? 'Compartments, strap details, or care instructions...'
                  : 'Cushioning notes, fit guidance, or care instructions...'
              }
              className="field rounded-[10px] border border-[#8A8276] p-3 text-[13px] bg-white"
            />
          </div>

          {/* Product Images */}
          <div className="space-y-2 pt-2 border-t border-[#F1EBE3]">
            <div className="flex items-center justify-between">
              <div className="text-[13px] font-semibold text-[#0B2A2F]">
                Product photos ({images.length})
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

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setStep(2)}>
              Next: Pricing &amp; variants
            </Button>
          </div>
        </Card>
      )}

      {/* Step 2: Pricing & Variants */}
      {step === 2 && (
        <Card className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Input
              label="Base SKU"
              placeholder={isBagProduct ? 'e.g. HANDBAG001' : 'e.g. NKE-PEG40'}
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
            <Input
              label="Selling price (Rs)"
              type="number"
              placeholder="e.g. 6500"
              value={baseSellingPrice}
              onChange={(e) => handleBaseSellingChange(e.target.value)}
            />
            <Input
              label="Cost price (Rs)"
              type="number"
              placeholder="e.g. 4200"
              value={baseCostPrice}
              onChange={(e) => handleBaseCostChange(e.target.value)}
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
            <div className="flex items-center gap-2">
              <Badge tone={marginPct >= 20 ? 'ok' : 'warn'}>Margin: {marginPct}%</Badge>
              <span className="text-[12px] text-[#52666A] num">
                Profit per {unitLabel}: {formatRs(numPrice - numCost)}
              </span>
            </div>
          )}

          {/* Configurable Sizing System & Sizes */}
          <div className="space-y-3 pt-3 border-t border-[#F1EBE3]">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-[13px] font-semibold text-[#0B2A2F]">
                Sizes ({selectedSizes.length} selected)
              </div>
              {hasUnsavedSizesForCategory && selectedCategoryRecord && (
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
                    : `Save sizes to ${selectedCategoryRecord.name}`}
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <Select
                label="Sizing system"
                value={isBagProduct ? 'STANDARD' : sizingSystem}
                onChange={(e) => setSizingSystem(e.target.value as SizingSystem)}
                options={sizingOptions}
              />
              <Input
                label="Add sizes (comma separated)"
                placeholder={
                  isBagProduct
                    ? 'e.g. Mini, Extra Large, 14 inch'
                    : sizingSystem === 'EU'
                      ? 'e.g. 39, 40, 41, 42, 43, 44'
                      : 'e.g. 7, 8, 9, 10, 10.5'
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
              <div className="flex flex-wrap gap-1.5">
                {selectableSizeOptions.map((sz) => {
                  const active = selectedSizes.some(
                    (s) => s.toLowerCase() === sz.toLowerCase(),
                  );
                  return (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => toggleSize(sz)}
                      className={`px-2.5 py-1.5 rounded-[8px] border text-[12px] font-semibold flex items-center gap-1 transition-colors ${
                        active
                          ? 'border-[#08343A] bg-[#08343A] text-white'
                          : 'border-[#D6CDC1] bg-white text-[#0B2A2F] hover:bg-[#F8F4EF]'
                      }`}
                    >
                      {formatVariantSizeLabel(sz, isBagProduct ? 'STANDARD' : sizingSystem)}
                      {active && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3 rounded-[10px] border border-dashed border-[#D6CDC1] bg-[#FBF8F4] text-[12px] text-[#52666A]">
                No default sizes configured for this category yet. Enter sizes above (e.g.{' '}
                <span className="mono">40, 41, 42, 43</span>) or configure them in{' '}
                <Link href="/inventory/categories" className="font-semibold text-[#08343A] underline">
                  Categories
                </Link>
                .
              </div>
            )}
          </div>

          {/* Dynamic Colours */}
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
                  placeholder="Custom colour name..."
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
                    className={`px-2.5 py-1.5 rounded-[9px] border text-[12px] font-semibold flex items-center gap-1.5 ${
                      active
                        ? 'border-[#08343A] bg-[#08343A] text-white'
                        : 'border-[#D6CDC1] bg-white text-[#0B2A2F]'
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

          <div className="flex flex-wrap items-end justify-between gap-3 pt-3 border-t border-[#F1EBE3]">
            {!itemId && (
              <div className="w-[220px]">
                <Input
                  label={`Default opening ${unitPlural} / variant`}
                  type="number"
                  min={0}
                  value={defaultOpeningQty}
                  onChange={(e) => setDefaultOpeningQty(e.target.value)}
                />
              </div>
            )}
            <Button variant="dark" type="button" onClick={generateVariantCombinations}>
              <Sparkles className="w-4 h-4" /> Generate {selectedColours.length * selectedSizes.length} variant rows
            </Button>
          </div>

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (variants.length === 0 && selectedColours.length > 0 && selectedSizes.length > 0) {
                  generateVariantCombinations();
                }
                setStep(3);
              }}
            >
              Next: Barcodes &amp; stock ({variants.length || selectedColours.length * selectedSizes.length})
            </Button>
          </div>
        </Card>
      )}

      {/* Step 3: Barcodes & Stock */}
      {step === 3 && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="font-display text-[15px] font-bold text-[#0B2A2F]">
                Product variants ({variants.length})
              </h3>
              <p className="text-[12px] text-[#52666A]">
                Edit individual SKU, barcode, cost, selling price, or opening stock per colour &amp; size.
              </p>
            </div>
            <Button size="sm" variant="secondary" type="button" onClick={generateVariantCombinations}>
              <Sparkles className="w-3.5 h-3.5" /> Sync from step 2
            </Button>
          </div>

          <div className="overflow-x-auto border border-[#E7E0D7] rounded-[11px]">
            <table className="w-full text-[12px]">
              <thead className="bg-[#FBF8F4] text-[#52666A] text-left">
                <tr>
                  <th className="p-2.5 font-semibold">Variant</th>
                  <th className="p-2.5 font-semibold">SKU</th>
                  <th className="p-2.5 font-semibold">Barcode</th>
                  <th className="p-2.5 font-semibold text-end">Cost</th>
                  <th className="p-2.5 font-semibold text-end">Price</th>
                  {!itemId && <th className="p-2.5 font-semibold text-end">Opening</th>}
                  <th className="p-2.5 font-semibold text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1EBE3]">
                {variants.map((v, idx) => (
                  <tr key={`${v.colourName}-${v.sizeName}-${idx}`} className="bg-white">
                    <td className="p-2 font-semibold text-[#0B2A2F] whitespace-nowrap">
                      {formatVariantDisplay(v.colourName, v.sizeName, v.sizingSystem)}
                    </td>
                    <td className="p-2">
                      <input
                        value={v.sku}
                        onChange={(e) => updateVariantField(idx, 'sku', e.target.value.toUpperCase())}
                        className="field w-[135px] h-[32px] px-2 rounded-[7px] border border-[#D6CDC1] mono"
                      />
                    </td>
                    <td className="p-2">
                      <input
                        value={v.barcode}
                        onChange={(e) => updateVariantField(idx, 'barcode', e.target.value.toUpperCase())}
                        className="field w-[155px] h-[32px] px-2 rounded-[7px] border border-[#D6CDC1] mono"
                      />
                    </td>
                    <td className="p-2 text-end">
                      <input
                        type="number"
                        value={v.costPrice}
                        onChange={(e) => updateVariantField(idx, 'costPrice', e.target.value)}
                        className="field w-[78px] h-[32px] px-2 rounded-[7px] border border-[#D6CDC1] text-end num"
                      />
                    </td>
                    <td className="p-2 text-end">
                      <input
                        type="number"
                        value={v.sellingPrice}
                        onChange={(e) => updateVariantField(idx, 'sellingPrice', e.target.value)}
                        className="field w-[78px] h-[32px] px-2 rounded-[7px] border border-[#D6CDC1] text-end num font-semibold"
                      />
                    </td>
                    {!itemId && (
                      <td className="p-2 text-end">
                        <input
                          type="number"
                          min={0}
                          value={v.openingStock}
                          onChange={(e) => updateVariantField(idx, 'openingStock', e.target.value)}
                          className="field w-[68px] h-[32px] px-2 rounded-[7px] border border-[#D6CDC1] text-end num"
                        />
                      </td>
                    )}
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

          {previewVariant && (
            <div className="pt-2 space-y-2">
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

          <div className="flex justify-between pt-2">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button variant="primary" size="lg" disabled={saving} onClick={() => void handleSave()}>
              {saving ? 'Saving to Supabase...' : itemId ? 'Save changes' : 'Save to stock'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
