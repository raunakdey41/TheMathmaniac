module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#8A2222",     // Warmer, soothing red/maroon
        secondary: "#E8C200",   // Synapse Golden Yellow
        darkbg: "#EDEAE0",      // Synapse Warm Beige/Cream
        accent: "#E8C200",      // Synapse Golden Yellow
        slate: {
          50: '#F5F2EA',        // Card background (alternative / active)
          100: '#15100A',       // Dark Charcoal for Headings
          200: '#15100A',       // Dark Charcoal
          300: '#15100A',       // Dark Charcoal
          400: '#342C1C',       // Dark Brown for Body Text
          500: '#6A6050',       // Muted Gray-Brown Text
          600: '#6A6050',
          700: 'rgba(160, 140, 85, 0.32)', // Card border
          800: 'rgba(160, 140, 85, 0.26)', // General border
          900: '#F5F2EA',       // Card / Section background
          950: '#EDEAE0',       // Page background
        },
        blue: {
          50: '#FFF5F5',
          100: '#FEE2E2',
          200: '#FECACA',
          300: '#FCA5A5',
          400: '#8B1E1E',
          500: '#8A2222',       // Warmer red
          600: '#8A2222',       // Warmer red
          700: '#701B1B',
          800: '#541414',
          900: '#3B0E0E',
        },
        emerald: {
          50: '#FEFDF0',
          100: '#FDFBE0',
          200: '#FAF4B3',
          300: '#F6EC85',
          400: '#E8C200',       // Golden Yellow
          500: '#E8C200',       // Golden Yellow
          600: '#D4B000',
          700: '#B29400',
          800: '#8F7600',
          900: '#6C5900',
        }
      }
    },
  },
  plugins: [],
}

