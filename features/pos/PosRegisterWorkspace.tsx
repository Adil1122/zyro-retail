'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Building2,
  MoreVertical,
  PauseCircle,
  Percent,
  Receipt as ReceiptIcon,
  RefreshCw,
  RotateCcw,
  ScanBarcode,
  ShoppingBag,
  Tag,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { LiveCustomerSelector } from '@/components/domain/CustomerSelector';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';
import { PaymentSummary } from '@/components/domain/PaymentSummary';
import { ProductArtwork } from '@/components/domain/ProductArtwork';
import { FootwearProductSelector } from '@/components/domain/ProductSelector';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { isNavModuleEnabled } from '@/constants/navigation';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dropdown } from '@/components/ui/Dropdown';
import { SearchInput } from '@/components/ui/SearchInput';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { footwearInventoryService } from '@/features/inventory/services/footwear-inventory.service';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { calcDiscountAmount } from '@/lib/inventory';
import type { BillDiscount } from '@/types';
import {
  computeCartOfferDiscounts,
  formatOfferCustomerText,
  formatVariantDisplay,
  type FootwearProductRecord,
  type FootwearVariantRecord,
  type PosCustomerRecord,
  type PosHeldBillRecord,
  type PosSaleRecord,
} from '@/types/footwear';
import {
  DiscountModal,
  type FootwearCartLine,
  HeldBillsDrawer,
  LineEditModal,
  VariantPickerModal,
} from './PosOverlays';
import { type CheckoutPaymentEntry, SaleCompleteScreen, TenderScreen } from './TenderScreen';
import { footwearPosService, type PosCatalogResponse } from './services/footwear-pos.service';

function generateSyncId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `pos-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function PosRegisterWorkspace() {
  const { t, notify } = useZyro();
  const { session, activeMembership } = useAuth();
  const router = useRouter();
  const { isPhone } = useBreakpoint();

  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [catalog, setCatalog] = useState<PosCatalogResponse | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [heldBills, setHeldBills] = useState<PosHeldBillRecord[]>([]);
  const [loadingHeld, setLoadingHeld] = useState(false);
  const [holdingBill, setHoldingBill] = useState(false);

  // Active cart state
  const [cart, setCart] = useState<FootwearCartLine[]>([]);
  const [customer, setCustomer] = useState<PosCustomerRecord | null>(null);
  const [cartDiscount, setCartDiscount] = useState<BillDiscount | null>(null);
  const [activeHeldBillId, setActiveHeldBillId] = useState<string | null>(null);
  const [clientSyncId, setClientSyncId] = useState<string>(() => generateSyncId());

  // Checkout stage
  const [stage, setStage] = useState<'register' | 'tender' | 'complete'>('register');
  const [submittingSale, setSubmittingSale] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<PosSaleRecord | null>(null);

  // Scanner & mobile view
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [mobileView, setMobileView] = useState<'catalog' | 'bill'>('catalog');

  // Overlays
  const [variantProduct, setVariantProduct] = useState<FootwearProductRecord | null>(null);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [editLine, setEditLine] = useState<FootwearCartLine | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const loadWorkspaceData = useCallback(
    async (branchOverride?: string) => {
      setLoadingCatalog(true);
      setLoadingHeld(true);
      try {
        const [catRes, heldRes] = await Promise.all([
          footwearPosService.getCatalog(branchOverride || undefined),
          footwearPosService.listHeldBills(branchOverride || undefined),
        ]);
        setCatalog(catRes);
        setHeldBills(heldRes.heldBills);
        if (!branchOverride && catRes.branch.id) {
          setSelectedBranchId(catRes.branch.id);
        }
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Failed to load footwear register', 'err');
      } finally {
        setLoadingCatalog(false);
        setLoadingHeld(false);
      }
    },
    [notify]
  );

  useEffect(() => {
    void loadWorkspaceData(selectedBranchId || undefined);
  }, [selectedBranchId, loadWorkspaceData]);

  // Quick lookup map by barcode / SKU for instant USB/BT scanner matching
  const variantByCode = useMemo(() => {
    const map = new Map<string, { product: FootwearProductRecord; variant: FootwearVariantRecord }>();
    for (const p of catalog?.products || []) {
      for (const v of p.variants) {
        if (!v.isActive) continue;
        map.set(v.sku.toUpperCase(), { product: p, variant: v });
        if (v.primaryBarcode) {
          map.set(v.primaryBarcode.toUpperCase(), { product: p, variant: v });
        }
        for (const b of v.barcodes) {
          map.set(b.barcode.toUpperCase(), { product: p, variant: v });
        }
      }
    }
    return map;
  }, [catalog]);

  const cartQtyByVariant = useMemo(() => {
    const out: Record<string, number> = {};
    for (const l of cart) {
      out[l.variantId] = (out[l.variantId] || 0) + l.qty;
    }
    return out;
  }, [cart]);

  const offerBreakdown = useMemo(
    () =>
      computeCartOfferDiscounts(
        cart.map((l) => ({
          key: l.key,
          productId: l.productId,
          qty: l.qty,
          price: l.price,
          offer: l.offer,
        })),
      ),
    [cart],
  );

  const totalOfferSavings = useMemo(
    () =>
      cart.reduce((s, l) => s + (offerBreakdown[l.key]?.offerDiscount ?? 0), 0),
    [cart, offerBreakdown],
  );

  const subtotal = useMemo(
    () =>
      cart.reduce((s, l) => {
        const offerDisc = offerBreakdown[l.key]?.offerDiscount ?? 0;
        return s + Math.max(0, l.price * l.qty - l.lineDiscount - offerDisc);
      }, 0),
    [cart, offerBreakdown],
  );
  const discountAmt = useMemo(
    () => calcDiscountAmount(cartDiscount, subtotal),
    [cartDiscount, subtotal]
  );
  const total = Math.max(0, Number((subtotal - discountAmt).toFixed(2)));
  const itemCount = useMemo(() => cart.reduce((s, l) => s + l.qty, 0), [cart]);

  const addVariantToCart = useCallback(
    (variant: FootwearVariantRecord, product: FootwearProductRecord, addQty = 1) => {
      const qtyToAdd = Math.max(1, Math.floor(addQty));
      const displayLabel = formatVariantDisplay(
        variant.colourName,
        variant.sizeName,
        variant.sizingSystem,
      );
      if (!variant.isActive || !product.isActive) {
        notify(`${product.name} is inactive and cannot be sold`, 'err');
        return;
      }
      if (variant.availableStock <= 0) {
        notify(`${product.name} (${displayLabel}) is out of stock`, 'err');
        return;
      }

      setCart((prev) => {
        const existing = prev.find((l) => l.variantId === variant.id);
        if (existing) {
          if (existing.qty + qtyToAdd > variant.availableStock) {
            notify(`Only ${variant.availableStock} in stock for ${variant.sku}`, 'warn');
            return prev;
          }
          return prev.map((l) =>
            l.variantId === variant.id
              ? {
                  ...l,
                  qty: l.qty + qtyToAdd,
                  availableStock: variant.availableStock,
                  offer: product.offer ?? l.offer ?? null,
                }
              : l
          );
        }
        if (qtyToAdd > variant.availableStock) {
          notify(`Only ${variant.availableStock} in stock for ${variant.sku}`, 'warn');
          return prev;
        }
        const nextLine: FootwearCartLine = {
          key: variant.id,
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          brand: product.brand,
          artId: product.artId,
          imageUrl: product.primaryImageUrl,
          variantText: displayLabel,
          colourName: variant.colourName,
          sizeName: variant.sizeName,
          sizingSystem: variant.sizingSystem,
          sku: variant.sku,
          barcode: variant.primaryBarcode,
          price: variant.sellingPrice,
          originalPrice: variant.sellingPrice,
          qty: qtyToAdd,
          availableStock: variant.availableStock,
          lineDiscount: 0,
          offer: product.offer ?? null,
        };
        return [...prev, nextLine];
      });
      notify(
        qtyToAdd > 1
          ? `Added ${qtyToAdd} × ${product.name} (${displayLabel})`
          : `Added ${product.name} (${displayLabel})`,
        'ok',
      );
    },
    [notify]
  );

  const handleSelectProduct = (product: FootwearProductRecord) => {
    const activeVariants = product.variants.filter((v) => v.isActive);
    if (activeVariants.length === 0) {
      notify(`${product.name} has no active variants`, 'err');
      return;
    }
    if (activeVariants.length === 1) {
      addVariantToCart(activeVariants[0], product);
      return;
    }
    setVariantProduct(product);
  };

  const processBarcode = useCallback(
    async (rawCode: string) => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return;

      // Fast path: match against loaded branch catalog
      const localMatch = variantByCode.get(code);
      if (localMatch) {
        addVariantToCart(localMatch.variant, localMatch.product);
        setBarcodeInput('');
        return;
      }

      // Live DB lookup fallback
      setScanning(true);
      try {
        const res = await footwearInventoryService.lookupBarcode(code, selectedBranchId || undefined);
        if (!res.found || !res.variant || !res.product) {
          notify(`Barcode or SKU “${code}” not found`, 'err');
          return;
        }
        addVariantToCart(res.variant, res.product);
        setBarcodeInput('');
      } catch (e) {
        notify(e instanceof Error ? e.message : 'Barcode lookup failed', 'err');
      } finally {
        setScanning(false);
      }
    },
    [variantByCode, selectedBranchId, addVariantToCart, notify]
  );

  // Global USB / Bluetooth keyboard-wedge barcode scanner listener
  const scanBufferRef = useRef('');
  const lastKeyTimeRef = useRef(0);

  useEffect(() => {
    if (stage !== 'register') return;
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      if (isEditable) return;

      const now = Date.now();
      if (now - lastKeyTimeRef.current > 120) {
        scanBufferRef.current = '';
      }
      lastKeyTimeRef.current = now;

      if (e.key === 'Enter') {
        const code = scanBufferRef.current.trim();
        scanBufferRef.current = '';
        if (code.length >= 4) {
          e.preventDefault();
          void processBarcode(code);
        }
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        scanBufferRef.current += e.key;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [stage, processBarcode]);

  const updateCartLine = (key: string, patch: Partial<FootwearCartLine>) => {
    setCart((prev) => {
      const next: FootwearCartLine[] = [];
      for (const l of prev) {
        if (l.key !== key) {
          next.push(l);
          continue;
        }
        const nextQty = patch.qty !== undefined ? patch.qty : l.qty;
        if (nextQty <= 0) continue;
        if (nextQty > l.availableStock) {
          notify(`Only ${l.availableStock} available for ${l.sku}`, 'warn');
          next.push(l);
          continue;
        }
        next.push({ ...l, ...patch, qty: nextQty });
      }
      return next;
    });
  };

  const removeCartLine = (key: string) => {
    setCart((prev) => prev.filter((l) => l.key !== key));
  };

  const clearBill = () => {
    setCart([]);
    setCustomer(null);
    setCartDiscount(null);
    setActiveHeldBillId(null);
    setClientSyncId(generateSyncId());
    setCheckoutError(null);
  };

  const handleHoldBill = async (note?: string) => {
    if (cart.length === 0) return;
    setHoldingBill(true);
    try {
      const res = await footwearPosService.holdBill({
        branchId: selectedBranchId || undefined,
        customerId: customer?.id || null,
        cartPayload: cart.map((l) => ({
          key: l.key,
          productId: l.productId,
          variantId: l.variantId,
          name: l.name,
          brand: l.brand,
          variantText: l.variantText,
          colourName: l.colourName,
          sizeName: l.sizeName,
          sizingSystem: l.sizingSystem,
          sku: l.sku,
          price: l.price,
          originalPrice: l.originalPrice,
          qty: l.qty,
          lineDiscount: l.lineDiscount,
          note: l.note,
        })),
        discountPayload: cartDiscount
          ? { mode: cartDiscount.mode, value: cartDiscount.value, reason: cartDiscount.reason }
          : null,
        totalEstimate: total,
        note,
      });
      setHeldBills((prev) => [res.heldBill, ...prev]);
      clearBill();
      notify(`Bill placed on hold (${res.heldBill.holdCode}) — stock untouched`, 'info');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to hold bill', 'err');
    } finally {
      setHoldingBill(false);
    }
  };

  const handleRecallHeldBill = (held: PosHeldBillRecord) => {
    // Re-hydrate live branch stock for each variant from catalog
    const hydrated: FootwearCartLine[] = held.cartPayload.map((item) => {
      const product = catalog?.products.find((p) => p.id === item.productId);
      const variant = product?.variants.find((v) => v.id === item.variantId);
      const liveAvail = variant ? variant.availableStock : item.qty;
      return {
        key: item.variantId,
        productId: item.productId,
        variantId: item.variantId,
        name: product?.name || item.name,
        brand: product?.brand || item.brand,
        artId: product?.artId || 'sneaker',
        imageUrl: product?.primaryImageUrl || null,
        variantText: item.variantText,
        colourName: item.colourName,
        sizeName: item.sizeName,
        sizingSystem: item.sizingSystem,
        sku: variant?.sku || item.sku,
        barcode: variant?.primaryBarcode || null,
        price: variant ? variant.sellingPrice : item.price,
        originalPrice: variant ? variant.sellingPrice : item.originalPrice,
        qty: Math.min(item.qty, Math.max(1, liveAvail)),
        availableStock: liveAvail,
        lineDiscount: item.lineDiscount || 0,
        offer: product?.offer ?? null,
        note: item.note,
      };
    });

    setCart(hydrated);
    setCartDiscount(held.discountPayload || null);
    setActiveHeldBillId(held.id);
    if (held.customerId && held.customerName) {
      setCustomer({
        id: held.customerId,
        fullName: held.customerName,
        phone: null,
        city: null,
        address: null,
        khataBalance: 0,
        refundOwed: 0,
        notes: null,
      });
    } else {
      setCustomer(null);
    }
    setClientSyncId(generateSyncId());
    notify(`Resumed ${held.holdCode}`, 'ok');
  };

  const handleDeleteHeldBill = async (id: string) => {
    try {
      await footwearPosService.deleteHeldBill(id, selectedBranchId || undefined);
      setHeldBills((prev) => prev.filter((h) => h.id !== id));
      if (activeHeldBillId === id) setActiveHeldBillId(null);
      notify('Held bill removed', 'info');
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Failed to remove held bill', 'err');
    }
  };

  const handleCheckout = async (params: {
    payments: CheckoutPaymentEntry[];
    allowPartialKhata?: boolean;
    notes?: string;
  }) => {
    if (submittingSale || cart.length === 0) return;
    setSubmittingSale(true);
    setCheckoutError(null);
    try {
      const res = await footwearPosService.checkout({
        branchId: selectedBranchId || undefined,
        customerId: customer?.id || null,
        clientSyncId,
        discountPayload: cartDiscount
          ? { mode: cartDiscount.mode, value: cartDiscount.value, reason: cartDiscount.reason }
          : null,
        notes: params.notes,
        heldBillId: activeHeldBillId,
        allowPartialKhata: params.allowPartialKhata,
        items: cart.map((l) => ({
          variantId: l.variantId,
          quantity: l.qty,
          unitPrice: l.price,
          lineDiscountAmount: l.lineDiscount,
          note: l.note,
        })),
        payments: params.payments,
      });
      setCompletedSale(res.sale);
      setStage('complete');
      clearBill();
      notify(`Bill #${res.sale.billNumber} completed & stock updated`, 'ok');
      // Refresh catalog stock + held bills in background
      void loadWorkspaceData(selectedBranchId || undefined);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Checkout failed';
      setCheckoutError(msg);
      notify(msg, 'err');
    } finally {
      setSubmittingSale(false);
    }
  };

  if (stage === 'tender') {
    return (
      <>
        <TenderScreen
          subtotal={subtotal}
          offerSavings={totalOfferSavings}
          discountAmt={discountAmt}
          total={total}
          itemCount={itemCount}
          customer={customer}
          submitting={submittingSale}
          errorMessage={checkoutError}
          onBack={() => {
            setCheckoutError(null);
            setStage('register');
          }}
          onNeedCustomer={() => setCustomerOpen(true)}
          onComplete={handleCheckout}
        />
        <LiveCustomerSelector
          open={customerOpen}
          onClose={() => setCustomerOpen(false)}
          branchId={selectedBranchId || undefined}
          currentId={customer?.id || null}
          onPick={(c) => setCustomer(c)}
        />
      </>
    );
  }

  if (stage === 'complete' && completedSale) {
    return (
      <SaleCompleteScreen
        sale={completedSale}
        shopName={catalog?.businessName || activeMembership?.businessName}
        branchAddress={catalog?.branch.address}
        branchPhone={catalog?.branch.phone}
        onNewSale={() => {
          setCompletedSale(null);
          setStage('register');
          setMobileView('catalog');
        }}
      />
    );
  }

  const cartPane = (
    <div className="flex flex-col h-full bg-white border-s border-[#E7E0D7]">
      {/* Bill header & Customer chip */}
      <div className="p-4 border-b border-[#F1EBE3] space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-display font-bold text-[18px] text-[#0B2A2F]">
              {activeHeldBillId ? 'Resumed bill' : 'New bill'}
            </span>
            <Badge tone="neutral">
              {itemCount} {t('items')}
            </Badge>
          </div>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={() => setClearConfirmOpen(true)}
              className="text-[12px] font-semibold text-[#B42318] hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> {t('clear')}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setCustomerOpen(true)}
          className="w-full px-3 py-2.5 rounded-[10px] border border-[#E7E0D7] bg-[#FBF8F4] hover:bg-[#F1EBE3] flex items-center justify-between text-start"
        >
          <div className="flex items-center gap-2 min-w-0">
            <UserPlus className="w-4 h-4 text-[#08343A] shrink-0" />
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-[#0B2A2F] truncate">
                {customer ? customer.fullName : t('walkIn')}
              </div>
              {customer && customer.khataBalance > 0 && (
                <div className="text-[11px] text-[#8A3D12] font-semibold">
                  Khata owes {formatRs(customer.khataBalance)}
                </div>
              )}
            </div>
          </div>
          <span className="text-[12px] font-semibold text-[#0E5E66]">
            {customer ? 'Change' : 'Add'}
          </span>
        </button>
      </div>

      {/* Cart lines */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#F1EBE3] px-4">
        {cart.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-[#52666A]">
            <ShoppingBag className="w-8 h-8 mx-auto opacity-50" />
            <div className="font-semibold text-[14px] text-[#0B2A2F]">Empty bill</div>
            <div className="text-[13px]">Tap an item on the left or scan a barcode to start</div>
          </div>
        ) : (
          cart.map((line) => {
            const offerInfo = offerBreakdown[line.key];
            const offerDisc = offerInfo?.offerDiscount ?? 0;
            const grossLine = line.price * line.qty;
            const netLine = Math.max(0, grossLine - line.lineDiscount - offerDisc);
            const offerMsg = formatOfferCustomerText(line.price, line.offer, formatRs);

            return (
              <div key={line.key} className="py-3 flex items-center gap-3">
                <ProductArtwork
                  artId={line.artId}
                  imageUrl={line.imageUrl}
                  alt={line.name}
                  size={42}
                />
                <button
                  type="button"
                  onClick={() => setEditLine(line)}
                  className="flex-1 min-w-0 text-start"
                >
                  <div className="font-semibold text-[14px] text-[#0B2A2F] truncate">{line.name}</div>
                  <div className="text-[12px] text-[#52666A] truncate">
                    {line.variantText} · <span className="mono">{line.sku}</span>
                  </div>
                  {offerDisc > 0 && line.offer && (
                    <div className="text-[11px] font-semibold text-[#14532D] flex items-center gap-1 mt-0.5">
                      <Tag className="w-3 h-3 shrink-0" />
                      <span>
                        Offer applied ({line.offer.minQuantity} for {formatRs(line.offer.bundlePrice)}) · −
                        {formatRs(offerDisc)}
                      </span>
                    </div>
                  )}
                  {offerDisc === 0 && offerMsg && offerInfo && offerInfo.remainingForNextBundle > 0 && (
                    <div className="text-[11px] font-semibold text-[#8A3D12] flex items-center gap-1 mt-0.5">
                      <Tag className="w-3 h-3 shrink-0 text-[#C9682E]" />
                      <span className="truncate">
                        {offerMsg} (add {offerInfo.remainingForNextBundle} more)
                      </span>
                    </div>
                  )}
                  {line.lineDiscount > 0 && (
                    <div className="text-[11px] font-semibold text-[#14532D]">
                      Line discount −{formatRs(line.lineDiscount)}
                    </div>
                  )}
                </button>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => updateCartLine(line.key, { qty: line.qty - 1 })}
                    className="w-8 h-8 rounded-[8px] border border-[#D6CDC1] bg-[#FBF8F4] font-bold text-[#0B2A2F]"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-bold text-[14px] num">{line.qty}</span>
                  <button
                    type="button"
                    onClick={() => updateCartLine(line.key, { qty: line.qty + 1 })}
                    className="w-8 h-8 rounded-[8px] border border-[#D6CDC1] bg-[#FBF8F4] font-bold text-[#0B2A2F]"
                  >
                    +
                  </button>
                </div>
                <div className="w-20 text-end num">
                  {offerDisc > 0 && (
                    <div className="text-[11px] text-[#52666A] line-through">
                      {formatRs(Math.max(0, grossLine - line.lineDiscount))}
                    </div>
                  )}
                  <div className="font-bold text-[14px] text-[#0B2A2F]">{formatRs(netLine)}</div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Totals + Action footer */}
      <div className="p-4 border-t border-[#E7E0D7] bg-[#FBF8F4] space-y-3">
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => setDiscountOpen(true)}
            disabled={cart.length === 0 || !catalog?.canDiscount}
          >
            <Percent className="w-4 h-4" />
            {cartDiscount ? `Discount (−${formatRs(discountAmt)})` : t('discount')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => setHeldOpen(true)}
          >
            <PauseCircle className="w-4 h-4" />
            {t('heldBills')} ({heldBills.length})
          </Button>
        </div>

        <PaymentSummary
          subtotal={subtotal}
          offerSavings={totalOfferSavings}
          discountAmt={discountAmt}
          total={total}
          itemCount={itemCount}
        />

        <Button
          variant="primary"
          size="counter"
          fullWidth
          disabled={cart.length === 0}
          onClick={() => {
            setCheckoutError(null);
            setStage('tender');
          }}
        >
          {t('pay')} · {formatRs(total)}
        </Button>
      </div>
    </div>
  );

  const shopDisplayName = catalog?.businessName || activeMembership?.businessName || 'ZYRO Footwear';
  const staffDisplayName = session.user?.fullName || 'Cashier';
  const staffRoleName = activeMembership?.roleName || 'Counter';

  return (
    <div className="h-screen flex flex-col bg-[#F4EFE9] overflow-hidden">
      {/* Top counter bar */}
      <header className="h-[58px] shrink-0 bg-[#08343A] text-white px-3 sm:px-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href={isNavModuleEnabled('home') ? '/dashboard' : '/inventory'}
            className="px-2.5 py-1.5 rounded-[9px] bg-white/10 hover:bg-white/15 text-[13px] font-semibold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back office</span>
          </Link>
          <div className="min-w-0">
            <div className="font-display font-bold text-[15px] truncate">
              {shopDisplayName} · Register
            </div>
            <div className="text-[11px] text-[#C9DADB] truncate">
              {staffDisplayName} ({staffRoleName})
              {catalog?.branch?.name ? ` · ${catalog.branch.name}` : ''}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {catalog && catalog.branches.length > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 bg-white/10 rounded-[9px] px-2.5 py-1">
              <Building2 className="w-3.5 h-3.5 text-[#C9DADB]" />
              <select
                value={selectedBranchId}
                onChange={(e) => {
                  setSelectedBranchId(e.target.value);
                  clearBill();
                }}
                aria-label="Select branch"
                className="bg-transparent text-white text-[12px] font-semibold focus:outline-none"
              >
                {catalog.branches.map((b) => (
                  <option key={b.id} value={b.id} className="text-[#0B2A2F]">
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="hidden md:block">
            <LanguageSwitcher compact />
          </div>

          <Dropdown
            align="end"
            trigger={
              <button
                type="button"
                className="w-10 h-10 rounded-[10px] bg-white/10 hover:bg-white/15 flex items-center justify-center"
                aria-label="Register options"
              >
                <MoreVertical className="w-5 h-5" />
              </button>
            }
            items={[
              {
                id: 'bills',
                label: 'Bill book',
                icon: <ReceiptIcon className="w-4 h-4" />,
                onSelect: () => router.push('/pos/bills'),
              },
              {
                id: 'returns',
                label: 'Return from bill',
                icon: <RotateCcw className="w-4 h-4" />,
                onSelect: () => router.push('/pos/returns'),
              },
              {
                id: 'shoe-ex',
                label: 'Footwear exchange',
                icon: <RefreshCw className="w-4 h-4" />,
                onSelect: () => router.push('/pos/exchange'),
              },
              {
                id: 'stock',
                label: 'Footwear stock',
                icon: <BookOpen className="w-4 h-4" />,
                onSelect: () => router.push('/inventory'),
              },
            ]}
          />
        </div>
      </header>

      {/* Main split workspace */}
      {isPhone ? (
        <div className="flex-1 flex flex-col min-h-0">
          {mobileView === 'catalog' ? (
            <div className="flex-1 overflow-y-auto p-3 space-y-3 pb-24">
              <div className="flex gap-2">
                <SearchInput
                  value={barcodeInput}
                  onChange={setBarcodeInput}
                  onSubmit={() => void processBarcode(barcodeInput)}
                  placeholder="Scan barcode or SKU + Enter"
                  rightSlot={
                    <button
                      type="button"
                      disabled={scanning}
                      onClick={() => void processBarcode(barcodeInput)}
                      className="px-2 py-1 rounded bg-[#08343A] text-white text-[12px] font-semibold"
                    >
                      {scanning ? '...' : 'Scan'}
                    </button>
                  }
                />
              </div>
              <FootwearProductSelector
                products={catalog?.products || []}
                categories={catalog?.categories || []}
                brands={catalog?.facets.brands || []}
                sizes={catalog?.facets.sizes || []}
                colours={catalog?.facets.colours || []}
                loading={loadingCatalog}
                onSelect={handleSelectProduct}
              />
            </div>
          ) : (
            <div className="flex-1 min-h-0">{cartPane}</div>
          )}

          {/* Phone bottom toggle bar */}
          <div className="h-[64px] shrink-0 bg-white border-t border-[#E7E0D7] px-3 flex items-center gap-2">
            <Button
              variant={mobileView === 'catalog' ? 'dark' : 'secondary'}
              className="flex-1"
              onClick={() => setMobileView('catalog')}
            >
              <ScanBarcode className="w-4 h-4" /> Footwear
            </Button>
            <Button
              variant={mobileView === 'bill' ? 'primary' : 'copperTint'}
              className="flex-1"
              onClick={() => setMobileView('bill')}
            >
              Bill ({itemCount}) · {formatRs(total)}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-12 min-h-0">
          <div className="col-span-7 xl:col-span-8 overflow-y-auto p-4 sm:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <SearchInput
                value={barcodeInput}
                onChange={setBarcodeInput}
                onSubmit={() => void processBarcode(barcodeInput)}
                placeholder="Scan box barcode (USB/BT scanner ready) or enter SKU + Enter"
                rightSlot={
                  <Button
                    size="sm"
                    variant="dark"
                    disabled={scanning}
                    onClick={() => void processBarcode(barcodeInput)}
                  >
                    <ScanBarcode className="w-4 h-4" /> {scanning ? 'Finding...' : 'Scan'}
                  </Button>
                }
              />
            </div>
            <FootwearProductSelector
              products={catalog?.products || []}
              categories={catalog?.categories || []}
              brands={catalog?.facets.brands || []}
              sizes={catalog?.facets.sizes || []}
              colours={catalog?.facets.colours || []}
              loading={loadingCatalog}
              onSelect={handleSelectProduct}
            />
          </div>
          <div className="col-span-5 xl:col-span-4 min-h-0">{cartPane}</div>
        </div>
      )}

      {/* Modals & Drawers */}
      <VariantPickerModal
        key={`variant-${variantProduct?.id ?? 'none'}`}
        product={variantProduct}
        cartQtyByVariant={cartQtyByVariant}
        onClose={() => setVariantProduct(null)}
        onAdd={addVariantToCart}
      />
      <LiveCustomerSelector
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        branchId={selectedBranchId || undefined}
        currentId={customer?.id || null}
        onPick={(c) => setCustomer(c)}
      />
      <DiscountModal
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        subtotal={subtotal}
        current={cartDiscount}
        canDiscount={catalog?.canDiscount ?? true}
        canApproveHighDiscount={catalog?.canOverridePrice ?? false}
        onApply={setCartDiscount}
        onRemove={() => setCartDiscount(null)}
      />
      <LineEditModal
        key={`line-edit-${editLine?.key ?? 'none'}`}
        line={editLine}
        canOverridePrice={catalog?.canOverridePrice ?? false}
        canDiscount={catalog?.canDiscount ?? true}
        onClose={() => setEditLine(null)}
        onSave={updateCartLine}
        onRemove={removeCartLine}
      />
      <HeldBillsDrawer
        open={heldOpen}
        onClose={() => setHeldOpen(false)}
        heldBills={heldBills}
        loading={loadingHeld}
        canHoldCurrent={cart.length > 0}
        holding={holdingBill}
        onHoldCurrent={handleHoldBill}
        onRecall={handleRecallHeldBill}
        onDelete={handleDeleteHeldBill}
      />
      <ConfirmDialog
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={() => {
          clearBill();
          notify('Bill cleared', 'info');
        }}
        title="Clear current bill?"
        body="All items and discounts on this unsaved bill will be removed."
        confirmLabel="Clear bill"
      />
    </div>
  );
}
