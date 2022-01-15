import React, { useState } from 'react'
import { Form } from '@remix-run/react'
import FormField from '~/components/shared/form/FormField'
import TextField from '~/components/shared/form/TextField'
import Button from '~/components/shared/Button'
import { MemberProfile } from '~/types'
import { useTranslation } from 'react-i18next'

type Props = {
  postUrl: string
  profile?: MemberProfile
} & React.ComponentProps<'input'>
const Profile: React.FC<Props> = ({ postUrl, profile }) => {
  const { t } = useTranslation('profile')
  const [action, setAction] = useState<string>('submit')
  return (
    <div className="flex flex-col justify-center items-center">
      <Form method="post" className="w-96" action={postUrl}>
        <FormField>
          <TextField name="name" label="Name" defaultValue={profile?.name} />
        </FormField>
        <FormField>
          <TextField
            name="email"
            label={t('Email')}
            defaultValue={profile?.email}
            readOnly
          />
        </FormField>
        <FormField className="flex justify-end">
          <Button
            className="mr-2"
            secondary={true}
            onClick={() => setAction('cancel')}
          >
            {t('Cancel')}
          </Button>
          <Button>{t('Create Profile')}</Button>
        </FormField>
        <input type="hidden" name="actionId" value={action} />
      </Form>
    </div>
  )
}

export default Profile
