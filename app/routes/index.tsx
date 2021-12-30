import * as React from 'react'
import type { LoaderFunction, MetaFunction } from 'remix'
import Typography from '@mui/material/Typography'
import ComboBox from '~/components/ComboBox'
import DataTable from '~/components/DataTable'
import Valuation from '~/components/Valuation'
import DiscreteSlider from '~/components/DiscreteSlider'
import { json, Link } from 'remix'
import i18n from '~/utils/i18n.server' // this is the first file you created
import { useTranslation } from 'react-i18next'

export const meta: MetaFunction = () => {
  return {
    title: 'Remix Starter',
    description: 'Welcome to remix!'
  }
}

export let loader: LoaderFunction = async ({ request }) => {
  return json({
    i18n: await i18n.getTranslations(request, ['common'])
  })
}

export default function Index() {
  let { t } = useTranslation('common')

  return (
    <React.Fragment>
      <Typography variant="h4" component="h1" gutterBottom>
        {t('title')}
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
