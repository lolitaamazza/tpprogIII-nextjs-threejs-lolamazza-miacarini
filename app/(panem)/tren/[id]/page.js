import { notFound } from 'next/navigation';
import { LOCATION_IDS } from '@/lib/routes';
import { getDistrict } from '@/data/districts';
import TrainTrip from '@/components/panem/TrainTrip';

export const dynamicParams = false;

export function generateStaticParams() {
  return LOCATION_IDS.map((id) => ({ id }));
}

export async function generateMetadata({ params }) {
  const { id } = await params;
  const district = getDistrict(id);
  return district ? { title: `En tren al ${district.name}` } : {};
}

export default async function TrainPage({ params }) {
  const { id } = await params;
  if (!LOCATION_IDS.includes(id)) notFound();
  return <TrainTrip id={id} />;
}
