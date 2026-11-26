'use client';

import { tr } from '@/constants/i18n';
import { useZyroStore } from '@/services/zyro-store';

export function useZyro() {
  const store = useZyroStore();
  const { session, settings } = store.state;
  const lang = session.language;
  const isRtl = lang === 'ur';

  const t = (key: string) => tr(key, lang);

  return {
    ...store,
    session,
    settings,
    role: session.user.role,
    user: session.user,
    kit: session.kit,
    lang,
    isRtl,
    t,
  };
}
