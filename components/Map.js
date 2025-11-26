'use client'

import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect } from 'react'

// 修正 Leaflet 圖示問題
const icon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// 視角自動跟隨元件
function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 16); // 稍微拉近一點 (Zoom 16)，看得比較清楚
  }, [center, map]);
  return null;
}

export default function Map({ center, restaurants }) {
  return (
    <MapContainer 
      center={center} 
      zoom={16} 
      style={{ height: "100%", width: "100%", zIndex: 0 }}
      zoomControl={false} // 隱藏原本醜醜的 +/- 按鈕，讓畫面更乾淨
    >
      {/* --- 這裡換成了 CartoDB 的地圖風格 (比較美！) --- */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      <ChangeView center={center} />

      {/* 餐廳標記 */}
      {restaurants.map((shop) => (
        <Marker 
          key={shop.id} 
          position={[shop.lat, shop.lng]} 
          icon={icon}
        >
          <Popup className="custom-popup">
            <div className="p-1 min-w-[200px] text-center font-sans">
              <h3 className="font-bold text-lg text-gray-800 mb-1 truncate">
                {shop.name}
              </h3>
              
              <div className="flex items-center justify-center space-x-2 mb-3">
                <span className="bg-orange-100 text-orange-600 text-xs px-2 py-0.5 rounded-full font-medium">
                  {shop.area || "未知區域"}
                </span>
                {/* 這裡未來可以放評分 */}
              </div>

              <a 
                href={shop.google_url} 
                target="_blank" 
                rel="noreferrer"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg shadow-sm transition-colors duration-200 no-underline"
                style={{ color: 'white' }} // 強制白色字體，防止被全域樣式覆蓋
              >
                在 Google Maps 查看
              </a>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* 使用者位置 (換一個顯眼的紅色圓點) */}
      <Marker position={center} icon={icon}>
        <Popup>📍 你目前的位置</Popup>
      </Marker>
    </MapContainer>
  )
}