'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Camera, CheckCircle2, Smartphone, Upload } from 'lucide-react';
import { ProductArtwork } from '@/components/domain/ProductArtwork';
import { PageHeader } from '@/components/layout/PageHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Select } from '@/components/ui/Select';
import { Tabs } from '@/components/ui/Tabs';
import { useZyro } from '@/hooks/useZyro';
import { generateQrPath } from '@/lib/inventory';

export function PhotoHandoffPanel() {
  const { state, notify } = useZyro();
  const [tab, setTab] = useState<'qr' | 'upload' | 'cam'>('qr');
  const [selectedItemId, setSelectedItemId] = useState(state.items[0]?.id || 'tee');
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const item = state.items.find((i) => i.id === selectedItemId) || state.items[0];
  const qrPath = generateQrPath(123, 132);

  return (
    <div className="max-w-[760px] space-y-5">
      <PageHeader
        eyebrow="Catalog media · Fast phone handoff"
        title="Product photos"
        subtitle="Snap item photos on your phone without logging in, or upload from this computer."
        actions={
          <Link href="/inventory">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-4 h-4" /> Back to stock
            </Button>
          </Link>
        }
      />

      <Card className="space-y-4">
        <Select
          label="Target item"
          value={selectedItemId}
          onChange={(e) => setSelectedItemId(e.target.value)}
          options={state.items.map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` }))}
        />

        <Tabs
          variant="pill"
          activeId={tab}
          onChange={(id) => setTab(id as typeof tab)}
          tabs={[
            { id: 'qr', label: 'Phone QR handoff' },
            { id: 'upload', label: 'Upload file' },
            { id: 'cam', label: 'Webcam capture' },
          ]}
        />

        {tab === 'qr' && (
          <div className="p-5 rounded-[12px] bg-[#FBF8F4] border border-[#E7E0D7] flex flex-col sm:flex-row items-center gap-6">
            <div className="p-3 bg-white rounded-[12px] border border-[#E7E0D7] shrink-0">
              <svg width="132" height="132" viewBox="0 0 132 132">
                <path d={qrPath} fill="#08343A" />
              </svg>
            </div>
            <div className="space-y-2.5 text-center sm:text-start">
              <Badge tone="ok" withIcon>
                <Smartphone className="w-3.5 h-3.5" /> Ready for phone camera
              </Badge>
              <div className="font-display font-bold text-[16px] text-[#0B2A2F]">
                Scan with your phone to shoot {item?.name}
              </div>
              <p className="text-[13px] text-[#52666A]">
                Opens a temporary one-time upload page linked directly to SKU <span className="mono">{item?.sku}</span>.
              </p>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => notify(`Synced 1 new phone photo for ${item?.name}`, 'ok')}
              >
                <CheckCircle2 className="w-4 h-4" /> Simulate phone photo received
              </Button>
            </div>
          </div>
        )}

        {tab === 'upload' && (
          <div className="p-6 rounded-[12px] border-2 border-dashed border-[#D6CDC1] bg-[#FBF8F4] text-center space-y-3">
            <Upload className="w-8 h-8 mx-auto text-[#08343A]" />
            <div className="font-semibold text-[14px] text-[#0B2A2F]">
              Choose JPG or PNG photo for {item?.name}
            </div>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setUploadedFile(file.name);
                  notify(`Attached ${file.name} to ${item?.name}`, 'ok');
                }
              }}
              className="mx-auto block text-[13px] text-[#52666A]"
            />
            {uploadedFile && (
              <Badge tone="ok">Attached: {uploadedFile}</Badge>
            )}
          </div>
        )}

        {tab === 'cam' && (
          <div className="p-6 rounded-[12px] bg-[#08343A] text-white text-center space-y-4">
            <div className="w-24 h-24 mx-auto rounded-[16px] bg-white/10 flex items-center justify-center">
              {item ? <ProductArtwork item={item} size={64} /> : <Camera className="w-8 h-8" />}
            </div>
            <div className="text-[14px] text-[#D7E6E6]">
              USB counter webcam preview ready for <strong className="text-white">{item?.name}</strong>
            </div>
            <Button
              variant="primary"
              onClick={() => notify(`Captured studio frame for ${item?.name}`, 'ok')}
            >
              <Camera className="w-4 h-4" /> Capture photo
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
