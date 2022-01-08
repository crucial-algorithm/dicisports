import * as React from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div role="main" className="sm:mx-6 lg:mx-8">
      {children}
    </div>
  )
}
