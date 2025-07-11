import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Next Rounds AI - AI-Powered Interview Question Generator | Land Your Dream Job",
  description: "Generate personalized interview questions with AI. Upload your resume, paste the job description, and get 15-20 tailored questions with answers. Free to start, used by thousands of job seekers.",
  keywords: "interview questions, AI interview prep, job interview preparation, resume analysis, interview practice, AI career coach, interview questions generator, job search, career preparation, interview tips",
  authors: [{ name: "Next Rounds AI" }],
  creator: "Next Rounds AI",
  publisher: "Next Rounds AI",
  robots: "index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1",
  viewport: "width=device-width, initial-scale=1",
  alternates: {
    canonical: "https://nextrounds.ai"
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nextrounds.ai",
    title: "Next Rounds AI - AI-Powered Interview Question Generator",
    description: "Generate personalized interview questions with AI. Upload your resume, paste the job description, and get tailored questions for your next interview.",
    siteName: "Next Rounds AI",
    images: [
      {
        url: "https://nextrounds.ai/logo-horizontal.svg",
        width: 240,
        height: 64,
        alt: "Next Rounds AI - AI-Powered Interview Question Generator"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    site: "@nextroundsai",
    creator: "@nextroundsai", 
    title: "Next Rounds AI - AI-Powered Interview Question Generator",
    description: "Generate personalized interview questions with AI. Free to start, used by thousands of job seekers.",
    images: ["https://nextrounds.ai/logo-horizontal.svg"]
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    apple: [
      { url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" }
    ]
  },
  manifest: "/manifest.json"
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
