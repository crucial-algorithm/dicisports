import React from 'react'
import FormField from '~/components/shared/form/FormField'
import TextField from '~/components/shared/form/TextField'
import { MemberProfile } from '~/types'

type Props = {
  profile?: MemberProfile
  error?: string | null
  labelName: string
  labelEmail: string
} & React.ComponentProps<'input'>
const ProfileFragment: React.FC<Props> = ({
  labelName,
  labelEmail,
  profile,
  error
}) => {
  return (
    <>
      <FormField label={labelName} error={error}>
        <TextField name="name" defaultValue={profile?.name} />
      </FormField>
      <FormField label={labelEmail}>
        <TextField name="email" defaultValue={profile?.email} disabled />
      </FormField>
    </>
  )
}

export default ProfileFragment
