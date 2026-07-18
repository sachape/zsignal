import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["Instrument Sans", "DM Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
        display: ["Instrument Sans", "DM Sans", "system-ui", "sans-serif"],
        brand: ["Boogaloo", "system-ui", "sans-serif"],
        // ElevenLabs marketing site: editorial light serif display + Inter body.
        "el-display": ["Fraunces", "Georgia", "Times New Roman", "serif"],
        "el-sans": ["Inter", "system-ui", "sans-serif"],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        // Lime brand used as TEXT/icon color. Same vivid lime in dark, but a
        // darkened readable green in light (lime text on light is illegible).
        // Use text-primary-strong wherever the brand color is the foreground.
        "primary-strong": "hsl(var(--primary-strong))",
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        twitch: {
          DEFAULT: "hsl(var(--twitch))",
          foreground: "hsl(var(--twitch-foreground))",
        },
        // Couleurs de plateformes — remplacent les hex en dur (audit E-04).
        // `twitch` reste dispo ci-dessus (rétrocompat) ; `platform.twitch` le
        // double pour la cohérence des nouveaux usages.
        platform: {
          twitch: "hsl(var(--platform-twitch))",
          youtube: "hsl(var(--platform-youtube))",
          instagram: "hsl(var(--platform-instagram))",
          tiktok: "hsl(var(--platform-tiktok))",
          x: "hsl(var(--platform-x))",
        },
        // Palette data-viz catégorielle — remplace les hex en dur de chart.tsx.
        data: {
          1: "hsl(var(--data-1))",
          2: "hsl(var(--data-2))",
          3: "hsl(var(--data-3))",
          4: "hsl(var(--data-4))",
          5: "hsl(var(--data-5))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // ── ElevenLabs marketing palette (scoped to the public site only;
        //    fixed hex, independent of the product's dark/lime tokens) ──────
        el: {
          canvas: "#f5f5f5",
          "canvas-soft": "#fafafa",
          ink: "#0c0a09",
          "ink-soft": "#292524",
          body: "#4e4e4e",
          muted: "#777169",
          "muted-soft": "#a8a29e",
          card: "#ffffff",
          strong: "#f0efed",
          hairline: "#e7e5e4",
          "hairline-strong": "#d6d3d1",
          dark: "#0c0a09",
          "dark-elevated": "#1c1917",
          "on-dark": "#ffffff",
          "on-dark-soft": "#a8a29e",
          mint: "#a7e5d3",
          peach: "#f4c5a8",
          lavender: "#c8b8e0",
          sky: "#a8c8e8",
          rose: "#e8b8c4",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "el-float": {
          "0%": { transform: "translate3d(0,0,0) scale(1)" },
          "100%": { transform: "translate3d(0,-26px,0) scale(1.07)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-up": "fade-up 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
        "el-float": "el-float 16s ease-in-out infinite alternate",
        "el-float-slow": "el-float 26s ease-in-out infinite alternate",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
