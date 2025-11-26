import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { getValidKey } from '../../lib/keys'

export async function POST(req) {
  try {
    const { type, key } = await req.json()
    
    // 使用工具轉換 Key (如果是密語，這裡會變成真 Key)
    const finalKey = getValidKey(key, type)

    if (!finalKey) return NextResponse.json({ success: false, error: "無效的金鑰或密語" })

    if (type === 'google') {
      const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=Test&inputtype=textquery&fields=name&key=${finalKey}`
      const res = await fetch(url)
      const data = await res.json()
      
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        return NextResponse.json({ success: true })
      } else {
        return NextResponse.json({ success: false, error: data.error_message || data.status })
      }
    } 
    else if (type === 'gemini') {
      try {
        const genAI = new GoogleGenerativeAI(finalKey)
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