import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";

const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");

function loadDatabase() {
  const data = new Map();
  const sandbox = {
    window: {},
    document: { addEventListener() {} },
    localStorage: {
      getItem: (key) => data.get(key) ?? null,
      setItem: (key, value) => data.set(key, String(value)),
      removeItem: (key) => data.delete(key),
    },
  };
  vm.createContext(sandbox);
  vm.runInContext(read("db.js"), sandbox);
  return { sandbox, data };
}

function loadCartScript(sandbox) {
  sandbox.document.getElementById = () => ({ style: {}, textContent: "", value: "" });
  const inlineScript = read("cart.html").match(/<script>([\s\S]*?)<\/script>/)?.[1];
  assert.ok(inlineScript);
  vm.runInContext(inlineScript, sandbox);
}

test("current warehouse sheet maps official SKUs but never exposes prices", () => {
  const { sandbox } = loadDatabase();
  const csv = [
    "sku,brand,name,target,price,ml,stock,hot_selling_weight,new_arrival_weight,image_url,sku2",
    'IL-B001,Louis Vuitton,"Afternoon, Swim",Unisex,52,100,117,9,,https://example.test/a.webp,午后漫游',
    "TX-A002,Valentino,Donna,Women,38,100,48,,8,https://example.test/b.webp,",
    "IL-B003,Xerjoff,Naxos,Men,42,100,18,,,https://example.test/c.webp,",
    "IL-B004,Chanel,No Price,Women,,100,30,,,https://example.test/d.webp,",
  ].join("\r\n");
  const products = JSON.parse(JSON.stringify(sandbox.parseCSV(csv)));
  assert.deepEqual(products.map((item) => item.id), ["IL-B001", "TX-A002"]);
  assert.equal(products[0].name, "Afternoon, Swim");
  assert.equal(products[0].warehouse, "IL");
  assert.equal(products[1].warehouse, "TX");
  assert.equal(products[0].top, 9);
  assert.equal(products[1].new, 8);
  assert.ok(products.every((item) => !Object.hasOwn(item, "price") && !Object.hasOwn(item, "sku2")));
});

test("customer list stays separate from the seller sites' shared cart", () => {
  const { sandbox, data } = loadDatabase();
  data.set("bestProducts1SharedCartV3", JSON.stringify([{ name: "IL-B001", quantity: 5 }]));
  assert.deepEqual(JSON.parse(JSON.stringify(sandbox.readFastCart())), []);
  sandbox.writeFastCart([{ name: "TX-A002", quantity: 2 }]);
  assert.equal(JSON.parse(data.get("bestProducts1FastCatalogCartV1"))[0].name, "TX-A002");
  assert.equal(JSON.parse(data.get("bestProducts1SharedCartV3"))[0].quantity, 5);
});

test("brand categories include every stocked brand and merge case-only duplicates", () => {
  const { sandbox } = loadDatabase();
  const categories = JSON.parse(JSON.stringify(sandbox.getBrandCategories([
    { brand: " Dior " }, { brand: "dior" }, { brand: "Zoologist" },
    { brand: "Acqua di Parma" }, { brand: "" },
  ])));
  assert.deepEqual(categories, [
    { name: "Acqua di Parma", count: 1 },
    { name: "Dior", count: 2 },
    { name: "Zoologist", count: 1 },
  ]);
});

test("copy list groups warehouses and uses syntax accepted by the SKU paste parser", () => {
  const { sandbox } = loadDatabase();
  loadCartScript(sandbox);
  const text = sandbox.buildCopyList([
    { name: "IL-B001", quantity: 2 },
    { name: "TX-A002", quantity: 3 },
    { name: "IL-B016", quantity: 1 },
  ]);
  assert.match(text, /IL Warehouse \| 3 items\nIL-B001\*2\+IL-B016\*1/);
  assert.match(text, /TX Warehouse \| 3 items\nTX-A002\*3/);
  assert.match(text, /Total Items: 6$/);
  assert.doesNotMatch(text, /\$|New Order|\s[xX×]\s*\d+/);
  const recognized = text.split(/[+\n,\r]/).map((line) => line.trim().match(/^(IL|TX)-[A-Z0-9-]+\*\d+$/)?.[0]).filter(Boolean);
  assert.deepEqual(recognized, ["IL-B001*2", "IL-B016*1", "TX-A002*3"]);
});
