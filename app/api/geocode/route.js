import { NextResponse } from 'next/server'

export async function POST(req) {
  try {
    const { lat, lng, apiKey } = await req.json()

    if (!apiKey) {
      return NextResponse.json({ error: "API Key 未設定" }, { status: 400 })
    }

    // 呼叫 Google Geocoding API
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=zh-TW&key=${apiKey}`
    
    const res = await fetch(url)
    const data = await res.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      
      // 儲存各種層級的名稱
      let adminArea1 = '' // 縣市 (Taichung City)
      let district = ''   // 區 (Xitun District)
      let subLocality = '' // 里 (Fulin Li)
      let route = ''      // 路 (Taiwan Boulevard)

      result.address_components.forEach(c => {
        const t = c.types
        if (t.includes('administrative_area_level_1')) adminArea1 = c.long_name
        if (t.includes('administrative_area_level_3')) district = c.long_name // 優先抓 Level 3 (區)
        if (t.includes('administrative_area_level_4')) subLocality = c.long_name // 優先抓 Level 4 (里)
        if (t.includes('route')) route = c.long_name
        
        // 備用方案：如果沒抓到標準層級，試試看其他常見類型
        if (!district && t.includes('locality') && !t.includes('administrative_area_level_1')) district = c.long_name
        if (!district && t.includes('administrative_area_level_2')) district = c.long_name
        if (!subLocality && t.includes('sublocality_level_1')) subLocality = c.long_name
        if (!subLocality && t.includes('sublocality')) subLocality = c.long_name
      })
      
      // 組合最終名稱
      let finalLocationName = ''

      // 策略 1: 完美的 區 + 里 (例如：西屯區福林里)
      if (district && subLocality) {
        finalLocationName = `${district}${subLocality}`
      } 
      // 策略 2: 只有 區 (例如：西屯區)
      else if (district) {
        finalLocationName = district
        // 如果有路名，補上去看起來更精確 (例如：西屯區台灣大道)
        if (route) finalLocationName += ` ${route}`
      } 
      // 策略 3: 只有 縣市 + 區
      else if (adminArea1) {
        finalLocationName = adminArea1
      }
      // 策略 4: 真的什麼都抓不到，直接用 formatted_address 截短
      else {
        // 移除郵遞區號和國名，只留中間
        finalLocationName = result.formatted_address.replace(/^\d+\s*/, '').replace(/^台灣/, '').trim().split(' ')[0]
      }

      return NextResponse.json({ 
        locationName: finalLocationName || "未知位置", // 確保不回傳空字串
        fullAddress: result.formatted_address
      })
    } else {
      console.error("Geocoding error:", data.status)
      return NextResponse.json({ locationName: "定位完成" })
    }

  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}