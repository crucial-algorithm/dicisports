import React from 'react'
import { Form } from '@remix-run/react'
import { FormProps } from '@remix-run/react/components'

type Props = FormProps & React.RefAttributes<HTMLFormElement>

const UploadForm: React.FC<Props> = (props: Props) => {
  return (
    <Form method="post" encType="multipart/form-data" {...props}>
      {props.children}
    </Form>
  )
}

export default UploadForm
