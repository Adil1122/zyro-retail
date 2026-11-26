'use client';

import React from 'react';
import Link from 'next/link';
import { Check, ChevronRight, KeyRound, Store, UserPlus } from 'lucide-react';
import { useZyro } from '@/hooks/useZyro';
import type { LanguageId } from '@/types';
import { MiniatureOwnerHomePreview } from './MiniatureOwnerHomePreview';

const COPY = {
  w_pitch: [
    'Sell, track stock and close the day, all in one place.',
    'Sale, stock aur din ka hisaab, sab aik jagah.',
    'فروخت، اسٹاک اور دن کا حساب، سب ایک جگہ۔',
  ],
  w_b1: [
    'Works on the laptop, tablet and phone you already have',
    'Aap ke laptop, tablet aur phone par chalta hai',
    'آپ کے لیپ ٹاپ، ٹیبلٹ اور فون پر چلتا ہے',
  ],
  w_b2: [
    'English, Roman Urdu or Urdu',
    'English, Roman Urdu ya Urdu',
    'انگریزی، رومن اردو یا اردو',
  ],
  w_b3: [
    'Staff only see what their job needs',
    'Staff ko sirf apne kaam ki cheezein nazar aati hain',
    'عملے کو صرف اپنے کام کی چیزیں نظر آتی ہیں',
  ],
  w_cap: [
    'The owner’s Home once the shop is set up',
    'Shop set hone ke baad owner ka Home',
    'دکان سیٹ ہونے کے بعد مالک کا ہوم',
  ],
  w_title: [
    'Welcome to Zyro POS',
    'Zyro POS mein khush aamdeed',
    'زائرو پی او ایس میں خوش آمدید',
  ],
  w_sub: [
    'How do you want to start?',
    'Aap kaise shuru karna chahte hain?',
    'آپ کیسے شروع کرنا چاہتے ہیں؟',
  ],
  c1t: [
    'Create my shop’s account',
    'Apni shop ka account banayein',
    'اپنی دکان کا اکاؤنٹ بنائیں',
  ],
  c1s: [
    'New to Zyro. About 5 minutes; keep your phone near for a code.',
    'Zyro par naye hain. Taqreeban 5 minute; code ke liye phone paas rakhein.',
    'زائرو پر نئے ہیں۔ تقریباً 5 منٹ؛ کوڈ کے لیے فون پاس رکھیں۔',
  ],
  c2t: ['Sign in', 'Sign in karein', 'سائن اِن کریں'],
  c2s: [
    'You already have a Zyro account, on the web or the phone app.',
    'Aap ka Zyro account pehle se hai, web ya phone app par.',
    'آپ کا زائرو اکاؤنٹ پہلے سے ہے، ویب یا فون ایپ پر۔',
  ],
  c3t: [
    'Join my shop as staff',
    'Staff ke taur par shop join karein',
    'عملے کے طور پر دکان میں شامل ہوں',
  ],
  c3s: [
    'You work in a shop and the owner added your number.',
    'Aap shop par kaam karte hain aur owner ne aap ka number add kiya hai.',
    'آپ دکان پر کام کرتے ہیں اور مالک نے آپ کا نمبر شامل کیا ہے۔',
  ],
  help: [
    'Stuck? Message Zyro support and we’ll set it up with you.',
    'Mushkil ho to Zyro support ko message karein, hum saath mil kar set kar denge.',
    'مشکل ہو تو زائرو سپورٹ کو پیغام بھیجیں، ہم مل کر سیٹ کر دیں گے۔',
  ],
} as const;

const LANG_OPTIONS: Array<{ id: LanguageId; label: string; isUrdu?: boolean }> = [
  { id: 'en', label: 'English' },
  { id: 'roman', label: 'Roman Urdu' },
  { id: 'ur', label: 'اردو', isUrdu: true },
];

export function WelcomeScreen() {
  const { lang, setLanguage } = useZyro();
  const li = lang === 'roman' ? 1 : lang === 'ur' ? 2 : 0;
  const ur = lang === 'ur';

  const choices = [
    {
      href: '/register',
      title: COPY.c1t[li],
      sub: COPY.c1s[li],
      icon: Store,
      primary: true,
    },
    {
      href: '/sign-in',
      title: COPY.c2t[li],
      sub: COPY.c2s[li],
      icon: KeyRound,
      primary: false,
    },
    {
      href: '/staff-join',
      title: COPY.c3t[li],
      sub: COPY.c3s[li],
      icon: UserPlus,
      primary: false,
    },
  ];

  return (
    <div
      dir={ur ? 'rtl' : 'ltr'}
      lang={ur ? 'ur' : 'en'}
      className="min-h-screen w-full flex flex-col lg:flex-row bg-[#F4EFE9] text-[#0B2A2F] overflow-hidden"
    >
      {/* Desktop Left Dark Teal Brand Panel (600px) */}
      <aside
        aria-label="Zyro Retail POS"
        className="hidden lg:flex w-[600px] shrink-0 min-h-screen bg-[#08343A] text-white pt-[40px] px-[44px] pb-[36px] flex-col gap-[22px] overflow-hidden"
      >
        <div className="flex items-center gap-3">
          <span
            role="img"
            aria-label="Zyro"
            className="w-[44px] h-[44px] rounded-[12px] bg-[#E58A4E] text-[#08343A] flex items-center justify-center font-display text-[22px] font-bold shrink-0"
          >
            Z
          </span>
          <span className="font-display text-[20px] font-bold">Zyro Retail POS</span>
        </div>

        <p
          className={`m-0 font-display font-bold max-w-[500px] ${
            ur ? 'text-[30px] leading-[1.6]' : 'text-[34px] leading-[1.2]'
          }`}
        >
          {COPY.w_pitch[li]}
        </p>

        <ul className="m-0 p-0 list-none flex flex-col gap-2.5">
          {[COPY.w_b1[li], COPY.w_b2[li], COPY.w_b3[li]].map((text) => (
            <li key={text} className="flex items-center gap-3 text-[16px] text-[#C9DADB]">
              <span className="w-[26px] h-[26px] shrink-0 rounded-full bg-white/10 text-[#7FD6A4] flex items-center justify-center">
                <Check className="w-[14px] h-[14px] stroke-[3]" />
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ul>

        <figure className="mt-auto mb-0 flex flex-col gap-2.5">
          <MiniatureOwnerHomePreview shopName="Stride Footwear" />
          <figcaption className="text-[14px] text-[#A8C3C5]">{COPY.w_cap[li]}</figcaption>
        </figure>
      </aside>

      {/* Mobile / Tablet Top Brand Strip */}
      <div className="lg:hidden shrink-0 bg-[#08343A] text-white px-4 pt-5 pb-[18px] flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <span
            role="img"
            aria-label="Zyro"
            className="w-9 h-9 rounded-[10px] bg-[#E58A4E] text-[#08343A] flex items-center justify-center font-display text-[18px] font-bold"
          >
            Z
          </span>
          <span className="font-display text-[17px] font-bold">Zyro Retail POS</span>
        </div>
        <p className="m-0 font-display text-[22px] font-bold leading-[1.25]">{COPY.w_pitch[li]}</p>
      </div>

      {/* Right Content */}
      <main className="flex-1 min-w-0 flex flex-col overflow-y-auto px-4 lg:px-[56px] pt-[18px] lg:pt-[44px] pb-6">
        <div className="max-w-[620px] w-full flex flex-col gap-[18px] my-0 lg:my-auto">
          <div className="flex justify-end">
            <div
              role="group"
              aria-label="Language"
              className="inline-flex gap-0.5 p-[3px] rounded-[12px] bg-[#EAE3D9]"
            >
              {LANG_OPTIONS.map((opt) => {
                const on = lang === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    aria-pressed={on}
                    lang={opt.isUrdu ? 'ur' : 'en'}
                    onClick={() => setLanguage(opt.id)}
                    className={`h-[40px] px-[14px] border-0 rounded-[9px] font-semibold transition-all ${
                      opt.isUrdu ? 'text-[17px]' : 'text-[15px]'
                    } ${
                      on
                        ? 'bg-white text-[#0B2A2F] shadow-[0_1px_2px_rgba(15,31,25,.08)]'
                        : 'bg-transparent text-[#3D5357] hover:text-[#0B2A2F]'
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <h1 className="m-0 font-display text-[26px] lg:text-[30px] font-bold leading-[1.2] text-[#0B2A2F]">
              {COPY.w_title[li]}
            </h1>
            <p className="m-0 text-[16px] leading-[1.5] text-[#3D5357]">{COPY.w_sub[li]}</p>
          </div>

          <div role="list" className="flex flex-col gap-3">
            {choices.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.href} role="listitem">
                  <Link
                    href={c.href}
                    className={`w-full min-h-[84px] lg:min-h-[96px] flex items-center gap-4 py-[14px] px-[18px] rounded-[16px] text-start transition-all ${
                      c.primary
                        ? 'bk bg-[#08343A] text-white border-0'
                        : 'bg-white text-[#0B2A2F] border border-[#E7E0D7] hover:border-[#E2B48F]'
                    }`}
                  >
                    <span
                      className={`w-[48px] h-[48px] shrink-0 rounded-full flex items-center justify-center ${
                        c.primary ? 'bg-white/12 text-white' : 'bg-[#F1EBE3] text-[#08343A]'
                      }`}
                    >
                      <Icon className="w-[22px] h-[22px]" />
                    </span>
                    <span className="flex-1 min-w-0 flex flex-col gap-[3px]">
                      <span className="text-[18px] font-bold leading-[1.2]">{c.title}</span>
                      <span
                        className={`text-[14px] leading-[1.5] ${
                          c.primary ? 'text-[#C9DADB]' : 'text-[#52666A]'
                        }`}
                      >
                        {c.sub}
                      </span>
                    </span>
                    <ChevronRight className="w-5 h-5 shrink-0 rtl:rotate-180" />
                  </Link>
                </div>
              );
            })}
          </div>

          <p className="m-0 text-[14px] leading-[1.5] text-[#52666A]">{COPY.help[li]}</p>
        </div>
      </main>
    </div>
  );
}
