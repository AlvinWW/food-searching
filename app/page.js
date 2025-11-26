'use client'

import { useState, useEffect } from 'react'
import { MapPin, Star, Navigation, Bike, Settings, RotateCw, Sparkles, ArrowRight, Footprints, ArrowLeft, Search, Link as LinkIcon, Check, X, Loader2, Lock } from 'lucide-react'
import Link from 'next/link'

const PRICE_RANGES = {
  0: '免費',
  1: '$150 以下 (平價)',
  2: '$150 ~ $400 (一般)',
  3: '$400 ~ $1000 (聚餐)',
  4: '$1000 以上 (奢華)'
}

const CUISINE_PRESETS = ['隨便', '台式', '日式', '泰式', '韓式', '美式', '火鍋', '拉麵', '咖啡']

const LINKS = {
  google: "https://console.cloud.google.com/google/maps-apis/credentials",
  gemini: "https://aistudio.google.com/app/apikey"
}

function FilterButton({ label, active, onClick, icon: Icon, subLabel }) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center gap-2 px-2 py-4 rounded-2xl transition-all duration-300 border-2 w-full
        ${active 
          ? 'bg-orange-500 text-white border-orange-500 shadow-xl scale-[1.02] -translate-y-1' 
          : 'bg-white text-gray-600 border-gray-100 hover:border-orange-200 hover:bg-orange-50 hover:-translate-y-0.5 shadow-sm'}
      `}
    >
      {Icon && <Icon size={24} className={active ? 'text-white' : 'text-orange-500'} />}
      <span className="font-bold text-lg">{label}</span>
      {subLabel && <span className={`text-xs ${active ? 'text-orange-100' : 'text-gray-400'}`}>{subLabel}</span>}
      
      {active && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-white rounded-full animate-pulse" />
      )}
    </button>
  )
}

const LOADING_TEXTS = [
  "AI 正在讀取 Google 評論...",
  "正在分析 CP 值...",
  "正在過濾廣告業配文...",
  "正在尋找真正好吃的店...",
  "客觀數據分析中..."
]

export default function Home() {
  const [coords, setCoords] = useState(null)
  const [locationName, setLocationName] = useState(null)
  const [locLoading, setLocLoading] = useState(true)
  const [locError, setLocError] = useState(false)
  
  const [radius, setRadius] = useState(1000)
  const [cuisine, setCuisine] = useState('隨便')
  const [budget, setBudget] = useState('2')
  const [time, setTime] = useState('now')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState(LOADING_TEXTS[0])

  // 設定與 API Key 狀態
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeys, setApiKeys] = useState({ google: '', gemini: '' })
  const [connStatus, setConnStatus] = useState({ google: null, gemini: null })

  const isApiReady = connStatus.google === 'success' && connStatus.gemini === 'success'

  // 定義 fetchLocationName (移到 useEffect 之前)
  const fetchLocationName = async (lat, lng, key) => {
    if (!key) return
    try {
      const res = await fetch('/api/geocode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng, apiKey: key })
      })
      const data = await res.json()
      // 只需要檢查是否有有效的 locationName
      if (data.locationName && data.locationName !== '定位成功') {
        setLocationName(data.locationName)
      } else {
        setLocationName("定位成功")
      }
    } catch (e) {
      console.error("無法取得區名", e)
      setLocationName("定位成功") // 預設值
    }
  }

  // 1. 載入 LocalStorage
  useEffect(() => {
    const savedGoogle = localStorage.getItem('googleMapsKey')
    const savedGemini = localStorage.getItem('geminiKey')
    
    if (savedGoogle || savedGemini) {
      setApiKeys({ google: savedGoogle || '', gemini: savedGemini || '' })
      if (savedGoogle) checkConnection('google', savedGoogle)
      if (savedGemini) checkConnection('gemini', savedGemini)
    } else {
      setTimeout(() => setShowSettings(true), 1000)
    }
  }, [])

  // 2. 取得 GPS 座標 (只執行一次)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          setCoords({ lat, lng })
          setLocLoading(false)
          setLocError(false)
        },
        (err) => {
          console.error(err)
          setLocLoading(false)
          setLocError(true)
          setLocationName("定位失敗")
        }
      )
    } else {
      setLocLoading(false)
      setLocError(true)
      setLocationName("不支援定位")
    }
  }, [])

  // 3. 當有座標且 Google API 連接成功時，去查行政區
  useEffect(() => {
    if (coords && connStatus.google === 'success') {
      fetchLocationName(coords.lat, coords.lng, apiKeys.google)
    }
  }, [coords, connStatus.google])

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingText(LOADING_TEXTS[Math.floor(Math.random() * LOADING_TEXTS.length)])
      }, 1500)
      return () => clearInterval(interval)
    }
  }, [loading])

  const handleSaveKey = (type, value) => {
    const newKeys = { ...apiKeys, [type]: value }
    setApiKeys(newKeys)
    if (type === 'google') localStorage.setItem('googleMapsKey', value)
    if (type === 'gemini') localStorage.setItem('geminiKey', value)
    setConnStatus(prev => ({ ...prev, [type]: null }))
  }

  const checkConnection = async (type, key) => {
    setConnStatus(prev => ({ ...prev, [type]: 'loading' }))
    try {
      const res = await fetch('/api/validate-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, key })
      })
      const data = await res.json()
      if (data.success) {
        setConnStatus(prev => ({ ...prev, [type]: 'success' }))
        return true
      } else {
        setConnStatus(prev => ({ ...prev, [type]: 'error' }))
        return false
      }
    } catch (e) {
      setConnStatus(prev => ({ ...prev, [type]: 'error' }))
      return false
    }
  }

  const handleConnectClick = async (type) => {
    const key = apiKeys[type]
    if (!key) return alert("請先輸入 API Key")
    const success = await checkConnection(type, key)
    if (!success) alert(`連接失敗，請檢查 API Key 是否正確`)
  }

  const handleAIRecommend = async () => {
    if (!isApiReady) return setShowSettings(true)
    if (!coords) return alert("還沒抓到你的位置！")
    
    setLoading(true)
    setResult(null)

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lat: coords.lat,
          lng: coords.lng,
          radius,
          cuisine,
          budget,
          time,
          googleApiKey: apiKeys.google,
          geminiApiKey: apiKeys.gemini
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "搜尋失敗")
      setResult(data)
    } catch (err) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  const walkTime = Math.round(radius / 80)
  const rideTime = Math.round(radius / 300)

  // Helper: 決定定位顯示文字 (修復重複顯示的問題)
  const getLocationText = () => {
    if (locLoading) return "定位中..."
    if (locError) return locationName || "定位失敗"
    
    // 如果 locationName 存在，直接顯示 (例如：西屯區福林里)
    if (locationName) {
      return `定位成功：${locationName}`
    }
    
    // 如果有座標，但還在等 Geocoding 回傳區名
    if (coords) return "定位成功"
    return "定位中..."
  }

  // Helper: 決定定位框顏色
  const getLocationClass = () => {
    if (locLoading) return 'bg-white text-gray-500 border-gray-100'
    if (locError) return 'bg-red-50 text-red-600 border-red-200 animate-pulse'
    return 'bg-green-50 text-green-700 border-green-200'
  }

  // --- 結果頁面 ---
  if (result) {
    return (
      <main className="min-h-screen bg-gray-50 fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
        <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden max-w-md w-full relative animate-in slide-in-from-bottom-10 duration-500 max-h-[90vh] overflow-y-auto">
          
          <div className="h-40 bg-gray-900 relative flex items-center justify-center">
            <span className="text-8xl drop-shadow-lg">🍱</span>
            <button 
              onClick={() => setResult(null)}
              className="absolute top-4 left-4 bg-white text-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-100 hover:scale-110 transition-all active:scale-95 z-20 group"
            >
              <ArrowLeft size={24} strokeWidth={2.5} className="group-hover:-translate-x-0.5 transition-transform"/> 
            </button>
          </div>

          <div className="px-8 pb-8 -mt-6 relative z-10">
            <div className="bg-white rounded-3xl shadow-xl p-6 mb-6 text-center border border-gray-100">
               <h2 className="text-2xl font-black text-gray-800 mb-2 leading-tight">{result.name}</h2>
               
               <div className="flex justify-center items-center gap-3 mb-4">
                 <div className="flex items-center gap-1 text-yellow-500 font-bold bg-yellow-50 px-2 py-1 rounded-lg">
                    <Star fill="currentColor" size={16} />
                    <span>{result.rating}</span>
                 </div>
                 <span className="text-gray-300">|</span>
                 <div className="text-gray-500 text-sm font-medium">
                   {result.user_ratings_total} 則評論
                 </div>
               </div>

               <div className="flex flex-col items-center gap-2">
                 <div className="flex items-center gap-2">
                    {result.open_now ? (
                        <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md">營業中</span>
                    ) : (
                        <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-1 rounded-md">休息中</span>
                    )}
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded-md border border-gray-200">
                      {PRICE_RANGES[result.price_level] || '價格未知'}
                    </span>
                 </div>
                 <div className="text-xs text-gray-400 font-medium tracking-widest">
                    {result.price_level ? "$".repeat(result.price_level) : ""}
                    <span className="opacity-30">{"$".repeat(4 - (result.price_level || 0))}</span>
                 </div>
               </div>
            </div>

            <div className="relative bg-orange-50 p-5 rounded-2xl border-l-4 border-orange-500 mb-6">
              <div className="absolute -top-3 left-4 bg-orange-500 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles size={10} />
                食客真實情報
              </div>
              <div className="mt-2 text-gray-700 leading-relaxed font-medium text-sm text-justify whitespace-pre-line">
                {result.ai_summary}
              </div>
            </div>

            <div className="flex items-start gap-3 text-gray-500 text-sm mb-6 px-2 bg-gray-50 p-3 rounded-xl">
              <MapPin className="shrink-0 mt-0.5 text-orange-400" size={16} />
              <span className="select-all break-all">{result.address}</span>
            </div>

            <div className="space-y-3">
              <a 
                href={result.google_maps_url} 
                target="_blank"
                className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white text-center font-bold py-4 rounded-2xl hover:bg-black transition-all active:scale-95 shadow-xl shadow-gray-200"
              >
                <Navigation size={18} />
                前往導航
              </a>
              
              <button 
                onClick={handleAIRecommend} 
                className="flex items-center justify-center gap-2 w-full bg-white text-gray-500 border-2 border-gray-100 font-bold py-3 rounded-2xl hover:bg-gray-50 hover:border-gray-200 transition-colors"
              >
                <RotateCw size={18} />
                再抽一次
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  // --- 主選單 ---
  return (
    <main className="min-h-screen bg-gray-50 pb-24 px-6 pt-10 font-sans">
      <div className="max-w-md mx-auto relative">
        
        {/* API 設定 Modal */}
        {showSettings && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <button 
                onClick={() => setShowSettings(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-xl font-black text-gray-800 mb-6 flex items-center gap-2">
                <Settings className="text-orange-500" /> API 設定
              </h2>

              <div className="space-y-6">
                {/* Google Maps Key */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                    Google Maps API Key
                    <a href={LINKS.google} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                      <LinkIcon size={12} />
                    </a>
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      value={apiKeys.google}
                      onChange={(e) => handleSaveKey('google', e.target.value)}
                      placeholder="請輸入 AIza 開頭的金鑰"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500 transition-colors text-gray-700 font-medium"
                    />
                    <button 
                      onClick={() => handleConnectClick('google')}
                      disabled={connStatus.google === 'loading'}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1
                        ${connStatus.google === 'success' ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-black'}
                      `}
                    >
                      {connStatus.google === 'loading' && <Loader2 size={12} className="animate-spin" />}
                      {connStatus.google === 'success' ? '已連接' : '連接'}
                    </button>
                  </div>
                  {connStatus.google === 'success' && <span className="text-green-600 text-xs flex items-center gap-1 font-bold"><Check size={12} /> Google API 連接成功！</span>}
                  {connStatus.google === 'error' && <span className="text-red-500 text-xs flex items-center gap-1 font-bold"><X size={12} /> 連接失敗，請檢查金鑰</span>}
                </div>

                {/* Gemini Key */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 flex items-center gap-1">
                    Gemini API Key
                    <a href={LINKS.gemini} target="_blank" rel="noreferrer" className="text-blue-500 hover:text-blue-700">
                      <LinkIcon size={12} />
                    </a>
                  </label>
                  <div className="flex gap-2">
                    <input 
                      type="password" 
                      value={apiKeys.gemini}
                      onChange={(e) => handleSaveKey('gemini', e.target.value)}
                      placeholder="請輸入 AIza 開頭的金鑰"
                      className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500 transition-colors text-gray-700 font-medium"
                    />
                    <button 
                      onClick={() => handleConnectClick('gemini')}
                      disabled={connStatus.gemini === 'loading'}
                      className={`
                        px-4 py-2 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 whitespace-nowrap flex items-center gap-1
                        ${connStatus.gemini === 'success' ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-black'}
                      `}
                    >
                      {connStatus.gemini === 'loading' && <Loader2 size={12} className="animate-spin" />}
                      {connStatus.gemini === 'success' ? '已連接' : '連接'}
                    </button>
                  </div>
                  {connStatus.gemini === 'success' && <span className="text-green-600 text-xs flex items-center gap-1 font-bold"><Check size={12} /> Gemini API 連接成功！</span>}
                  {connStatus.gemini === 'error' && <span className="text-red-500 text-xs flex items-center gap-1 font-bold"><X size={12} /> 連接失敗，請檢查金鑰</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        <header className="mb-8">
          <div className="flex items-center justify-between mb-4">
            {/* 左上角：定位顯示 */}
            <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full shadow-sm border transition-colors ${getLocationClass()}`}>
              <MapPin size={14} className={locLoading ? 'text-orange-500' : (locError ? 'text-red-600' : 'text-green-600')} />
              <span className="font-bold">
                {getLocationText()}
              </span>
            </div>
            
            {/* 設定按鈕 (右上角) */}
            <button 
              onClick={() => setShowSettings(true)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full shadow-sm transition-all border font-bold text-sm
                ${isApiReady 
                  ? 'bg-white text-gray-600 hover:text-gray-900 border-gray-100' 
                  : 'bg-red-50 text-red-600 border-red-200 animate-pulse'}
              `}
            >
              <Settings size={18} />
              {isApiReady ? "設定 API" : "⚠️ 請先設定 API"}
            </button>
          </div>
          
          <h1 className="text-4xl font-black text-gray-900 leading-tight mb-4">
            今天，<br/>
            想吃點什麼？
          </h1>

          {/* AI 許願池按鈕 */}
          <Link href={isApiReady ? "/smart-search" : "#"} 
            onClick={(e) => !isApiReady && e.preventDefault()}
            className={`
              group block w-full rounded-2xl p-4 shadow-lg transition-transform active:scale-95 relative overflow-hidden
              ${isApiReady 
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 shadow-purple-200 hover:scale-[1.02] cursor-pointer' 
                : 'bg-gray-200 cursor-not-allowed grayscale'}
            `}
          >
             <div className="flex items-center justify-between text-white">
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-purple-200 mb-1 flex items-center gap-1">
                    <Sparkles size={12} /> AI 許願池
                  </span>
                  <span className="font-bold text-lg">不知道吃什麼？</span>
                  <span className="text-sm text-purple-100">用說的，AI 幫你找靈感</span>
                </div>
                <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                  <ArrowRight size={24} />
                </div>
             </div>
             
             {!isApiReady && (
               <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
                 <Lock className="text-white/80" size={32} />
               </div>
             )}
          </Link>
        </header>

        <div className={`space-y-8 transition-opacity duration-500 ${isApiReady ? 'opacity-100' : 'opacity-50 pointer-events-none select-none'}`}>
          
          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">1</span>
              搜尋範圍
            </h3>
            
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex justify-between items-end mb-4">
                 <span className="text-3xl font-black text-orange-500">
                   {(radius / 1000).toFixed(1)} <span className="text-sm font-bold text-gray-400">km</span>
                 </span>
                 <div className="text-right flex flex-col items-end gap-1">
                    <div className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                       <Footprints size={12} /> 走 {walkTime} 分
                    </div>
                    <div className="flex items-center gap-1 text-xs font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded-full">
                       <Bike size={12} /> 騎 {rideTime} 分
                    </div>
                 </div>
              </div>

              <input 
                type="range" 
                min="100" 
                max="5000" 
                step="100" 
                value={radius} 
                onChange={(e) => setRadius(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-2 font-bold">
                 <span>巷口 (100m)</span>
                 <span>遠行 (5km)</span>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">2</span>
              料理風格
            </h3>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {CUISINE_PRESETS.map((c) => (
                <FilterButton 
                  key={c} label={c} active={cuisine === c} onClick={() => setCuisine(c)} 
                />
              ))}
            </div>
            
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="或是...輸入你想吃的 (例如：越南菜)"
                  value={CUISINE_PRESETS.includes(cuisine) ? '' : cuisine}
                  onChange={(e) => setCuisine(e.target.value)}
                  className={`w-full p-4 pl-12 rounded-2xl border-2 transition-all font-bold outline-none
                    ${!CUISINE_PRESETS.includes(cuisine) && cuisine !== '' 
                    ? 'border-orange-500 bg-orange-50 text-gray-900' 
                    : 'border-gray-100 bg-white text-gray-600 hover:border-orange-100 focus:border-orange-300'}`}
                />
            </div>
          </section>

          <section>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-6 h-6 bg-gray-900 text-white rounded-full flex items-center justify-center text-xs">3</span>
              預算範圍
            </h3>
            <div className="grid grid-cols-4 gap-2">
              <FilterButton label="$" subLabel="平價" active={budget === '1'} onClick={() => setBudget('1')} />
              <FilterButton label="$$" subLabel="一般" active={budget === '2'} onClick={() => setBudget('2')} />
              <FilterButton label="$$$" subLabel="聚餐" active={budget === '3'} onClick={() => setBudget('3')} />
              <FilterButton label="$$$$" subLabel="奢華" active={budget === '4'} onClick={() => setBudget('4')} />
            </div>
          </section>

          <div className="sticky bottom-6 pt-4 bg-gradient-to-t from-gray-50 to-transparent">
            <button
              onClick={handleAIRecommend}
              disabled={loading || locLoading || !isApiReady}
              className={`
                w-full py-5 rounded-3xl font-black text-xl shadow-xl transition-all transform
                ${loading || !isApiReady
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed shadow-none' 
                  : 'bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-orange-200 hover:scale-[1.02] hover:shadow-2xl active:scale-95'}
              `}
            >
              {loading ? loadingText : (isApiReady ? "✨ AI 幫我決定！" : "🔒 請先設定 API")}
            </button>
          </div>
        </div>
      </div>
    </main>
  )
}