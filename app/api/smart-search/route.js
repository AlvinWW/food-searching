import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getValidKey } from '../../lib/keys'

export async function POST(req) {
  try {
    const { query, lat, lng, googleApiKey, geminiApiKey } = await req.json()
    
    const finalGoogleKey = getValidKey(googleApiKey, 'google')
    const finalGeminiKey = getValidKey(geminiApiKey, 'gemini')

    if (!finalGoogleKey || !finalGeminiKey) {
      return NextResponse.json({ error: "請輸入 API Key (或管理員密語)" }, { status: 401 })
    }

    const genAI = new GoogleGenerativeAI(finalGeminiKey)
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
    try { 
        searchParams = JSON.parse(parseText) 
    } catch { 
        searchParams = { keyword: '美食', minPrice: 0, maxPrice: 4 } 
    }
    
    // 2. 搜尋
    const textSearchUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchParams.keyword)}&location=${lat},${lng}&radius=2000&minprice=${searchParams.minPrice}&maxprice=${searchParams.maxPrice}&opennow=true&language=zh-TW&key=${finalGoogleKey}`

    const googleRes = await fetch(textSearchUrl)
    const googleData = await googleRes.json()

    if (!googleData.results || googleData.results.length === 0) {
      return NextResponse.json({ error: "找不到符合願望的店..." }, { status: 404 })
    }

    // 3. 挑選 + 分析
    const bestCandidates = googleData.results.filter(r => r.rating >= 4.0)
    const pool = bestCandidates.length > 0 ? bestCandidates : googleData.results
    const selected = pool[Math.floor(Math.random() * pool.length)]

    // Prompt 更新：加入字數限制
    const reasonPrompt = `
      使用者願望：${query}
      推薦餐廳：${selected.name} (評分 ${selected.rating})
      
      請用繁體中文，像朋友一樣告訴使用者：
      1. 為什麼這家店符合他的願望？(例如：你想吃辣，這家的麻辣鍋很出名)
      2. 提醒一個可能的缺點（如果有，例如：人很多要排隊）。
      語氣誠實親切。
      用繁體中文，不用加一堆**或上下引號增強語氣
      **請將總字數嚴格控制在 200 字以內並且在最後面不要顯示總字數**
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