import './globals.css'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: '食神 AI - 今天吃什麼？',
  description: '不知道吃什麼？讓 AI 幫你做決定！支援智能推薦與許願池功能。',
  // 加入這段設定圖示 (稍後我們會建立這個檔案)
  icons: {
    icon: '/icon',
    apple: '/icon',
  },
  // 手機全螢幕設定
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1',
  appleWebApp: {
    title: '食神 AI',
    statusBarStyle: 'default',
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body className={inter.className}>{children}</body>
    </html>
  )
}