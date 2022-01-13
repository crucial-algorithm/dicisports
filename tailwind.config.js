const defaultTheme = require('tailwindcss/defaultTheme')
const colors = require('tailwindcss/colors')

module.exports = {
  content: ['./app/**/*.{ts,tsx}'],
  theme: {
    colors: {
      ...colors,
      gray: {
        50: '#B0B3BB',
        100: '#f7f7f7',
        200: '#e6e9ee',
        300: '#dde0e4',
        400: '#818890',
        500: '#535661',
        600: '#4b4c53',
        700: '#3a3d4a',
        800: '#2e3039',
        900: '#1f2028'
      },
      'sp-blue': {
        DEFAULT: '#000A3C',
        50: '#0029F4',
        100: '#0025DF',
        200: '#001EB6',
        300: '#00188E',
        400: '#001165',
        500: '#000A3C',
        600: '#000104',
        700: '#000000',
        800: '#000000',
        900: '#000000'
      },
      'sp-light-blue': {
        DEFAULT: '#1475FF',
        50: '#CCE1FF',
        100: '#B7D5FF',
        200: '#8EBDFF',
        300: '#66A5FF',
        400: '#3D8DFF',
        500: '#1475FF',
        600: '#005ADB',
        700: '#0043A3',
        800: '#002C6B',
        900: '#001533'
      }
    },
    extend: {
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans]
      },
      boxShadow: {
        focus: '0 0 0 0.2rem rgb(0 0 0 / 0.05)'
      }
    }
  },
  variants: {},
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ]
}
