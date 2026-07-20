import { notFound } from "next/navigation";
import { SectionPlaceholder } from "@/components/dashboard/section-placeholder";
import { DASHBOARD_SECTIONS } from "@/lib/dashboard/sections";

interface SectionPageProps {
  params: Promise<{ section: string }>;
}

export default async function DashboardSectionPage({
  params,
}: SectionPageProps) {
  const { section } = await params;
  const meta = DASHBOARD_SECTIONS[section];

  if (!meta) {
    notFound();
  }

  return <SectionPlaceholder title={meta.title} description={meta.description} />;
}
