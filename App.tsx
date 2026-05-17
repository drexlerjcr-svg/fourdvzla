@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-display: "Space+Grotesk", "Inter", sans-serif;
  
  --color-brand-blue: #003a8c; /* Blue from logo */
  --color-brand-gray: #475569;
  --color-brand-accent: #ff4500; /* Vibrant Orange-Red from logo */
  --color-brand-yellow: #fbbf24;
}

.liquid-glass {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(12px) saturate(180%);
  -webkit-backdrop-filter: blur(12px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
}

.liquid-glass-dark {
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.glossy-gradient {
  background: linear-gradient(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 50%, rgba(255,255,255,0.1) 100%);
}

.liquid-shadow {
  box-shadow: 0 20px 50px -12px rgba(0, 58, 140, 0.15);
}

html {
  scroll-behavior: smooth;
}

body {
  background-color: white;
  color: #0f172a;
}

@layer base {
  h1, h2, h3, h4 {
    font-family: var(--font-display);
    font-weight: 700;
  }
}
