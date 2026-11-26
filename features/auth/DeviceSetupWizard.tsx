'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Check, CheckCircle2, Info, Monitor, Printer, RefreshCw, Smartphone } from 'lucide-react';
import { useZyro } from '@/hooks/useZyro';
import type { LanguageId } from '@/types';
import { AuthFlowShell } from './AuthFlowShell';

type SetupStep = 'lang' | 'shop' | 'device' | 'printer' | 'products' | 'ready';

const STEP_LIST: Array<{ id: SetupStep; label: string }> = [
  { id: 'lang', label: 'Language' },
  { id: 'shop', label: 'Your shop' },
  { id: 'device', label: 'This counter' },
  { id: 'printer', label: 'Printer' },
  { id: 'products', label: 'Products' },
  { id: 'ready', label: 'Ready' },
];

export function DeviceSetupWizard() {
  const router = useRouter();
  const { session, lang, setLanguage, settings, updateSettings, completeAuthSignIn, notify } = useZyro();

  const [step, setStep] = useState<SetupStep>('lang');
  const [deviceUse, setDeviceUse] = useState<'main' | 'second' | 'backoffice'>('main');
  const [devName, setDevName] = useState('Counter 1');
  const [paperSize, setPaperSize] = useState<'80mm' | '58mm'>('80mm');
  const [tested, setTested] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (step !== 'products') return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 142) {
          clearInterval(interval);
          return 142;
        }
        return Math.min(142, p + 18);
      });
    }, 120);
    return () => clearInterval(interval);
  }, [step]);

  const curIdx = STEP_LIST.findIndex((s) => s.id === step);
  const steps = STEP_LIST.map((s, i) => ({
    id: s.id,
    label: s.label,
    done: i < curIdx || (step === 'ready' && i === curIdx),
    active: i === curIdx && !(step === 'ready' && i === curIdx),
    number: i + 1,
  }));

  const finishSetup = (target: string) => {
    updateSettings({
      printer: {
        ...settings.printer,
        name: `Epson TM-T88V (${devName.trim() || 'Counter 1'})`,
        paperWidth: paperSize,
      },
    });
    completeAuthSignIn(session.user.role);
    notify(`${devName.trim() || 'Counter 1'} is ready to sell`, 'ok');
    router.push(target);
  };

  let nextLabel = 'Next';
  let onNext: (() => void) | undefined = undefined;
  let onBack: (() => void) | undefined = undefined;
  let backHref: string | undefined = undefined;

  if (step === 'lang') {
    backHref = '/welcome';
    onNext = () => setStep('shop');
  } else if (step === 'shop') {
    onBack = () => setStep('lang');
    onNext = () => setStep('device');
  } else if (step === 'device') {
    onBack = () => setStep('shop');
    onNext = () => {
      if (devName.trim()) setStep('printer');
    };
  } else if (step === 'printer') {
    onBack = () => setStep('device');
    onNext = () => setStep('products');
  } else if (step === 'products') {
    nextLabel = progress >= 142 ? 'Continue' : 'Downloading…';
    onBack = () => setStep('printer');
    onNext = () => setStep('ready');
  } else if (step === 'ready') {
    nextLabel = 'Open sell register';
    onNext = () => finishSetup('/pos');
  }

  const TITLES: Record<SetupStep, { t: string; s: string }> = {
    lang: {
      t: 'Pick a language',
      s: 'You can change it anytime in Settings.',
    },
    shop: {
      t: 'Confirm your shop',
      s: 'Everything sold on this counter goes under this shop and branch.',
    },
    device: {
      t: 'Name this counter',
      s: 'Appears on cash shifts, bills and sync checks.',
    },
    printer: {
      t: 'Receipt printer',
      s: 'Pick your thermal roll size and run a quick test print.',
    },
    products: {
      t: 'Download shop catalog',
      s: 'Saves items, prices and customers locally so you can sell offline.',
    },
    ready: {
      t: `${devName.trim() || 'Counter 1'} is ready`,
      s: 'This device is set up and ready to take sales.',
    },
  };

  return (
    <AuthFlowShell
      railTitle="First-run setup"
      railSub="About 3 minutes"
      steps={steps}
      stepOf={`Step ${curIdx + 1} of ${STEP_LIST.length}`}
      stepNo={curIdx + 1}
      stepMax={STEP_LIST.length}
      helpText="Stuck? Message Zyro support and we’ll set it up with you."
      title={TITLES[step].t}
      subtitle={TITLES[step].s}
      maxWidth={580}
      hasFooter
      hasBack={step !== 'ready'}
      backHref={backHref}
      onBack={onBack}
      why={step === 'device' && !devName.trim() ? 'Type a name for this counter' : ''}
      nextLabel={nextLabel}
      onNext={onNext}
      nextDisabled={(step === 'device' && !devName.trim()) || (step === 'products' && progress < 142)}
      secondaryLabel={step === 'ready' ? 'Go to Home' : undefined}
      onSecondary={step === 'ready' ? () => finishSetup('/dashboard') : undefined}
    >
      {step === 'lang' && (
        <div role="radiogroup" className="flex flex-col gap-2.5">
          {(
            [
              {
                id: 'en' as LanguageId,
                label: 'English',
                sample: 'Sell, track stock and close the day.',
              },
              {
                id: 'roman' as LanguageId,
                label: 'Roman Urdu',
                sample: 'Sale, stock aur din ka hisaab, sab aik jagah.',
              },
              {
                id: 'ur' as LanguageId,
                label: 'اردو',
                sample: 'فروخت، اسٹاک اور دن کا حساب، سب ایک جگہ۔',
              },
            ]
          ).map((opt) => {
            const on = lang === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setLanguage(opt.id)}
                className="min-h-[88px] flex items-center gap-3.5 py-3 px-4 rounded-[16px] text-start transition-colors"
                style={{
                  border: on ? '2px solid #C9682E' : '1px solid #E7E0D7',
                  backgroundColor: on ? '#FCEFE4' : '#FFFFFF',
                }}
              >
                <span
                  className="w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center"
                  style={{ border: `2px solid ${on ? '#C9682E' : '#8A8276'}` }}
                >
                  {on && <span className="w-[11px] h-[11px] rounded-full bg-[#C9682E]" />}
                </span>
                <span className="flex-1 flex flex-col gap-0.5">
                  <span className="text-[17px] font-bold">{opt.label}</span>
                  <span className="text-[14px] text-[#3D5357]">{opt.sample}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}

      {step === 'shop' && (
        <div className="flex flex-col gap-3.5">
          <section className="bg-white border border-[#E7E0D7] rounded-[18px] overflow-hidden">
            {[
              ['Shop name', session.shopName],
              ['City', settings.city || 'Lahore'],
              ['Branch', 'Main branch'],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between gap-3 min-h-[60px] py-2 px-[18px] border-b border-[#F1EBE3] last:border-b-0"
              >
                <span className="text-[14px] text-[#52666A]">{k}</span>
                <span className="text-[16px] font-bold text-end">{v}</span>
              </div>
            ))}
          </section>
          <p className="m-0 text-[14px] text-[#52666A]">
            Wrong shop? Change your shop details anytime in Settings.
          </p>
        </div>
      )}

      {step === 'device' && (
        <div className="flex flex-col gap-3.5">
          <div role="radiogroup" className="flex flex-col gap-2.5">
            {(
              [
                {
                  id: 'main' as const,
                  label: 'Main counter',
                  sub: 'Takes bills, opens cash shifts and prints receipts',
                  icon: Monitor,
                },
                {
                  id: 'second' as const,
                  label: 'Second till or tablet',
                  sub: 'Sells alongside the main counter',
                  icon: Smartphone,
                },
                {
                  id: 'backoffice' as const,
                  label: 'Back office laptop',
                  sub: 'Checks reports, stock and supplier bills',
                  icon: Monitor,
                },
              ]
            ).map((opt) => {
              const on = deviceUse === opt.id;
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => {
                    setDeviceUse(opt.id);
                    setDevName(
                      opt.id === 'main' ? 'Counter 1' : opt.id === 'second' ? 'Counter 2' : 'Office PC'
                    );
                  }}
                  className="min-h-[72px] flex items-center gap-3.5 py-2.5 px-4 rounded-[16px] text-start"
                  style={{
                    border: on ? '2px solid #C9682E' : '1px solid #E7E0D7',
                    backgroundColor: on ? '#FCEFE4' : '#FFFFFF',
                  }}
                >
                  <span
                    className="w-11 h-11 shrink-0 rounded-[12px] flex items-center justify-center"
                    style={{
                      backgroundColor: on ? '#FFFFFF' : '#F1EBE3',
                      color: '#08343A',
                    }}
                  >
                    <Icon className="w-[22px] h-[22px]" />
                  </span>
                  <span className="flex-1 flex flex-col gap-0.5">
                    <span className="text-[16px] font-bold">{opt.label}</span>
                    <span className="text-[14px] text-[#52666A]">{opt.sub}</span>
                  </span>
                  <span
                    className="w-[22px] h-[22px] shrink-0 rounded-full flex items-center justify-center"
                    style={{ border: `2px solid ${on ? '#C9682E' : '#8A8276'}` }}
                  >
                    {on && <span className="w-[11px] h-[11px] rounded-full bg-[#C9682E]" />}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="su-n" className="text-[14px] font-semibold text-[#3D5357]">
              Counter name
            </label>
            <input
              id="su-n"
              value={devName}
              onChange={(e) => setDevName(e.target.value)}
              className="field h-[56px] border border-[#8A8276] rounded-[14px] bg-white px-3.5 text-[17px]"
            />
            <span className="text-[14px] text-[#52666A]">
              Printed at the bottom of bills from this counter.
            </span>
          </div>
        </div>
      )}

      {step === 'printer' && (
        <div className="flex flex-col gap-3.5">
          <div className="flex gap-2.5 rounded-[14px] bg-[#FFF3C4] text-[#6B4E00] p-3.5 text-[16px] leading-[1.5]">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            <span>Preview mode: printer test sends a simulated slip to your browser print preview.</span>
          </div>

          <div role="radiogroup" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(
              [
                ['80mm', '80 mm thermal', 'Standard counter receipt'],
                ['58mm', '58 mm portable', 'Compact pocket printer'],
              ] as const
            ).map(([id, label, sub]) => {
              const on = paperSize === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setPaperSize(id)}
                  className="min-h-[76px] flex items-center gap-3 py-2.5 px-3.5 rounded-[16px] text-start"
                  style={{
                    border: on ? '2px solid #C9682E' : '1px solid #E7E0D7',
                    backgroundColor: on ? '#FCEFE4' : '#FFFFFF',
                  }}
                >
                  <span
                    className="w-5 h-5 shrink-0 rounded-full flex items-center justify-center"
                    style={{ border: `2px solid ${on ? '#C9682E' : '#8A8276'}` }}
                  >
                    {on && <span className="w-2.5 h-2.5 rounded-full bg-[#C9682E]" />}
                  </span>
                  <span className="flex-1 flex flex-col gap-0.5">
                    <span className="text-[16px] font-bold">{label}</span>
                    <span className="text-[14px] text-[#52666A]">{sub}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => {
              setTested(true);
              notify('Test receipt printed OK', 'ok');
            }}
            className="bs self-start h-[52px] px-[18px] rounded-[14px] text-[16px] font-bold inline-flex items-center gap-2.5"
          >
            <Printer className="w-5 h-5" />
            Print a test receipt
          </button>

          {tested && (
            <div className="flex gap-2.5 rounded-[14px] bg-[#E8F6EE] text-[#14532D] py-2.5 px-3.5 text-[16px]">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              <span>Test slip looks clear on {paperSize} paper.</span>
            </div>
          )}
        </div>
      )}

      {step === 'products' && (
        <div className="flex flex-col gap-3.5">
          <section className="bg-white border border-[#E7E0D7] rounded-[18px] p-[18px] flex flex-col gap-3.5">
            <div className="flex items-center gap-3.5">
              <span
                className="w-12 h-12 shrink-0 rounded-[14px] flex items-center justify-center"
                style={{
                  backgroundColor: progress >= 142 ? '#E8F6EE' : '#EDF3FF',
                  color: progress >= 142 ? '#14532D' : '#1E40AF',
                }}
              >
                {progress >= 142 ? (
                  <Check className="w-6 h-6" />
                ) : (
                  <RefreshCw className="w-6 h-6 animate-spin" />
                )}
              </span>
              <div className="flex-1 flex flex-col gap-0.5">
                <span className="text-[16px] font-bold">
                  {progress >= 142 ? 'Catalog synced offline' : 'Downloading items & Khata…'}
                </span>
                <span className="num text-[14px] text-[#52666A]">{progress} of 142 items</span>
              </div>
            </div>
            <div className="h-2.5 rounded-full bg-[#EAE3D9] overflow-hidden">
              <span
                className="block h-full rounded-full transition-all duration-150"
                style={{
                  width: `${Math.round((progress / 142) * 100)}%`,
                  backgroundColor: progress >= 142 ? '#2F9E63' : '#08343A',
                }}
              />
            </div>
            <span className="num text-[14px] text-[#3D5357]">
              {progress >= 142 ? 'Ready for offline selling.' : 'Keeping this device ready even if internet drops.'}
            </span>
          </section>
        </div>
      )}

      {step === 'ready' && (
        <div className="flex flex-col gap-3.5">
          <section className="bg-white border border-[#E7E0D7] rounded-[18px] overflow-hidden">
            {[
              ['Shop', session.shopName],
              ['Counter', devName.trim() || 'Counter 1'],
              ['Printer', `${paperSize} thermal`],
              ['Offline catalog', '142 items synced'],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center gap-3 min-h-[56px] py-2 px-[18px] border-b border-[#F1EBE3] last:border-b-0"
              >
                <Check className="w-[18px] h-[18px] text-[#2F9E63] shrink-0 stroke-[2.5]" />
                <span className="flex-1 text-[14px] text-[#52666A]">{k}</span>
                <span className="text-[16px] font-bold text-end">{v}</span>
              </div>
            ))}
          </section>
          <div className="flex gap-2.5 rounded-[14px] bg-[#EDF3FF] text-[#1E40AF] py-3 px-3.5 text-[16px] leading-[1.5]">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <span>You can sell immediately even if internet disconnects.</span>
          </div>
        </div>
      )}
    </AuthFlowShell>
  );
}
