import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { MenuProvider } from "@/contexts/MenuContext";
import { MqttProvider } from "@/contexts/MqttContext";
import { MqttServerProvider } from "@/contexts/MqttServerProvider";
import { AppLoadingProvider } from "@/contexts/AppLoadingContext";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "Smartrack IOT Dashboard",
  description: "Smart Rack IoT monitoring and control dashboard",
  icons: {
    icon: "/images/Brand_Smartrack.png",
    shortcut: "/images/Brand_Smartrack.png",
    apple: "/images/Brand_Smartrack.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <AppLoadingProvider>
            <AuthProvider>
              <MenuProvider>
                <MqttProvider>
                  <MqttServerProvider>{children}</MqttServerProvider>
                </MqttProvider>
              </MenuProvider>
            </AuthProvider>
          </AppLoadingProvider>
          <Toaster />
          <SonnerToaster
            position="top-right"
            richColors
            closeButton
            theme="dark"
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
