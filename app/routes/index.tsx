import * as React from 'react'
import type { MetaFunction } from 'remix'
import Typography from '@mui/material/Typography'
import ComboBox from '~/ui/ComboBox'
import DataTable from '~/ui/DataTable'
import Valuation from '~/ui/Valuation'
import DiscreteSlider from '~/ui/DiscreteSlider'
import { Link } from 'remix'

export const meta: MetaFunction = () => {
  return {
    title: 'Remix Starter',
    description: 'Welcome to remix!'
  }
}

export default function Index() {
  return (
    <React.Fragment>
      <Typography variant="h4" component="h1" gutterBottom>
        Remix with TypeScript example
      </Typography>
      <Link to="/organizer">Organizer</Link>
      <ComboBox />
      <DataTable />
      <Valuation />
      <DiscreteSlider />
      <Typography variant="h5" component="h2">
        Something Something
      </Typography>
    </React.Fragment>
  )
}
