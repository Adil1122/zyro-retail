'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Building2, ChevronRight, MapPin, ShieldCheck } from 'lucide-react';
import { AuthFlowShell } from '@/features/auth/AuthFlowShell';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useZyro } from '@/hooks/useZyro';

export default function SelectWorkspacePage() {
  const router = useRouter();
  const auth = useAuth();
  const { notify } = useZyro();

  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const activeMemberships = auth.session.memberships.filter(
    (m) => m.memberStatus === 'active' && m.businessStatus === 'active',
  );

  const activeChoice =
    activeMemberships.find((m) => m.businessId === selectedBusinessId) || activeMemberships[0] || null;

  const handleOpenWorkspace = async () => {
    if (!activeChoice) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      const targetBranch =
        selectedBranchId && activeChoice.branches.some((b) => b.id === selectedBranchId)
          ? selectedBranchId
          : activeChoice.defaultBranchId || activeChoice.branches[0]?.id;

      const redirectTo = await auth.selectWorkspace(activeChoice.businessId, targetBranch);
      notify(`Opened ${activeChoice.businessName}`, 'ok');
      router.push(typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/inventory');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unable to switch workspace.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFlowShell
      railTitle="Choose workspace"
      railSub={auth.session.user?.fullName || 'Your Zyro account'}
      railNote="Your mobile number is linked to multiple businesses. Pick the shop and branch you want to work in."
      railAltLabel="Sign out"
      onRailAltClick={async () => {
        await auth.signOut();
        router.push('/welcome');
      }}
      helpText="You can switch businesses any time from the account menu in the sidebar."
      title="Select your business"
      subtitle="Choose which shop and branch to open right now."
      maxWidth={660}
      hasFooter
      hasBack={false}
      why={!activeChoice ? 'No active business workspace found for your account' : ''}
      nextLabel={busy ? 'Opening…' : 'Open workspace'}
      onNext={() => void handleOpenWorkspace()}
      nextDisabled={!activeChoice}
      nextBusy={busy}
    >
      {errorMsg && (
        <div
          role="alert"
          className="flex gap-2.5 py-3 px-3.5 rounded-[12px] bg-[#FDF0EF] text-[#B42318] text-[14px]"
        >
          <AlertTriangle className="w-[18px] h-[18px] shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {auth.loading ? (
        <div className="rounded-[16px] bg-white border border-[#E7E0D7] p-5 text-[15px] text-[#3D5357]">
          Loading your businesses…
        </div>
      ) : activeMemberships.length === 0 ? (
        <div className="rounded-[16px] bg-white border border-[#E7E0D7] p-5 text-[15px] text-[#3D5357]">
          No active businesses are currently assigned to your account.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {activeMemberships.map((m) => {
            const selected = activeChoice?.businessId === m.businessId;
            return (
              <div
                key={m.memberId}
                className="rounded-[16px] p-4 transition-colors"
                style={{
                  border: selected ? '2px solid #C9682E' : '1px solid #E7E0D7',
                  backgroundColor: selected ? '#FCEFE4' : '#FFFFFF',
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBusinessId(m.businessId);
                    setSelectedBranchId(m.defaultBranchId || m.branches[0]?.id || '');
                  }}
                  className="w-full flex items-center gap-3.5 text-start"
                >
                  <span className="w-12 h-12 rounded-[12px] bg-[#08343A] text-[#E58A4E] flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[17px] font-bold text-[#0B2A2F] truncate">{m.businessName}</div>
                    <div className="text-[13px] text-[#52666A] flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 font-semibold text-[#08343A]">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {m.roleDisplayName}
                      </span>
                      <span>· {m.branches.length} {m.branches.length === 1 ? 'branch' : 'branches'}</span>
                      <span>· {m.currency}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-[#52666A] shrink-0" />
                </button>

                {selected && m.branches.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-[#E2B48F]/60 flex flex-col gap-1.5">
                    <span className="text-[12px] font-semibold uppercase tracking-wider text-[#52666A]">
                      Select branch
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {m.branches.map((b) => {
                        const branchSelected = (selectedBranchId || m.defaultBranchId) === b.id;
                        return (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setSelectedBranchId(b.id)}
                            className={`h-[38px] px-3 rounded-[10px] text-[13px] font-semibold inline-flex items-center gap-1.5 ${
                              branchSelected
                                ? 'bg-[#08343A] text-white'
                                : 'bg-white border border-[#D6CDC1] text-[#0B2A2F]'
                            }`}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>{b.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </AuthFlowShell>
  );
}
