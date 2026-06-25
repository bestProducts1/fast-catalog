// ==========================================
// db.js - 产品数据管理中心（纯净展示版）
// ==========================================

const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS_1tyfxYn_N6GiapL-T1u325G_A5L7YlrgAZKd92Nnl_7l12c5hDeur-9kwuE4RfBY4a9lZzNnqzc9/pub?gid=0&single=true&output=csv";

const CACHE_DURATION = 5 * 60 * 1000;
window.perfumeDB = [];

document.addEventListener("DOMContentLoaded", () => {
  initProductData();
});

async function initProductData() {
  const cacheKey = "perfumeDB_Data_CleanView";
  const timeKey = "perfumeDB_Time_CleanView";

  const now = new Date().getTime();
  const cachedTime = localStorage.getItem(timeKey);
  const cachedData = localStorage.getItem(cacheKey);

  if (cachedData && cachedTime && now - cachedTime < CACHE_DURATION) {
    try {
      window.perfumeDB = JSON.parse(cachedData);
      runPageLogic();
      return;
    } catch (e) {
      console.warn("缓存损坏，重新拉取");
    }
  }

  try {
    const response = await fetch(SHEET_URL);
    const data = await response.text();
    window.perfumeDB = parseCSV(data);

    localStorage.setItem(cacheKey, JSON.stringify(window.perfumeDB));
    localStorage.setItem(timeKey, now);

    runPageLogic();
  } catch (error) {
    console.error("下载失败:", error);
    if (cachedData) {
      window.perfumeDB = JSON.parse(cachedData);
      runPageLogic();
    }
  }
}

function runPageLogic() {
  if (typeof renderHome === "function") renderHome();
  if (typeof renderGridPage === "function") renderGridPage();
  if (typeof renderCart === "function") renderCart();
}

function parseCSV(csvText) {
  const clean = csvText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].trim().split(",").map((h) => h.trim().toLowerCase());

  return lines.slice(1).map((line) => {
    const values = [];
    let current = "";
    let inQuote = false;
    for (let char of line) {
      if (char === '"') {
        inQuote = !inQuote;
      } else if (char === "," && !inQuote) {
        values.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    if (values.length < headers.length) return null;

    const obj = {};
    headers.forEach((header, index) => {
      let val = values[index] ? values[index].replace(/^"|"$/g, "") : "";
      if (header === "stock" || header === "inventory") {
        val = Number(val) || 0;
      }
      obj[header] = val;
    });
    return obj;
  }).filter((item) => item !== null);
}