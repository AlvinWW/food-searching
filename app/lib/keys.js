// 這個函式負責檢查：是「密語」還是「普通 Key」？
export function getValidKey(inputKey, type) {
  // 取得環境變數中的密語設定
  const adminUser = process.env.ADMIN_USER // Google 欄位的密語
  const adminPass = process.env.ADMIN_PASSWORD // Gemini 欄位的密語

  // 1. 檢查是否為 Google Maps 的密語
  if (type === 'google' && inputKey === adminUser) {
    console.log("🔓 Admin 模式：使用 Google 系統環境變數")
    return process.env.GOOGLE_MAPS_API_KEY || process.env.Maps_API_KEY
  }

  // 2. 檢查是否為 Gemini 的密語
  if (type === 'gemini' && inputKey === adminPass) {
    console.log("🔓 Admin 模式：使用 Gemini 系統環境變數")
    return process.env.GEMINI_API_KEY
  }

  // 3. 如果都不是，就回傳使用者輸入原本的東西 (讓他自己付錢)
  return inputKey
}