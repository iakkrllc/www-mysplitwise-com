import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/landing-page";

export const metadata: Metadata = {
  title: "MYSplitz — Less stress when sharing expenses",
  description:
    "MYSplitz makes it easy to split bills with friends and family. Track balances, organize group expenses, split in any currency, and settle up.",
};

export default function Home() {
  return <LandingPage />;
}
