import AuthProvider from "@/app/AuthProvider";
import { ThemeWrapper } from "@/components/siteTheme/ThemeProvider";
import "./globals.css";
import { Toaster } from "sonner";

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
        <Toaster
          position="top-center"
          richColors
          duration={4000}
          toastOptions={{
            style: {
              // Agar dark mode issues hon to yahan manually colors de sakte hain
              // otherwise globals.css handle kar lega
            },
            className: "my-custom-toast",
          }}
        />
      </body>
    </html>
  );
}
