import { notFound } from 'next/navigation';
import { LOCATION_IDS } from '@/lib/routes';
import { getDistrict } from '@/data/districts';
import LocationExperience from '@/components/panem/LocationExperience';

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCATION_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const district = getDistrict(id);
  return district ? { title: `${district.name} · ${district.industry}`, description: district.quote } : {};
}

export default async function LocationPage({ params }) {
  const { id } = await params;
  if (!LOCATION_IDS.includes(id)) notFound();
  return <LocationExperience key={id} id={id} />;
}
