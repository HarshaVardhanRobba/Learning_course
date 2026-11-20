import { ClerkProvider } from "@clerk/nextjs";
import { shadcn } from "@clerk/ui/themes";
import { Cormorant_Garamond, Geist, Geist_Mono } from "next/font/google"

import "@workspace/ui/globals.css"
import { ThemeProvider } from "@/components/providers/theme-provider"
import { SmoothScrollProvider } from "@/components/providers/smooth-scroll-provider"
import { PublicHeader } from "@/components/layout/public-header"
import { cn } from "@workspace/ui/lib/utils";

const geist = Geist({subsets:['latin'],variable:'--font-sans'})

const fontDisplay = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-serif-display",
})

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, fontDisplay.variable, "font-sans", geist.variable)}
    >
      <body className="bg-cream text-ink dark:bg-[#100c0a] dark:text-cream">
        <ClerkProvider appearance={{ theme: shadcn }}>
          <ThemeProvider>
            <SmoothScrollProvider>
              <PublicHeader />
              {children}
            </SmoothScrollProvider>
          </ThemeProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}