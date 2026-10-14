import { notFound } from 'next/navigation';
import { DISTRICT_ROUTE_IDS, getDistrict } from '@/data/districts';
import DistrictPanel from '@/components/panem/DistrictPanel';

export const dynamicParams = false;

export function generateStaticParams() {
  return DISTRICT_ROUTE_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const district = getDistrict(id);
  if (!district || district.id === 'c') return {};
  return { title: `${district.name} · ${district.industry}`, description: district.quote };
}

export default async function DistrictPage({ params }) {
  const { id } = await params;
  const district = getDistrict(id);
  if (!district || district.id === 'c') notFound();
  return <DistrictPanel district={district} />;
}
