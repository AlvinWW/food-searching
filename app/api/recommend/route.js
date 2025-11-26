import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getValidKey } from '../../lib/keys'

export async function POST(req) {
  try {
    const body = await req.json()
    const { lat, lng, radius, cuisine, budget, time, googleApiKey, geminiApiKey } = body

    // 轉換 Key
    const finalGoogleKey = getValidKey(googleApiKey, 'google')
    const finalGeminiKey = getValidKey(geminiApiKey, 'gemini')

    if (!finalGoogleKey || !finalGeminiKey) {
      return NextResponse.json({ error: "請輸入 API Key (或管理員密語)" }, { status: 401 })
    }

    const genAI = new GoogleGenerativeAI(finalGeminiKey)
    const searchRadius = radius || 1000 
    const minPrice = Number(budget) <= 1 ? 0 : Number(budget) - 1
    const maxPrice = Number(budget)
    const keyword = cuisine === '隨便' ? '美食' : `${cuisine}餐廳`

    const googleUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${searchRadius}&keyword=${keyword}&minprice=${minPrice}&maxprice=${maxPrice}&opennow=${time === 'now'}&language=zh-TW&key=${finalGoogleKey}`

    const googleRes = await fetch(googleUrl)
    const googleData = await googleRes.json()

    if (googleData.status !== 'OK' && googleData.status !== 'ZERO_RESULTS') {
      return NextResponse.json({ error: `Google API 錯誤: ${googleData.status}` }, { status: 500 })
    }

    if (!googleData.results || googleData.results.length === 0) {
      return NextResponse.json({ error: "附近找不到符合條件的餐廳😭" }, { status: 404 })
    }

    const candidates = googleData.results.filter(r => r.rating >= 3.5)
    const finalPool = candidates.length > 0 ? candidates : googleData.results
    const selectedPlace = finalPool[Math.floor(Math.random() * finalPool.length)]

    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${selectedPlace.place_id}&fields=reviews,formatted_address&language=zh-TW&key=${finalGoogleKey}`
    const detailsRes = await fetch(detailsUrl)
    const detailsData = await detailsRes.json()
    
    const reviews = detailsData.result?.reviews || []
    const reviewsText = reviews.map(r => r.text).join("\n---\n").slice(0, 2000)
    const fullAddress = detailsData.result?.formatted_address || selectedPlace.vicinity

    const prompt = `
      角色：你是一位誠實、愛吃美食的朋友。
      任務：根據以下真實評論，分析這家餐廳值不值得去。
      餐廳：${selectedPlace.name} (${selectedPlace.rating}分)
      評論：${reviewsText || "無詳細評論"}
      請列出：1.【👍 亮點】 2.【⚠️ 注意】 3.【💬 結論】
      繁體中文，不用加一堆**或引號加重口氣，全文在150字內。
    `

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" })
    const result = await model.generateContent(prompt)

    return NextResponse.json({
      name: selectedPlace.name,
      rating: selectedPlace.rating,
      user_ratings_total: selectedPlace.user_ratings_total,
      price_level: selectedPlace.price_level,
      address: fullAddress,
      open_now: selectedPlace.opening_hours?.open_now,
      place_id: selectedPlace.place_id,
      google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedPlace.name)}&query_place_id=${selectedPlace.place_id}`,
      ai_summary: result.response.text()
    })

  } catch (error) {
    console.error("API Error:", error)
    return NextResponse.json({ error: "系統忙線中" }, { status: 500 })
  }
}