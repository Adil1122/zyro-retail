import { ItemEditorForm } from '@/features/inventory/ItemEditorForm';

export default async function EditItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ItemEditorForm itemId={id} />;
}
