import * as React from 'react'
import { Navbar } from '~/components/NavBar'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Navbar />
      {children}
    </>
  )
}
