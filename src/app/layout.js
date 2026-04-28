import './globals.css'
import SessionWrapper from '@/components/SessionWrapper'

export const metadata = { title: 'NeuroFlip AI' }

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <SessionWrapper>{children}</SessionWrapper>
      </body>
    </html>
  )
}