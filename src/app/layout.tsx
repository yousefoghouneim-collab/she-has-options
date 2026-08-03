import type { Metadata, Viewport } from "next";
import { Archivo, Abril_Fatface } from "next/font/google";
import "./globals.css";
import Nav from "@/components/Nav";
import AmbientBackground from "@/components/AmbientBackground";
import AuthProvider from "@/components/AuthProvider";

const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
});

const abrilFatface = Abril_Fatface({
  variable: "--font-display",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "She Has Options",
  description: "Your wardrobe, catalogued and mixed by AI.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${abrilFatface.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AmbientBackground />
        <AuthProvider>
          <Nav />
          <main className="flex-1">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
