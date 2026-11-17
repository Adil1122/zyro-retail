'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Monitor, Printer, RefreshCw } from 'lucide-react';
import { LanguageSwitcher } from '@/components/domain/LanguageSwitcher';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { useZyro } from '@/hooks/useZyro';

type SetupStep = 'device' | 'printer' | 'products' | 'ready';

export function DeviceSetupWizard() {
  const router = useRouter();
  const { session, settings, updateSettings, completeAuthSignIn, notify } = useZyro();
  const [step, setStep] = useState<SetupStep>('device');
  const [deviceName, setDeviceName] = useState('Counter 1');
  const [printerTested, setPrinterTested] = useState(false);

  const testPrinter = () => {
    setPrinterTested(true);
    notify('Test slip sent to 80 mm receipt printer', 'ok');
  };

  const syncCatalog = () => {
    setStep('products');
    setTimeout(() => {
      setStep('ready');
    }, 800);
  };

  const finish = () => {
    updateSettings({
      printer: { ...settings.printer, name: `Epson TM-T88V (${deviceName})` },
    });
    completeAuthSignIn(session.user.role);
    router.push('/pos');
  };

  return (
    <Card padding="lg" className="w-full max-w-[540px] space-y-5">
      <div className="flex items-center justify-between">
        <Badge tone="neutral">Device setup</Badge>
        <LanguageSwitcher compact />
      </div>

      {step === 'device' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#08343A] text-white flex items-center justify-center">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">Name this counter</h1>
              <p className="text-[13px] text-[#52666A]">{session.shopName} · Main branch</p>
            </div>
          </div>
          <Input
            label="Register / counter name"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            hint="Appears on cash shifts, bills, and sync checks"
          />
          <Button variant="primary" size="lg" fullWidth onClick={() => setStep('printer')}>
            Continue to printer <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {step === 'printer' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-[10px] bg-[#FCEFE4] text-[#8A3D12] flex items-center justify-center">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-display text-[22px] font-bold text-[#0B2A2F]">Connect receipt printer</h1>
              <p className="text-[13px] text-[#52666A]">80 mm thermal USB or network printer</p>
            </div>
          </div>
          <div className="p-4 rounded-[12px] border border-[#E7E0D7] bg-[#FBF8F4] flex items-center justify-between">
            <div>
              <div className="font-semibold text-[14px]">Epson TM-T88V · 80 mm</div>
              <div className="text-[12px] text-[#52666A]">
                {printerTested ? 'Test slip printed OK' : 'Ready to print a test slip'}
              </div>
            </div>
            <Button variant="secondary" size="sm" onClick={testPrinter}>
              Print test
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setStep('device')}>
              Back
            </Button>
            <Button variant="primary" className="flex-1" onClick={syncCatalog}>
              Download shop catalog <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {step === 'products' && (
        <div className="py-10 text-center space-y-3">
          <RefreshCw className="w-9 h-9 text-[#08343A] animate-spin mx-auto" />
          <h2 className="font-display text-[20px] font-bold">Downloading catalog for offline selling…</h2>
          <p className="text-[13px] text-[#52666A]">Syncing items, prices, barcodes & customer Khata</p>
        </div>
      )}

      {step === 'ready' && (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#E8F6EE] text-[#14532D] mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h1 className="font-display text-[22px] font-bold">{deviceName} is ready to sell</h1>
            <p className="text-[14px] text-[#52666A] mt-1">
              Catalog synced locally. You can sell even if internet drops.
            </p>
          </div>
          <Button variant="primary" size="lg" fullWidth onClick={finish}>
            Open sell register <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      )}
    </Card>
  );
}
