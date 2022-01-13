import * as React from 'react'

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div role="main" className="container mx-auto max-w-6xl pt-8">
      {children}
    </div>
  )
}
