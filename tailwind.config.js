const defaultTheme = require('tailwindcss/defaultTheme')
const colors = require('tailwindcss/colors')

module.exports = {
  content: ['./app/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    screens: {
      md: '640px',
      lg: '1024px',
      xl: '1500px' // this is the "design resolution"
    },
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
      orange: {
        DEFAULT: '#FF5C00',
        50: '#FFD1B8',
        100: '#FFC4A3',
        200: '#FFAA7A',
        300: '#FF9052',
        400: '#FF7629',
        500: '#FF5C00',
        600: '#C74800',
        700: '#8F3400',
        800: '#571F00',
        900: '#1F0B00'
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
      },
      team: {
        unknown: 'var(--color-team-unknown)',
        current: 'var(--color-team-current)',
        yellow: 'var(--color-team-yellow)',
        blue: 'var(--color-team-blue)',
        red: 'var(--color-team-red)'
      },
      yellow: {
        500: 'var(--color-yellow-500)'
      },
      blue: {
        100: 'var(--color-blue-100)',
        500: 'var(--color-blue-500)'
      },
      red: {
        500: 'var(--color-red-500)'
      },
      green: {
        100: 'var(--color-green-100)',
        500: 'var(--color-green-500)',
        600: 'var(--color-green-600)'
      }
    },
    extend: {
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans]
      },
      boxShadow: {
        focus: '0 0 0 0.2rem rgb(0 0 0 / 0.05)'
      },
      spacing: {
        '5vw': '5vw', // pull featured sections and navbar in the margin
        '8vw': '8vw', // positions hero img inside the margin
        '10vw': '10vw', // page margin
        80: '20rem',
        112: '28rem',
        120: '30rem',
        144: '36rem',
        160: '40rem'
      }
    }
  },
  variants: {},
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/aspect-ratio')
  ]
}
