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
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
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
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .contentEditableTextbox,
              .light-scrollbar {
                scrollbar-width: thin;
                scrollbar-color: #c1c7d0 transparent;
              }
              .contentEditableTextbox::-webkit-scrollbar,
              .light-scrollbar::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              .contentEditableTextbox::-webkit-scrollbar-button,
              .light-scrollbar::-webkit-scrollbar-button {
                display: none;
                height: 0;
                width: 0;
              }
              .contentEditableTextbox::-webkit-scrollbar-thumb,
              .light-scrollbar::-webkit-scrollbar-thumb {
                background: #c1c7d0;
                border-radius: 3px;
              }
              .contentEditableTextbox::-webkit-scrollbar-track,
              .light-scrollbar::-webkit-scrollbar-track {
                background: transparent;
              }
            `,
          }}
        />
      </head>
      <body>
        <AppSessionProvider session={session}>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </AppSessionProvider>
      </body>
    </html>
  );
}
