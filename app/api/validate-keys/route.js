import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req) {
  try {
    const { type, key } = await req.json()

    if (!key) return NextResponse.json({ success: false, error: "未輸入 Key" })

    if (type === 'google') {
      // 測試 Google Maps API (試搜尋 "Test")
      const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Test&inputtype=textquery&fields=name&key=${key}`
      const res = await fetch(url)
      const data = await res.json()
      
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ success: false, error: data.error_message || data.status })
      }
    } 
    else if (type === 'gemini') {
      // 測試 Gemini API (使用最新的 2.5 Flash Preview)
      try {
        const genAI = new GoogleGenerativeAI(key)
        // 修正：改用與其他 API 一致的模型版本，避免 404
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-preview-09-2025" })
        await model.generateContent("Hi")
        return NextResponse.json({ success: true })
      } catch (e) {
        return NextResponse.json({ success: false, error: e.message })
      }
    }

    return NextResponse.json({ success: false, error: "未知類型" })

  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}