'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Edit3, Loader2, Tag, Trash2 } from 'lucide-react';
import { ProductArtwork } from '@/components/domain/ProductArtwork';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { footwearInventoryService } from '@/features/inventory/services/footwear-inventory.service';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import {
  formatOfferCustomerText,
  getOfferSavings,
  type FootwearProductRecord,
} from '@/types/footwear';

export interface OffersModalProps {
  open: boolean;
  onClose: () => void;
  branchId?: string;
  initialProductId?: string | null;
  onChanged?: () => void | Promise<void>;
}

export function OffersModal({
  open,
  onClose,
  branchId,
  initialProductId,
  onChanged,
}: OffersModalProps) {
  const { notify } = useZyro();
  const [products, setProducts] = useState<FootwearProductRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedProductId, setSelectedProductId] = useState('');
  const [minQuantity, setMinQuantity] = useState('2');
  const [bundlePrice, setBundlePrice] = useState('');
  const [saving, setSaving] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const loadAllProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await footwearInventoryService.listProducts({
        branchId: branchId || undefined,
        status: 'active',
        pageSize: 200,
        sort: 'name_asc',
      });
      setProducts(res.products);
      return res.products;
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to load products', 'err');
      return [] as FootwearProductRecord[];
    } finally {
      setLoading(false);
    }
  }, [branchId, notify]);

  const populateFormForProduct = useCallback((prod: FootwearProductRecord | undefined) => {
    setErrorMsg('');
    if (!prod) {
      setSelectedProductId('');
      setMinQuantity('2');
      setBundlePrice('');
      return;
    }
    setSelectedProductId(prod.id);
    if (prod.offer?.isActive) {
      setMinQuantity(String(prod.offer.minQuantity));
      setBundlePrice(String(prod.offer.bundlePrice));
    } else {
      setMinQuantity('2');
      setBundlePrice('');
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void loadAllProducts().then((list) => {
      if (cancelled) return;
      if (initialProductId) {
        const match = list.find((p) => p.id === initialProductId);
        populateFormForProduct(match ?? list[0]);
      } else {
        populateFormForProduct(list[0]);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, initialProductId, loadAllProducts, populateFormForProduct]);

  const selectedProduct = useMemo(
    () => products.find((p) => p.id === selectedProductId) ?? null,
    [products, selectedProductId],
  );

  const offeredProducts = useMemo(
    () => products.filter((p) => Boolean(p.offer?.isActive)),
    [products],
  );

  const parsedQty = Math.floor(Number(minQuantity) || 0);
  const parsedBundlePrice = Number(bundlePrice) || 0;
  const regularBundleTotal = selectedProduct ? selectedProduct.baseSellingPrice * parsedQty : 0;
  const previewSavings =
    selectedProduct && parsedQty >= 2 && parsedBundlePrice > 0
      ? Math.max(0, Math.round((regularBundleTotal - parsedBundlePrice) * 100) / 100)
      : 0;
  const previewText =
    selectedProduct && parsedQty >= 2 && parsedBundlePrice > 0 && previewSavings > 0
      ? `Buy ${parsedQty} and get ${formatRs(previewSavings)} discount`
      : null;

  const handleProductChange = (nextId: string) => {
    const match = products.find((p) => p.id === nextId);
    populateFormForProduct(match);
  };

  const handleSaveOffer = async () => {
    setErrorMsg('');
    if (!selectedProduct) {
      setErrorMsg('Please select a product.');
      return;
    }
    if (!Number.isFinite(parsedQty) || parsedQty < 2) {
      setErrorMsg('Bundle quantity must be at least 2.');
      return;
    }
    if (!Number.isFinite(parsedBundlePrice) || parsedBundlePrice <= 0) {
      setErrorMsg('Enter a valid offer bundle price.');
      return;
    }
    if (parsedBundlePrice >= regularBundleTotal) {
      setErrorMsg(
        `Offer price must be less than ${formatRs(regularBundleTotal)} (${parsedQty} × ${formatRs(selectedProduct.baseSellingPrice)}).`,
      );
      return;
    }

    setSaving(true);
    try {
      await footwearInventoryService.saveOffer({
        productId: selectedProduct.id,
        minQuantity: parsedQty,
        bundlePrice: parsedBundlePrice,
        branchId: branchId || undefined,
      });
      notify(
        `${selectedProduct.name} is now an Offered product (${parsedQty} for ${formatRs(parsedBundlePrice)})`,
        'ok',
      );
      await loadAllProducts();
      await onChanged?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save offer';
      setErrorMsg(msg);
      notify(msg, 'err');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveOffer = async (prod: FootwearProductRecord) => {
    setRemovingId(prod.id);
    try {
      await footwearInventoryService.removeOffer(prod.id, branchId || undefined);
      notify(`Offer removed from ${prod.name}`, 'info');
      const updated = await loadAllProducts();
      if (prod.id === selectedProductId) {
        const refreshed = updated.find((p) => p.id === prod.id);
        populateFormForProduct(refreshed);
      }
      await onChanged?.();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Failed to remove offer', 'err');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Product Offers"
      subtitle="Set bundle quantity and reduced bundle price to convert a product into an Offered product."
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="primary"
            disabled={saving || loading || !selectedProduct}
            onClick={() => void handleSaveOffer()}
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
            {selectedProduct?.offer?.isActive ? 'Update offer' : 'Save offer'}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {loading && products.length === 0 ? (
          <div className="py-10 text-center text-[13px] text-[#52666A] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading active products...
          </div>
        ) : products.length === 0 ? (
          <div className="py-8 text-center text-[14px] text-[#52666A]">
            No active products found. Add a product in Stock first before creating an offer.
          </div>
        ) : (
          <>
            {/* Offer creation / edit form */}
            <div className="space-y-4 p-4 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7]">
              <Select
                label="Select product"
                value={selectedProductId}
                onChange={(e) => handleProductChange(e.target.value)}
                options={products.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.sku}) — ${formatRs(p.baseSellingPrice)}${p.offer?.isActive ? ' · Offered' : ''}`,
                }))}
              />

              {selectedProduct && (
                <div className="flex items-center gap-3 p-3 rounded-[10px] bg-white border border-[#E7E0D7]">
                  <ProductArtwork
                    artId={selectedProduct.artId}
                    colourName={selectedProduct.colours[0]}
                    imageUrl={selectedProduct.primaryImageUrl}
                    alt={selectedProduct.name}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-[14px] text-[#0B2A2F] truncate">
                      {selectedProduct.name}
                    </div>
                    <div className="text-[12px] text-[#52666A]">
                      Regular price:{' '}
                      <strong className="text-[#08343A] num">
                        {formatRs(selectedProduct.baseSellingPrice)}
                      </strong>{' '}
                      / {selectedProduct.unitOfMeasure === 'piece' ? 'piece' : 'pair'}
                    </div>
                  </div>
                  {selectedProduct.offer?.isActive && (
                    <Badge tone="copper">Offered product</Badge>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  label="Bundle quantity"
                  type="number"
                  min={2}
                  step={1}
                  value={minQuantity}
                  onChange={(e) => {
                    setMinQuantity(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="e.g. 2"
                  hint="Minimum quantity customer must buy (at least 2)"
                />
                <Input
                  label="Offer bundle price (Rs)"
                  type="number"
                  min={1}
                  value={bundlePrice}
                  onChange={(e) => {
                    setBundlePrice(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder={
                    selectedProduct && parsedQty >= 2
                      ? `Less than ${Math.round(regularBundleTotal)}`
                      : 'e.g. 1599'
                  }
                  hint={
                    selectedProduct && parsedQty >= 2
                      ? `Regular price for ${parsedQty}: ${formatRs(regularBundleTotal)}`
                      : 'Total price for the bundle quantity'
                  }
                />
              </div>

              {previewText && selectedProduct && (
                <div className="p-3 rounded-[10px] bg-[#FCEFE4] border border-[#E2B48F] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-[13px] font-semibold text-[#8A3D12]">
                    <Tag className="w-4 h-4 shrink-0 text-[#C9682E]" />
                    <span>Customer sees: &ldquo;{previewText}&rdquo;</span>
                  </div>
                  <div className="text-[12px] text-[#8A3D12] num">
                    <span className="line-through opacity-75 mr-1.5">
                      {formatRs(regularBundleTotal)}
                    </span>
                    <strong>{formatRs(parsedBundlePrice)}</strong> for {parsedQty}
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="text-[13px] font-semibold text-[#B42318]">{errorMsg}</div>
              )}
            </div>

            {/* Active Offered Products list */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[#52666A]">
                  Active offered products ({offeredProducts.length})
                </h3>
              </div>

              {offeredProducts.length === 0 ? (
                <div className="p-4 rounded-[12px] border border-dashed border-[#D6CDC1] text-center text-[13px] text-[#52666A]">
                  No active offers yet. Select a product above and save a bundle price to create one.
                </div>
              ) : (
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1">
                  {offeredProducts.map((prod) => {
                    const offer = prod.offer!;
                    const savings = getOfferSavings(prod.baseSellingPrice, offer);
                    const customerMsg = formatOfferCustomerText(
                      prod.baseSellingPrice,
                      offer,
                      formatRs,
                    );
                    const isRemoving = removingId === prod.id;
                    return (
                      <Card
                        key={prod.id}
                        padding="sm"
                        className="flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <ProductArtwork
                            artId={prod.artId}
                            colourName={prod.colours[0]}
                            imageUrl={prod.primaryImageUrl}
                            alt={prod.name}
                            size={40}
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-[14px] text-[#0B2A2F] truncate">
                                {prod.name}
                              </span>
                              <Badge tone="copper">Offered product</Badge>
                            </div>
                            <div className="text-[12px] text-[#52666A] num">
                              {formatRs(prod.baseSellingPrice)} each ·{' '}
                              <strong className="text-[#08343A]">
                                {offer.minQuantity} for {formatRs(offer.bundlePrice)}
                              </strong>
                              {savings > 0 ? ` (save ${formatRs(savings)})` : ''}
                            </div>
                            {customerMsg && (
                              <div className="text-[11px] font-semibold text-[#8A3D12]">
                                {customerMsg}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => populateFormForProduct(prod)}
                            title="Edit offer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={isRemoving}
                            onClick={() => void handleRemoveOffer(prod)}
                            title="Remove offer"
                            aria-label={`Remove offer from ${prod.name}`}
                          >
                            {isRemoving ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#B42318]" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5 text-[#B42318]" />
                            )}
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
