import { RegisterFlow } from '@/features/auth/RegisterFlow';

export default function VerifyPhonePage() {
  return <RegisterFlow initialStep="code" />;
}
