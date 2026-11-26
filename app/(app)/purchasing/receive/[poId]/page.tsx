import { ReceiveGoodsFlow } from '@/features/purchasing/ReceiveGoodsFlow';

export default async function ReceivePoPage({
  params,
}: {
  params: Promise<{ poId: string }>;
}) {
  const { poId } = await params;
  return <ReceiveGoodsFlow poNo={poId} />;
}
