import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req) {
  try {
    const body = await req.json()
    const { lat, lng, radius, cuisine, budget, time, googleApiKey, geminiApiKey } = body

    // 嚴格檢查：只接受前端傳來的 Key，不使用後端環境變數
    if (!googleApiKey || !geminiApiKey) {
      return NextResponse.json({ error: "未提供 API Key，請在設定中輸入" }, { status: 401 })
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey)

    // 使用接收到的半徑，若無則預設 1000
    const searchRadius = radius || 1000 
    const minPrice = Number(budget) <= 1 ? 0 : Number(budget) - 1
    const maxPrice = Number(budget)
    const keyword = cuisine === '隨便' ? '美食' : `${cuisine}餐廳`

    // 搜尋 Nearby
    const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${searchRadius}&keyword=${keyword}&minprice=${minPrice}&maxprice=${maxPrice}&opennow=${time === 'now'}&language=zh-TW&key=${googleApiKey}`

    const googleRes = await fetch(googleUrl)
    const googleData = await googleRes.json()

    if (googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
      console.error("Google Maps API Error:", googleData)
      return NextResponse.json({ error: `Google API 錯誤: ${googleData.status}` }, { status: 500 })
    }

    if (!googleData.results || googleData.results.length === 0) {
      return NextResponse.json({ error: "附近找不到符合條件的餐廳😭 試試看拉大搜尋範圍？" }, { status: 404 })
    }

    // 隨機抽選
    const candidates = googleData.results.filter(r => r.rating >= 3.5)
    const finalPool = candidates.length > 0 ? candidates : googleData.results
    const selectedPlace = finalPool[Math.floor(Math.random() * finalPool.length)]

    // 抓取詳細評論
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${selectedPlace.place_id}&fields=reviews,formatted_address&language=zh-TW&key=${googleApiKey}`
    const detailsRes = await fetch(detailsUrl)
    const detailsData = await detailsRes.json()
    
    const reviews = detailsData.result?.reviews || []
    const reviewsText = reviews.map(r => r.text).join("\n---\n").slice(0, 2000)
    const fullAddress = detailsData.result?.formatted_address || selectedPlace.vicinity

    // Prompt
    const prompt = `
      角色：你是一位誠實、愛吃美食的朋友。
      任務：根據以下真實評論，分析這家餐廳值不值得去。
      
      餐廳資訊：
      店名：${selectedPlace.name} (評分 ${selectedPlace.rating})
      真實評論：
      ${reviewsText || "（暫無詳細評論）"}
      
      請依序列出：
      1. 【👍 亮點】：大家一致推薦什麼？(例如：湯頭很濃、必點炸雞)
      2. 【⚠️ 注意】：大家抱怨什麼？(例如：服務臉臭、要等很久、環境吵)。如果沒有明顯缺點，就說「評價普遍良好」。
      
      最後給一個短評結論。
      總字數 100 字內。繁體中文。
    `

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" })
    const result = await model.generateContent(prompt)
    const aiSummary = result.response.text()

    return NextResponse.json({
      name: selectedPlace.name,
      rating: selectedPlace.rating,
      user_ratings_total: selectedPlace.user_ratings_total,
      price_level: selectedPlace.price_level,
      address: fullAddress,
      open_now: selectedPlace.opening_hours?.open_now,
      place_id: selectedPlace.place_id,
      google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.name)}&query_place_id=${selectedPlace.place_id}`,
      ai_summary: aiSummary
    })

  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "系統忙線中" }, { status: 500 })
  }
}