import React from "react"
import type { Metadata, Viewport } from "next"
import { DM_Sans, Playfair_Display } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { CartProvider } from "@/components/cart-context"
import { site } from "@/lib/site"
import "./globals.css"

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["300", "400", "500", "600"]
})

const playfairDisplay = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  weight: ["400", "500", "600", "700"]
})

export const metadata: Metadata = {
  title: `${site.name} | ${site.tagline}`,
  description: site.description,
  generator: "v0.app",
  keywords: ["influencer", "content", "creative studio", "brand", "proposal"]
}

export const viewport: Viewport = {
  themeColor: "#F6F7FB"
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body
        className={`${dmSans.variable} ${playfairDisplay.variable} font-sans antialiased`}
      >
        <CartProvider>{children}</CartProvider>
        <Analytics />
      </body>
    </html>
  )
}
