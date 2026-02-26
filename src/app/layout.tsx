import { ThemeWrapper } from "@/components/siteTheme/ThemeProvider";
import AuthProvider from "@/components/AuthProvider"; // Naya import
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          <ThemeWrapper>{children}</ThemeWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
