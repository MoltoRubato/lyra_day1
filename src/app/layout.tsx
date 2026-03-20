import "lyra_day1_ryan/styles/globals.css";

import { type Metadata } from "next";
import { Geist } from "next/font/google";
import { getServerSession } from "next-auth";

import { AppSessionProvider } from "~/app/_components/auth/AppSessionProvider";
import { authOptions } from "~/server/auth";
import { TRPCReactProvider } from "lyra_day1_ryan/trpc/react";

export const metadata: Metadata = {
  title: "Airtable",
  description: "Airtable-style workspace",
  icons: {
    icon: "/airtable_assets/AirtableLogoPNG.png",
    shortcut: "/airtable_assets/AirtableLogoPNG.png",
    apple: "/airtable_assets/AirtableLogoPNG.png",
  },
};

const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en" className={`${geist.variable}`}>
      <body>
        <AppSessionProvider session={session}>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
