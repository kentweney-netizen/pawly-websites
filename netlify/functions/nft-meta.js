const SUPABASE_URL = "https://iqmyiqjgzrlwthilkeos.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlxbXlpcWpnenJsd3RoaWxrZW9zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NTI0MjAsImV4cCI6MjA5NjIyODQyMH0.0kP2lz4vDS8E7E65cGj2Kny5DaK_TNVBuaQxVOr2Qf0";
const RPC = "https://api.mainnet-beta.solana.com";
const IMG = {
  fox: "https://www.pawlypets.online/dapp/myth/fox.jpg",
  moth: "https://www.pawlypets.online/dapp/myth/moth.jpg",
  wyrm: "https://www.pawlypets.online/dapp/myth/wyrm.jpg",
  boar: "https://www.pawlypets.online/dapp/myth/boar.jpg",
  cat: "https://www.pawlypets.online/dapp/myth/cat.jpg",
  toad: "https://www.pawlypets.online/dapp/myth/toad.jpg",
  lynx: "https://www.pawlypets.online/dapp/myth/lynx.jpg",
  rose: "https://www.pawlypets.online/dapp/myth/rose.jpg",
};
const FALLBACK = "https://www.pawlypets.online/pawly-token-helps.png";

function cors(extra) {
  return Object.assign({
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "public, max-age=60",
  }, extra || {});
}

function pickMint(event) {
  const q = (event.queryStringParameters && (event.queryStringParameters.mint || event.queryStringParameters.splat)) || "";
  if (q) return String(q).replace(/\.json$/i, "").replace(/^\/+/, "");
  const path = String(event.path || "");
  const m = path.match(/\/nft\/([^/?]+)/i);
  if (m) return decodeURIComponent(m[1]).replace(/\.json$/i, "");
  return "";
}

function imageOf(species) {
  const key = String(species || "").toLowerCase();
  for (const k of Object.keys(IMG)) {
    if (key === k || key.indexOf(k) >= 0) return IMG[k];
  }
  return FALLBACK;
}

function asJson(row) {
  const name = row.name || "PAWLY Pet Hub";
  const image = row.image || imageOf(row.species);
  return {
    name,
    symbol: row.symbol || "PHUB",
    description: row.description || (name + " is a 1/1 PAWLY Pet Hub card. Official site www.pawlypets.online"),
    image,
    external_url: "https://www.pawlypets.online/dapp/pet",
    seller_fee_basis_points: 0,
    properties: {
      category: "image",
      files: [{ uri: image, type: "image/jpeg" }],
      creators: row.owner ? [{ address: row.owner, share: 100 }] : [],
    },
    attributes: row.attributes && row.attributes.length ? row.attributes : [
      { trait_type: "Collection", value: "PAWLY Pet Hub" },
      { trait_type: "Species", value: row.species || "studio" },
      { trait_type: "Source", value: row.source || "studio" },
    ],
    collection: { name: "PAWLY Pet Hub", family: "PAWLY PETS" },
  };
}

async function mintExists(mint) {
  try {
    const r = await fetch(RPC, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getAccountInfo", params: [mint, { encoding: "base64" }] }),
    });
    const d = await r.json();
    return !!(d && d.result && d.result.value);
  } catch {
    return false;
  }
}

async function lookup(mint) {
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/pet_hub_nft_meta?mint=eq." + encodeURIComponent(mint) + "&select=*", {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
    });
    const rows = await r.json();
    if (Array.isArray(rows) && rows[0]) return rows[0];
  } catch { /* next */ }
  try {
    const r = await fetch(SUPABASE_URL + "/rest/v1/pet_hub_market?select=wallet,nfts", {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + SUPABASE_KEY },
    });
    const rows = await r.json();
    if (Array.isArray(rows)) {
      for (const row of rows) {
        const list = Array.isArray(row.nfts) ? row.nfts : [];
        const hit = list.find((n) => n && n.mint === mint);
        if (hit) {
          return { mint, name: hit.name, species: hit.species, source: hit.source, owner: hit.owner || row.wallet };
        }
      }
    }
  } catch { /* generic */ }
  return { mint, name: "PAWLY Pet Hub Card", species: "studio", source: "studio" };
}

exports.handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: cors(), body: "" };
  const mint = pickMint(event);
  if (!mint || mint === "collection") {
    return {
      statusCode: 200,
      headers: cors(),
      body: JSON.stringify({
        name: "PAWLY Pet Hub",
        symbol: "PHUB",
        description: "Official PAWLY Pet Hub 1/1 cards. Play at www.pawlypets.online/dapp/pet",
        image: FALLBACK,
        external_url: "https://www.pawlypets.online/dapp/pet",
        seller_fee_basis_points: 0,
      }),
    };
  }
  const live = await mintExists(mint);
  if (!live) {
    return { statusCode: 404, headers: cors({ "Cache-Control": "no-store" }), body: JSON.stringify({ error: "mint not on-chain", mint }) };
  }
  const row = await lookup(mint);
  return { statusCode: 200, headers: cors(), body: JSON.stringify(asJson(row)) };
};
