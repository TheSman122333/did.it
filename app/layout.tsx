import type { Metadata } from "next";
import { Comfortaa } from "next/font/google";
import NavBar from "@/components/NavBar";
import OnboardingModal from "@/components/OnboardingModal";
import AnonBootstrap from "@/components/AnonBootstrap";
import "./globals.css";

const comfortaa = Comfortaa({
  variable: "--font-comfortaa",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "did.it",
  description: "Do small challenges. Build confidence.",
  icons: {
    icon: "/icon.svg",
    apple: "/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "did.it",
  },
};

export const viewport = {
  themeColor: "#f7f4ea",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${comfortaa.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <NavBar />
        <OnboardingModal />
        <AnonBootstrap />
      </body>
    </html>
  );
}
