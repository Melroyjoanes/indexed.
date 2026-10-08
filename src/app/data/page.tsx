import type { Metadata } from "next";
import { DataPage } from "@/components/data-page/data-page";

export const metadata: Metadata = { title: "Data" };

export default function DataRoute() {
  return <DataPage />;
}
