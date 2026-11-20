import { redirect } from 'next/navigation';
import { isNavModuleEnabled } from '@/constants/navigation';

export default function HomePage() {
  redirect(isNavModuleEnabled('home') ? '/dashboard' : '/inventory');
}
