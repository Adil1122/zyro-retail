'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  FileText,
  MoreVertical,
  PauseCircle,
  Percent,
  Receipt,
  RefreshCw,
  RotateCcw,
  ScanBarcode,
  ShoppingBag,
  Trash2,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import { CustomerSelector } from '@/components/domain/CustomerSelector';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';
import { PaymentSummary } from '@/components/domain/PaymentSummary';
import { ProductArtwork } from '@/components/domain/ProductArtwork';
import { ProductSelector } from '@/components/domain/ProductSelector';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Dropdown } from '@/components/ui/Dropdown';
import { SearchInput } from '@/components/ui/SearchInput';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useZyro } from '@/hooks/useZyro';
import { formatRs } from '@/lib/format';
import { calcDiscountAmount, getFirstInStockColour, getSku, getVariantStock, getVariantText } from '@/lib/inventory';
import type { BillRecord, CartLine, ProductItem } from '@/types';
import {
  DiscountModal,
  HeldBillsDrawer,
  LineEditModal,
  MeasuredBlockedModal,
  VariantPickerModal,
} from './PosOverlays';
import { SaleCompleteScreen, TenderScreen } from './TenderScreen';

export function PosRegisterWorkspace() {
  const {
    state,
    settings,
    user,
    t,
    addToCart,
    updateCartLine,
    removeCartLine,
    clearCart,
    setCartCustomer,
    setCartDiscount,
    holdCurrentBill,
    recallHeldBill,
    completeSale,
    notify,
  } = useZyro();
  const router = useRouter();
  const { isPhone } = useBreakpoint();

  const [stage, setStage] = useState<'register' | 'tender' | 'complete'>('register');
  const [completedBill, setCompletedBill] = useState<BillRecord | null>(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [mobileView, setMobileView] = useState<'catalog' | 'bill'>('catalog');

  // Overlays
  const [variantItem, setVariantItem] = useState<ProductItem | null>(null);
  const [measuredBlockedOpen, setMeasuredBlockedOpen] = useState(false);
  const [customerOpen, setCustomerOpen] = useState(false);
  const [discountOpen, setDiscountOpen] = useState(false);
  const [heldOpen, setHeldOpen] = useState(false);
  const [editLine, setEditLine] = useState<CartLine | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);

  const customer = useMemo(
    () => state.customers.find((c) => c.id === state.cartCustomerId) || null,
    [state.customers, state.cartCustomerId]
  );

  const subtotal = useMemo(
    () => state.cart.reduce((s, l) => s + l.price * l.qty, 0),
    [state.cart]
  );
  const discountAmt = useMemo(
    () => calcDiscountAmount(state.cartDiscount, subtotal),
    [state.cartDiscount, subtotal]
  );
  const total = Math.max(0, subtotal - discountAmt);
  const itemCount = useMemo(
    () => state.cart.reduce((s, l) => s + l.qty, 0),
    [state.cart]
  );

  const handleSelectProduct = (item: ProductItem) => {
    if (item.measured) {
      if (!state.measuredPilotUnlocked) {
        setMeasuredBlockedOpen(true);
        return;
      }
      addToCart({
        key: `${item.id}-m-x`,
        itemId: item.id,
        name: item.name,
        variantText: `Measured (${item.unit || '/ m'})`,
        sku: item.sku,
        colourIdx: null,
        sizeIdx: null,
        price: item.price,
        originalPrice: item.price,
        qty: 1,
        lineDiscount: 0,
      });
      notify(`Added 1 ${item.unit?.replace('/', '').trim() || 'm'} ${item.name} (tap line to enter decimal cut)`, 'ok');
      return;
    }
    if (item.colours && item.colours.length > 0) {
      setVariantItem(item);
      return;
    }
    const stock = getVariantStock(item, null, null);
    if (stock === 0) {
      notify(`${item.name} is out of stock`, 'err');
      return;
    }
    addToCart({
      key: `${item.id}-x-x`,
      itemId: item.id,
      name: item.name,
      variantText: 'One size',
      sku: item.sku,
      colourIdx: null,
      sizeIdx: null,
      price: item.price,
      originalPrice: item.price,
      qty: 1,
      lineDiscount: 0,
    });
    notify(`Added ${item.name}`, 'ok');
  };

  const handleBarcodeSubmit = () => {
    const q = barcodeInput.trim().toUpperCase();
    if (!q) return;
    const match = state.items.find(
      (it) =>
        it.sku.toUpperCase() === q ||
        q.startsWith(it.sku.toUpperCase() + '-') ||
        (it.barcode && it.barcode.toUpperCase() === q)
    );
    if (!match) {
      notify(`Barcode “${q}” not found`, 'err');
      return;
    }
    if (match.measured) {
      if (!state.measuredPilotUnlocked) {
        setMeasuredBlockedOpen(true);
        setBarcodeInput('');
        return;
      }
      addToCart({
        key: `${match.id}-m-x`,
        itemId: match.id,
        name: match.name,
        variantText: `Measured (${match.unit || '/ m'})`,
        sku: match.sku,
        colourIdx: null,
        sizeIdx: null,
        price: match.price,
        originalPrice: match.price,
        qty: 1,
        lineDiscount: 0,
      });
      notify(`Added ${match.name} (tap line to enter decimal cut)`, 'ok');
      setBarcodeInput('');
      return;
    }

    let ci: number | null = null;
    let si: number | null = null;

    if (match.colours && match.colours.length > 0) {
      const sizeCount = match.sizes && match.sizes.length > 0 ? match.sizes.length : 0;
      let foundExact = false;
      for (let cIdx = 0; cIdx < match.colours.length && !foundExact; cIdx++) {
        if (sizeCount > 0) {
          for (let sIdx = 0; sIdx < sizeCount; sIdx++) {
            if (getSku(match, cIdx, sIdx).toUpperCase() === q) {
              ci = cIdx;
              si = sIdx;
              foundExact = true;
              break;
            }
          }
        } else if (getSku(match, cIdx, null).toUpperCase() === q) {
          ci = cIdx;
          si = null;
          foundExact = true;
        }
      }

      if (!foundExact) {
        ci = getFirstInStockColour(match);
        if (sizeCount > 0) {
          let firstInStockSi = 0;
          for (let sIdx = 0; sIdx < sizeCount; sIdx++) {
            if (getVariantStock(match, ci, sIdx) > 0) {
              firstInStockSi = sIdx;
              break;
            }
          }
          si = firstInStockSi;
        }
      }
    }

    const stock = getVariantStock(match, ci, si);
    const variantText = getVariantText(match, ci, si);
    if (stock <= 0) {
      notify(`${match.name} (${variantText}) is out of stock`, 'err');
      return;
    }

    addToCart({
      key: `${match.id}-${ci ?? 'x'}-${si ?? 'x'}`,
      itemId: match.id,
      name: match.name,
      variantText,
      sku: getSku(match, ci, si),
      colourIdx: ci,
      sizeIdx: si,
      price: match.price,
      originalPrice: match.price,
      qty: 1,
      lineDiscount: 0,
    });
    notify(`Scanned ${match.name}`, 'ok');
    setBarcodeInput('');
  };

  if (stage === 'tender') {
    return (
      <>
        <TenderScreen
          subtotal={subtotal}
          discountAmt={discountAmt}
          total={total}
          itemCount={itemCount}
          billNo={state.nextBillNo}
          customer={customer}
          onBack={() => setStage('register')}
          onNeedCustomer={() => setCustomerOpen(true)}
          onComplete={({ pay, recv, splits }) => {
            const bill = completeSale({ pay, recv, splits, discountAmt });
            setCompletedBill(bill);
            setStage('complete');
          }}
        />
        <CustomerSelector
          open={customerOpen}
          onClose={() => setCustomerOpen(false)}
          currentId={state.cartCustomerId}
          onPick={(c) => setCartCustomer(c?.id || null)}
        />
      </>
    );
  }

  if (stage === 'complete' && completedBill) {
    return (
      <SaleCompleteScreen
        bill={completedBill}
        onNewSale={() => {
          setCompletedBill(null);
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
              Bill #{state.nextBillNo}
            </span>
            <Badge tone="neutral">{itemCount} {t('items')}</Badge>
          </div>
          {state.cart.length > 0 && (
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
                {customer ? customer.name : t('walkIn')}
              </div>
              {customer && customer.khata > 0 && (
                <div className="text-[11px] text-[#8A3D12] font-semibold">
                  Khata owes {formatRs(customer.khata)}
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
        {state.cart.length === 0 ? (
          <div className="py-12 text-center space-y-2 text-[#52666A]">
            <ShoppingBag className="w-8 h-8 mx-auto opacity-50" />
            <div className="font-semibold text-[14px] text-[#0B2A2F]">Empty bill</div>
            <div className="text-[13px]">Tap items on the left or scan a barcode to start</div>
          </div>
        ) : (
          state.cart.map((line) => {
            const itemObj = state.items.find((x) => x.id === line.itemId);
            return (
              <div key={line.key} className="py-3 flex items-center gap-3">
                {itemObj && <ProductArtwork item={itemObj} colourIdx={line.colourIdx} size={42} />}
                <button
                  type="button"
                  onClick={() => setEditLine(line)}
                  className="flex-1 min-w-0 text-start"
                >
                  <div className="font-semibold text-[14px] text-[#0B2A2F] truncate">{line.name}</div>
                  <div className="text-[12px] text-[#52666A] truncate">
                    {line.variantText} · <span className="mono">{line.sku}</span>
                  </div>
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
                <div className="w-20 text-end font-bold text-[14px] num">
                  {formatRs(line.price * line.qty)}
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
            disabled={state.cart.length === 0}
          >
            <Percent className="w-4 h-4" />
            {state.cartDiscount ? `Discount (−${formatRs(discountAmt)})` : t('discount')}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="flex-1"
            onClick={() => setHeldOpen(true)}
          >
            <PauseCircle className="w-4 h-4" />
            {t('heldBills')} ({state.heldBills.length})
          </Button>
        </div>

        <PaymentSummary subtotal={subtotal} discountAmt={discountAmt} total={total} itemCount={itemCount} />

        <Button
          variant="primary"
          size="counter"
          fullWidth
          disabled={state.cart.length === 0}
          onClick={() => setStage('tender')}
        >
          {t('pay')} · {formatRs(total)}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#F4EFE9] overflow-hidden">
      {/* Top counter bar */}
      <header className="h-[58px] shrink-0 bg-[#08343A] text-white px-3 sm:px-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Link
            href="/dashboard"
            className="px-2.5 py-1.5 rounded-[9px] bg-white/10 hover:bg-white/15 text-[13px] font-semibold flex items-center gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back office</span>
          </Link>
          <div className="min-w-0">
            <div className="font-display font-bold text-[15px] truncate">
              {state.session.shopName} · Register
            </div>
            <div className="text-[11px] text-[#C9DADB] truncate">
              {user.name} ({user.roleLabel})
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {settings.offlineModeSimulated && (
            <Badge tone="warn">
              <WifiOff className="w-3.5 h-3.5" /> Offline
            </Badge>
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
                icon: <Receipt className="w-4 h-4" />,
                onSelect: () => router.push('/pos/bills'),
              },
              {
                id: 'returns',
                label: 'Return or exchange',
                icon: <RotateCcw className="w-4 h-4" />,
                onSelect: () => router.push('/pos/returns'),
              },
              {
                id: 'quote',
                label: 'Create quote',
                icon: <FileText className="w-4 h-4" />,
                onSelect: () => router.push('/pos/quotes'),
              },
              {
                id: 'shoe-ex',
                label: 'Shoe size exchange',
                icon: <RefreshCw className="w-4 h-4" />,
                onSelect: () => router.push('/pos/exchange'),
              },
              {
                id: 'sync',
                label: 'Sync check',
                icon: <BookOpen className="w-4 h-4" />,
                onSelect: () => router.push('/pos/sync-check'),
              },
              {
                id: 'close-shift',
                label: 'Close shift',
                icon: <PauseCircle className="w-4 h-4" />,
                onSelect: () => router.push('/cash/close-shift'),
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
                  onSubmit={handleBarcodeSubmit}
                  placeholder="Scan barcode or SKU (e.g. TEE)"
                  rightSlot={
                    <button
                      type="button"
                      onClick={handleBarcodeSubmit}
                      className="px-2 py-1 rounded bg-[#08343A] text-white text-[12px] font-semibold"
                    >
                      Scan
                    </button>
                  }
                />
              </div>
              <ProductSelector onSelect={handleSelectProduct} />
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
              <ScanBarcode className="w-4 h-4" /> Items
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
                onSubmit={handleBarcodeSubmit}
                placeholder="Scan barcode or type SKU (e.g. TEE, KUR, LWN) + Enter"
                rightSlot={
                  <Button size="sm" variant="dark" onClick={handleBarcodeSubmit}>
                    <ScanBarcode className="w-4 h-4" /> Scan
                  </Button>
                }
              />
            </div>
            <ProductSelector onSelect={handleSelectProduct} />
          </div>
          <div className="col-span-5 xl:col-span-4 min-h-0">{cartPane}</div>
        </div>
      )}

      {/* Modals & Drawers */}
      <VariantPickerModal
        key={`variant-${variantItem?.id ?? 'none'}`}
        item={variantItem}
        onClose={() => setVariantItem(null)}
        onAdd={(line) => {
          addToCart(line);
          notify(`Added ${line.name} (${line.variantText})`, 'ok');
        }}
      />
      <MeasuredBlockedModal
        open={measuredBlockedOpen}
        onClose={() => setMeasuredBlockedOpen(false)}
      />
      <CustomerSelector
        open={customerOpen}
        onClose={() => setCustomerOpen(false)}
        currentId={state.cartCustomerId}
        onPick={(c) => setCartCustomer(c?.id || null)}
      />
      <DiscountModal
        open={discountOpen}
        onClose={() => setDiscountOpen(false)}
        subtotal={subtotal}
        current={state.cartDiscount}
        onApply={setCartDiscount}
        onRemove={() => setCartDiscount(null)}
      />
      <LineEditModal
        key={`line-edit-${editLine?.key ?? 'none'}`}
        line={editLine}
        onClose={() => setEditLine(null)}
        onSave={updateCartLine}
        onRemove={removeCartLine}
      />
      <HeldBillsDrawer
        open={heldOpen}
        onClose={() => setHeldOpen(false)}
        heldBills={state.heldBills}
        canHoldCurrent={state.cart.length > 0}
        onHoldCurrent={(note) => {
          holdCurrentBill(note);
          notify('Bill placed on hold', 'info');
        }}
        onRecall={(id) => {
          const hadCart = state.cart.length > 0;
          recallHeldBill(id);
          notify(
            hadCart
              ? 'Brought held bill back (previous cart saved to Held bills)'
              : 'Brought held bill back to register',
            'ok'
          );
        }}
      />
      <ConfirmDialog
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={() => {
          clearCart();
          notify('Bill cleared', 'info');
        }}
        title={`Clear Bill #${state.nextBillNo}?`}
        body="All items and discounts on this unsaved bill will be removed."
        confirmLabel="Clear bill"
      />
    </div>
  );
}
