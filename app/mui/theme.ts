import { createTheme } from '@mui/material/styles'
import { blue, red } from '@mui/material/colors'
import type {} from '@mui/lab/themeAugmentation'

// Create a theme instance.
const theme = createTheme({
  components: {
    MuiTimeline: {
      styleOverrides: {
        root: {
          backgroundColor: 'red'
        }
      }
    }
  },
  palette: {
    primary: {
      main: blue.A400
    },
    secondary: {
      main: '#19857b'
    },
    error: {
      main: red.A400
    }
  },
  spacing: 8,
  shape: {
//    borderRadius: undefined
  }
})

export default theme
