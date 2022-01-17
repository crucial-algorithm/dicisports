import React from 'react'
import FormField from '~/components/shared/form/FormField'
import TextField from '~/components/shared/form/TextField'
import { MemberProfile } from '~/types'
import { useTranslation } from 'react-i18next'

type Props = {
  profile?: MemberProfile
  error?: string | null
} & React.ComponentProps<'input'>
const ProfileFragment: React.FC<Props> = ({ profile, error }) => {
  const { t } = useTranslation('profile')
  return (
    <>
      <FormField label={t('Name')} error={error}>
        <TextField name="name" defaultValue={profile?.name} />
      </FormField>
      <FormField label={t('Email')}>
        <TextField name="email" defaultValue={profile?.email} disabled />
      </FormField>
    </>
  )
}

export default ProfileFragment
