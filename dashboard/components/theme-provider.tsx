"use client"

import * as React from "react"

interface ThemeContextType {
  theme: string
  setTheme: (theme: string) => void
  resolvedTheme: "light" | "dark"
}

const ThemeContext = React.createContext<ThemeContextType>({
  theme: "system",
  setTheme: () => {},
  resolvedTheme: "light",
})

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "theme",
}: {
  children: React.ReactNode
  defaultTheme?: string
  storageKey?: string
  attribute?: string
  enableSystem?: boolean
  disableTransitionOnChange?: boolean
}) {
  const [theme, setThemeState] = React.useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        return localStorage.getItem(storageKey) || defaultTheme
      } catch {
        return defaultTheme
      }
    }
    return defaultTheme
  })

  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(storageKey) || defaultTheme
        if (stored === "dark") return "dark"
        if (stored === "light") return "light"
        return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
      } catch {
        return "light"
      }
    }
    return "light"
  })

  // تطبيق فئة المظهر الداكن/الفاتح على وسم html دون إدراج أي وسوم script في شجرة المكونات
  React.useEffect(() => {
    const root = document.documentElement

    const getSystemTheme = () =>
      window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"

    const currentResolved =
      theme === "system" ? getSystemTheme() : theme === "dark" ? "dark" : "light"
    setResolvedTheme(currentResolved)

    if (currentResolved === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const handleChange = () => {
        const newSys = mediaQuery.matches ? "dark" : "light"
        setResolvedTheme(newSys)
        if (newSys === "dark") {
          root.classList.add("dark")
        } else {
          root.classList.remove("dark")
        }
      }
      mediaQuery.addEventListener("change", handleChange)
      return () => mediaQuery.removeEventListener("change", handleChange)
    }
  }, [theme])

  const setTheme = React.useCallback(
    (newTheme: string) => {
      setThemeState(newTheme)
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch {
        // Ignore
      }
    },
    [storageKey]
  )

  const value = React.useMemo(
    () => ({ theme, setTheme, resolvedTheme }),
    [theme, setTheme, resolvedTheme]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  return React.useContext(ThemeContext)
}