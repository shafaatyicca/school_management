"use client";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import {
  createTheme,
  ThemeProvider as MUIThemeProvider,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useMemo, useEffect, useState } from "react";

export function MyThemeProvider({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Hydration mismatch se bachne ke liye
  useEffect(() => setMounted(true), []);

  const muiTheme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: resolvedTheme === "dark" ? "dark" : "light",
        },
      }),
    [resolvedTheme],
  );

  if (!mounted) return <div style={{ visibility: "hidden" }}>{children}</div>;

  return (
    <MUIThemeProvider theme={muiTheme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}

// Ye wrapper zaroori hay taake useTheme() kaam kar sakay
export function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      <MyThemeProvider>{children}</MyThemeProvider>
    </NextThemesProvider>
  );
}
