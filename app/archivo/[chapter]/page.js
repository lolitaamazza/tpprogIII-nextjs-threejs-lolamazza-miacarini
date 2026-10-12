import { notFound } from 'next/navigation';
import Experience from '@/components/Experience';
import { chapters } from '@/data/chapters';

export function generateStaticParams() {
  return [...chapters.map(({ id }) => ({ chapter: id })), { chapter: 'final' }];
}
export async function generateMetadata({ params }) {
  const { chapter } = await params;
  const entry = chapters.find((item) => item.id === chapter);
  if (chapter === 'final') return { title: 'La última transmisión' };
  return entry ? { title: entry.label, description: entry.copy } : {};
}
export default async function ChapterPage({ params }) {
  const { chapter } = await params;
  if (chapter !== 'final' && !chapters.some((item) => item.id === chapter)) notFound();
  return <Experience key={chapter} initialChapterId={chapter} />;
}
