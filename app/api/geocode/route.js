import { NextResponse } from 'next/server'
import { getValidKey } from '../../lib/keys'

export async function POST(req) {
  try {
    const { lat, lng, apiKey } = await req.json()
    const finalKey = getValidKey(apiKey, 'google')

    if (!finalKey) return NextResponse.json({ error: "No Key" }, { status: 400 })

    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=zh-TW&key=${finalKey}`
    const res = await fetch(url)
    const data = await res.json()

    if (data.status === 'OK' && data.results.length > 0) {
      const result = data.results[0]
      let adminArea1 = '', district = '', subLocality = '', route = ''

      result.address_components.forEach(c => {
        const t = c.types
        if (t.includes('administrative_area_level_1')) adminArea1 = c.long_name
        if (t.includes('administrative_area_level_3')) district = c.long_name
        if (t.includes('administrative_area_level_4')) subLocality = c.long_name
        if (t.includes('route')) route = c.long_name
        
        // Fallback
        if (!district && t.includes('locality') && !t.includes('administrative_area_level_1')) district = c.long_name
        if (!district && t.includes('administrative_area_level_2')) district = c.long_name
        if (!subLocality && t.includes('sublocality_level_1')) subLocality = c.long_name
      })
      
      let finalLocationName = district 
        ? (subLocality ? `${district}${subLocality}` : district) 
        : (adminArea1 || "未知位置")

      return NextResponse.json({ locationName: finalLocationName, fullAddress: result.formatted_address })
    } else {
      return NextResponse.json({ locationName: "定位成功" })
    }
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}