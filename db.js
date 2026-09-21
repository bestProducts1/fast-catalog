// Customer-facing catalog. Prices are intentionally not mapped into products.
const SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRFWYImNbJ0ao5z0VDk_VZwhOP1pnY2UZdFuwxtYOvKaNfEX4sInJh7uk-MlRSH9kffdZ5TjzhudLao/pub?gid=1967485424&single=true&output=csv";
const PRODUCT_CACHE_KEY = "bestProducts1FastCatalogProductsV1";
const PRODUCT_TIME_KEY = "bestProducts1FastCatalogTimeV1";
const CART_STORAGE_KEY = "bestProducts1FastCatalogCartV1";
const CACHE_DURATION = 5 * 60 * 1000;
const MIN_STOCK = 19;
window.perfumeDB = [];

function parseCsvRows(csvText) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const text = String(csvText || "").replace(/^\uFEFF/, "");
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') {
        value += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === "," && !quoted) {
      row.push(value.trim());
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(value.trim());
      if (row.some(Boolean)) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (quoted) throw new Error("Incomplete quoted product data");
  row.push(value.trim());
  if (row.some(Boolean)) rows.push(row);
  return rows;
}

function parseCSV(csvText) {
  const rows = parseCsvRows(csvText);
  if (rows.length < 2) return [];
  const headers = rows.shift().map((header) => header.toLowerCase());
  return rows.map((values) => {
    const record = Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
    const id = String(record.sku || "").trim().toUpperCase();
    const warehouse = id.match(/^(IL|TX)-/);
    const stock = Number(record.stock);
    if (!warehouse || !record.name || !Number.isFinite(stock) || stock < MIN_STOCK || !(Number(record.price) > 0)) return null;
    return {
      id,
      name: record.name,
      brand: record.brand || "",
      gender: record.target || "",
      ml: record.ml || "",
      img: record.image_url || "",
      stock,
      inventory: stock,
      warehouse: warehouse[1],
      top: Number(record.hot_selling_weight) || 0,
      new: Number(record.new_arrival_weight) || 0,
      notes: record.notes || "",
    };
  }).filter(Boolean);
}

function readFastCart() {
  try {
    const cart = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
    return Array.isArray(cart) ? cart : [];
  } catch {
    return [];
  }
}

function writeFastCart(cart) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(Array.isArray(cart) ? cart : []));
}

function clearFastCart() {
  localStorage.removeItem(CART_STORAGE_KEY);
}

function runPageLogic() {
  if (typeof renderHome === "function") renderHome();
  if (typeof renderGridPage === "function") renderGridPage();
  if (typeof renderCart === "function") renderCart();
}

async function initProductData() {
  const cachedAt = Number(localStorage.getItem(PRODUCT_TIME_KEY));
  let cachedProducts = [];
  try {
    const parsed = JSON.parse(localStorage.getItem(PRODUCT_CACHE_KEY) || "[]");
    if (Array.isArray(parsed)) cachedProducts = parsed;
  } catch {
    // Ignore broken cache and fetch the current sheet.
  }
  if (cachedProducts.length && Date.now() - cachedAt < CACHE_DURATION) {
    window.perfumeDB = cachedProducts;
    runPageLogic();
    return;
  }
  try {
    const response = await fetch(`${SHEET_URL}&_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`Product sheet returned ${response.status}`);
    const products = parseCSV(await response.text());
    if (!products.length) throw new Error("Product sheet contains no available products");
    window.perfumeDB = products;
    localStorage.setItem(PRODUCT_CACHE_KEY, JSON.stringify(products));
    localStorage.setItem(PRODUCT_TIME_KEY, String(Date.now()));
    runPageLogic();
  } catch (error) {
    console.error("Could not refresh products:", error);
    if (cachedProducts.length) {
      window.perfumeDB = cachedProducts;
      runPageLogic();
    }
  }
}

document.addEventListener("DOMContentLoaded", initProductData);
