'use client'

import { useState, useEffect } from 'react'
import { Sparkles, ArrowLeft, Send, MapPin, Star } from 'lucide-react'
import Link from 'next/link'

const SUGGESTIONS = [
  "我剛失戀，想一個人暴吃炸雞",
  "今天是領薪日，想吃頓好的慶祝一下",
  "我有 300 元，想吃健康的低卡餐",
  "朋友從國外回來，想吃道地的台灣菜",
  "適合帶筆電工作安靜的咖啡廳"
]

export default function SmartSearch() {
  const [query, setQuery] = useState('')
  const [coords, setCoords] = useState(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("定位失敗", err)
      )
    }
  }, [])

  const handleSearch = async () => {
    if (!query.trim()) return
    if (!coords) return alert("請先允許定位！")

    // 從 LocalStorage 抓 Key (可能是使用者的 Key，也可能是密語)
    const googleApiKey = localStorage.getItem('googleMapsKey')
    const geminiApiKey = localStorage.getItem('geminiKey')

    if (!googleApiKey || !geminiApiKey) {
      return alert("請先回到首頁設定 API Key！")
    }

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await fetch('/api/smart-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          lat: coords.lat,
          lng: coords.lng,
          googleApiKey, // 傳送 Key
          geminiApiKey
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "搜尋失敗")
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ... (其餘 UI 保持不變) ...
  // 為了確保程式碼完整，請保留原本的 return 區塊，或是如果需要我再貼一次完整的也可以
  // 這裡直接貼上完整的 return，避免您困惑
  return (
    <main className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-6 font-sans">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 text-gray-600 transition-colors">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex items-center gap-1 text-purple-600 font-bold bg-white px-3 py-1 rounded-full shadow-sm">
            <Sparkles size={16} />
            AI 許願池
          </div>
          <div className="w-10"></div>
        </div>

        <div className="text-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-3xl font-black text-gray-800 mb-2">說出你的願望</h1>
          <p className="text-gray-500 text-sm">心情、情境、人數... 隨便你說，<br/>AI 會試著聽懂你的胃。</p>
        </div>

        <div className="bg-white p-2 rounded-[2rem] shadow-xl border border-purple-100 mb-6 transition-all focus-within:ring-2 focus-within:ring-purple-200">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="例如：我現在很餓但不想花太多錢，想吃辣的..."
            className="w-full h-32 p-4 rounded-3xl bg-gray-50 focus:bg-white outline-none resize-none text-gray-700 text-lg placeholder:text-gray-400 transition-colors"
          />
          <div className="flex justify-between items-center px-2 mt-2">
            <span className="text-xs text-gray-400 px-2">{query.length > 0 ? `${query.length} 字` : 'AI 準備就緒'}</span>
            <button
              onClick={handleSearch}
              disabled={loading || !query}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold text-white transition-all ${loading || !query ? 'bg-gray-300 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700 hover:shadow-lg active:scale-95'}`}
            >
              {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Send size={16} />送出</>}
            </button>
          </div>
        </div>

        {!result && !loading && (
          <div className="space-y-3">
            <p className="text-xs text-gray-400 font-bold ml-2">或是試試看...</p>
            {SUGGESTIONS.map((text) => (
              <button key={text} onClick={() => setQuery(text)} className="w-full text-left p-4 bg-white rounded-2xl text-gray-600 text-sm hover:bg-purple-50 hover:text-purple-700 transition-colors shadow-sm border border-transparent hover:border-purple-100 active:scale-[0.98]">"{text}"</button>
            ))}
          </div>
        )}

        {error && <div className="bg-red-50 text-red-500 p-4 rounded-2xl text-center text-sm font-bold border border-red-100 animate-pulse">😢 {error}</div>}

        {result && (
          <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-50 duration-500 border border-gray-100 mb-10">
            <div className="bg-purple-600 p-6 text-white text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
              <h2 className="text-2xl font-black relative z-10 leading-tight">{result.name}</h2>
              <div className="flex justify-center items-center gap-2 mt-2 opacity-90 relative z-10 text-sm">
                <div className="flex items-center bg-white/20 px-2 py-0.5 rounded-lg"><Star fill="white" size={14} className="mr-1"/> {result.rating}</div>
                <span>•</span>
                {result.user_ratings_total} 則評論
              </div>
            </div>
            <div className="p-6">
              <div className="bg-purple-50 p-4 rounded-xl border border-purple-100 mb-4">
                <div className="flex items-center gap-2 text-purple-700 font-bold text-sm mb-2"><Sparkles size={16} /> AI 為什麼推薦這家？</div>
                <p className="text-gray-700 text-sm leading-relaxed text-justify">{result.ai_reason}</p>
              </div>
              <div className="flex items-start gap-2 text-gray-500 text-xs mb-6 bg-gray-50 p-3 rounded-lg">
                <MapPin size={14} className="mt-0.5 shrink-0" /><span className="break-all">{result.address}</span>
              </div>
              <a href={result.google_maps_url} target="_blank" className="block w-full bg-gray-900 text-white text-center font-bold py-4 rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200 active:scale-[0.98]">前往 Google Maps</a>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}