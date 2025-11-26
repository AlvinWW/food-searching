import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req) {
  try {
    const { query, lat, lng } = await req.json()
    // 注意：這裡的前端 page.js 還沒改成傳送 key，如果要讓許願池也用前端 key，
    // 您需要在 app/smart-search/page.js 裡也加上讀取 localStorage 的邏輯。
    // 為了相容性，這裡暫時保留 process.env，建議您之後一併更新許願池的前端邏輯。
    const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.Maps_API_KEY
    const geminiApiKey = process.env.GEMINI_API_KEY

    if (!googleMapsApiKey || !geminiApiKey) {
      // 這裡之後應該要改成接收前端傳來的 key
      return NextResponse.json({ error: "API Key 未設定 (許願池目前仍使用後端 Key)" }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey)
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" })
    
    // 1. 轉換關鍵字
    const parsePrompt = `
      使用者想找餐廳。
      需求：${query}
      
      請回傳 JSON：
      {
        "keyword": "搜尋關鍵字",
        "minPrice": 0,
        "maxPrice": 4
      }
      不要 markdown。
    `
    const parseResult = await model.generateContent(parsePrompt)
    const parseText = parseResult.response.text().replace(/```json|```/g, '').trim()
    let searchParams;
    try { searchParams = JSON.parse(parseText) } catch { searchParams = { keyword: '美食', minPrice: 0, maxPrice: 4 } }
    
    // 2. 搜尋
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchParams.keyword)}&location=${lat},${lng}&radius=2000&minprice=${searchParams.minPrice}&maxprice=${searchParams.maxPrice}&opennow=true&language=zh-TW&key=${googleMapsApiKey}`

    const googleRes = await fetch(textSearchUrl)
    const googleData = await googleRes.json()

    if (!googleData.results || googleData.results.length === 0) {
      return NextResponse.json({ error: "找不到符合願望的店..." }, { status: 404 })
    }

    // 3. 挑選 + 分析
    const bestCandidates = googleData.results.filter(r => r.rating >= 4.0)
    const pool = bestCandidates.length > 0 ? bestCandidates : googleData.results
    const selected = pool[Math.floor(Math.random() * pool.length)]

    // Prompt
    const reasonPrompt = `
      使用者願望：${query}
      推薦餐廳：${selected.name} (評分 ${selected.rating})
      
      請用繁體中文，像朋友一樣告訴使用者：
      1. 為什麼這家店符合他的願望？
      2. 提醒一個可能的缺點（如果有）。
      語氣誠實親切。
    `
    const reasonResult = await model.generateContent(reasonPrompt)

    return NextResponse.json({
      name: selected.name,
      rating: selected.rating,
      user_ratings_total: selected.user_ratings_total,
      address: selected.formatted_address || selected.vicinity,
      google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selected.name)}&query_place_id=${selected.place_id}`,
      ai_reason: reasonResult.response.text()
    })

  } catch (error) {
    console.error("Smart Search Error:", error)
    return NextResponse.json({ error: "AI 思考中斷，請重試" }, { status: 500 })
  }
}