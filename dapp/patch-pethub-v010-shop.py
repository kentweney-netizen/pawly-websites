#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
if 'shopView' in t and 'Pets food' in t and 'Choose your pets' in t and 'scene === "street" || scene === "shop"' not in t:
    print("already")
    raise SystemExit(0)

t = t.replace(
    " * PAWLY Pet Hub v0.9.3 — lower BGM tap + generated cert/photo + layered BGM.",
    " * PAWLY Pet Hub v0.10.1 — street pets only + shop buttons + food feed.",
)

t = t.replace('type CartKind = "adopt" | "rescue" | "service";', 'type CartKind = "adopt" | "rescue" | "service" | "food" | "feed";')
if "petId?: string" not in t:
    t = t.replace(
        """type CartItem = {
  title: string;
  amount: number;
  kind: CartKind;
  species?: string;
  emoji?: string;
};""",
        """type CartItem = {
  title: string;
  amount: number;
  kind: CartKind;
  species?: string;
  emoji?: string;
  petId?: string;
};""",
    )
if "feedsTotal?:" not in t and "feedsTotal:" not in t.split("type PetRec")[1][:400]:
    t = t.replace(
        "  pricePawly?: number;\n  sig?: string;\n};",
        "  pricePawly?: number;\n  sig?: string;\n  feedsTotal?: number;\n  feedsToday?: number;\n  feedDay?: string;\n  level?: number;\n};",
        1,
    )

FOODS = '''
const FOODS = [
  { id: "snack", label: "Treat / snack", emoji: "\U0001f36a", pricePawly: 10 },
  { id: "catfood", label: "Cat food", emoji: "\U0001f41f", pricePawly: 15 },
  { id: "dogfood", label: "Dog food", emoji: "\U0001f9b4", pricePawly: 15 },
  { id: "seed", label: "Bird / farm feed", emoji: "\U0001f33e", pricePawly: 12 },
  { id: "veg", label: "Herbivore mix", emoji: "\U0001f96c", pricePawly: 12 },
  { id: "bug", label: "Insect / reptile feed", emoji: "\U0001f347", pricePawly: 12 },
  { id: "deluxe", label: "Deluxe bowl", emoji: "\U0001f371", pricePawly: 30 },
];
'''
# use real emoji in file
FOODS = FOODS.encode().decode("unicode_escape") if False else '''
const FOODS = [
  { id: "snack", label: "Treat / snack", emoji: "COOKIE", pricePawly: 10 },
  { id: "catfood", label: "Cat food", emoji: "FISH", pricePawly: 15 },
  { id: "dogfood", label: "Dog food", emoji: "BONE", pricePawly: 15 },
  { id: "seed", label: "Bird / farm feed", emoji: "WHEAT", pricePawly: 12 },
  { id: "veg", label: "Herbivore mix", emoji: "LEAF", pricePawly: 12 },
  { id: "bug", label: "Insect / reptile feed", emoji: "GRAPE", pricePawly: 12 },
  { id: "deluxe", label: "Deluxe bowl", emoji: "BENTO", pricePawly: 30 },
];
'''.replace("COOKIE","\U0001f36a").replace("FISH","\U0001f41f").replace("BONE","\U0001f9b4").replace("WHEAT","\U0001f33e").replace("LEAF","\U0001f96c").replace("GRAPE","\U0001f347").replace("BENTO","\U0001f371")
FOODS = FOODS.encode("utf-8").decode("unicode_escape") if "\\U" in FOODS else FOODS
# simpler literals
FOODS = """
const FOODS = [
  { id: "snack", label: "Treat / snack", emoji: "\N{COOKIE}", pricePawly: 10 },
  { id: "catfood", label: "Cat food", emoji: "\N{FISH}", pricePawly: 15 },
  { id: "dogfood", label: "Dog food", emoji: "\N{BONE}", pricePawly: 15 },
  { id: "seed", label: "Bird / farm feed", emoji: "\N{EAR OF RICE}", pricePawly: 12 },
  { id: "veg", label: "Herbivore mix", emoji: "\N{LEAFY GREEN}", pricePawly: 12 },
  { id: "bug", label: "Insect / reptile feed", emoji: "\N{GRAPES}", pricePawly: 12 },
  { id: "deluxe", label: "Deluxe bowl", emoji: "\N{BENTO BOX}", pricePawly: 30 },
];
"""
if "const FOODS" not in t:
    t = t.replace("const TITLE:", FOODS + "const TITLE:", 1)

if "const [shopView" not in t:
    t = t.replace(
        '  const [scene, setScene] = useState<SceneId>("street");',
        '  const [scene, setScene] = useState<SceneId>("street");\n  const [shopView, setShopView] = useState<"home" | "adopt" | "food">("home");\n  const [focusId, setFocusId] = useState("");\n  const [feedWarn, setFeedWarn] = useState(false);\n  const [congrats, setCongrats] = useState("");',
        1,
    )

# street avatars clickable
old_av = '''            {pets.length ? pets.map((p) => (
              <div key={p.id} style={{ textAlign: "center" }}>
                <PetRig pet={{ species: p.species, level: Number((p as { level?: number }).level || 0), emoji: p.emoji }} size={88} />
                <div style={{ fontSize: 11, fontWeight: 800 }}>{p.name}</div>
              </div>
            )) : <div style={{ color: "#8aa", fontSize: 12 }}>Adopt in Shop to see your 3D pet here.</div>}'''
new_av = '''            {pets.length ? pets.map((p) => (
              <button key={p.id} type="button" onClick={() => { setFocusId(p.id); setFeedWarn(true); }} style={{ background: "transparent", border: "none", color: "#e8eef7" }}>
                <PetRig pet={{ species: p.species, level: Number((p as { level?: number }).level || 0), emoji: p.emoji }} size={96} />
                <div style={{ fontSize: 11, fontWeight: 800 }}>{p.name}</div>
                <div style={{ fontSize: 10, color: "#9f8" }}>tap to feed</div>
              </button>
            )) : <div style={{ color: "#8aa", fontSize: 12 }}>Adopt in Shop to see your pet here.</div>}'''
if old_av in t:
    t = t.replace(old_av, new_av, 1)

# shop row add Street + reset shopView
t = t.replace(
    "{SHOPS.map((s) => (\n            <button key={s.id} type=\"button\" onClick={() => { setScene(s.id); setNote(\"\"); }}",
    '''<button type="button" onClick={() => { setScene("street"); setShopView("home"); setNote(""); }} style={{ ...ghost, flex: "0 0 auto", background: scene === "street" ? "rgba(0,255,157,0.28)" : ghost.background }}>Street</button>
          {SHOPS.map((s) => (
            <button key={s.id} type="button" onClick={() => { setScene(s.id); setShopView("home"); setNote(""); }}''',
    1,
)

# remove emoji strip + catalog on street
t = t.replace(
    '{pets.length ? <div style={{ fontSize: 12, marginBottom: 6 }}>{pets.map((p) => p.emoji + p.name).join("  ")}</div> : null}',
    "{scene !== \"street\" && pets.length ? <div style={{ fontSize: 12, marginBottom: 6 }}>{pets.map((p) => p.emoji + p.name).join(\"  \")}</div> : null}",
    1,
)

old_cat = '''        {(scene === "street" || scene === "shop") && (
          <div>
            <div style={{ color: "#9aa", fontSize: 11, marginBottom: 4 }}>Pick a pet · pay PAWLY · max 10</div>
            {COMPANIONS.map((c) => ('''
new_cat = '''        {scene === "shop" && shopView === "home" && (
          <div>
            <button type="button" style={{ ...primary, width: "100%", marginBottom: 8 }} onClick={() => setShopView("adopt")}>Choose your pets</button>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => setShopView("food")}>Pets food</button>
          </div>
        )}
        {scene === "shop" && shopView === "adopt" && (
          <div>
            <button type="button" style={{ ...ghost, marginBottom: 8 }} onClick={() => setShopView("home")}>← Shop</button>
            <div style={{ color: "#9aa", fontSize: 11, marginBottom: 4 }}>Choose your pets · max 10</div>
            {COMPANIONS.map((c) => ('''
if old_cat in t:
    t = t.replace(old_cat, new_cat, 1)

# after companions block there is `        )}`  then shelter. Insert food view before shelter.
food_block = '''
        {scene === "shop" && shopView === "food" && (
          <div>
            <button type="button" style={{ ...ghost, marginBottom: 8 }} onClick={() => setShopView("home")}>← Shop</button>
            <div style={{ color: "#9aa", fontSize: 11, marginBottom: 4 }}>Pets food · 10–30 PAWLY · auto feed after pay</div>
            {FOODS.map((c) => (
              <button key={c.id} type="button" style={rowBtn} onClick={() => openCart({ title: c.label, amount: c.pricePawly, kind: "food", emoji: c.emoji, petId: focusId || (pets[0] && pets[0].id) || undefined })}>
                <span>{c.emoji + " " + c.label}</span><span>{c.pricePawly} PAWLY</span>
              </button>
            ))}
          </div>
        )}
'''
if "shopView === \"food\"" not in t:
    t = t.replace(
        '{scene === "shelter" && (',
        food_block + '        {scene === "shelter" && (',
        1,
    )

# confirmPay food + grant fields
if 'cart.kind === "food"' not in t:
    t = t.replace(
        '      grantAdopt(cart, sig);',
        '''      grantAdopt(cart, sig);
      if (cart.kind === "food" || cart.kind === "feed") {
        const id = cart.petId || focusId || (pets[0] && pets[0].id) || "";
        if (id) {
          const next = pets.map((p) => {
            if (p.id !== id) return p;
            const total = Number(p.feedsTotal || 0) + 1;
            const today = new Date().toISOString().slice(0, 10);
            const same = String(p.feedDay || "") === today;
            const todayN = same ? Number(p.feedsToday || 0) + 1 : 1;
            return { ...p, feedsTotal: total, feedsToday: todayN, feedDay: today, level: Math.floor(total / 10) };
          });
          setPets(next);
          savePets(addr, next);
          const fed = next.find((p) => p.id === id);
          const left = fed ? 10 - (Number(fed.feedsTotal || 0) % 10) : 9;
          setCongrats("Fed once. " + left + " more feeds to next level. Today " + (fed && fed.feedsToday ? fed.feedsToday : 1) + "/3.");
        }
      }''',
        1,
    )

# feed warn + congrats modals before cart modal
if "feedWarn &&" not in t:
    modal = '''
      {feedWarn ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 5, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => setFeedWarn(false)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>Feed this pet</div>
            <div style={{ fontSize: 13, margin: "8px 0 12px" }}>Max 3 feeds per day. Each feed 10–30 PAWLY. 10 feeds = 1 level.</div>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => { setFeedWarn(false); setScene("shop"); setShopView("food"); }}>Go to Pets food</button>
            <button type="button" style={{ ...ghost, width: "100%", marginTop: 8 }} onClick={() => setFeedWarn(false)}>Cancel</button>
          </div>
        </div>
      ) : null}
      {congrats ? (
        <div style={{ position: "absolute", inset: 0, zIndex: 6, background: "rgba(0,0,0,0.62)", display: "flex", alignItems: "flex-end" }} onClick={() => setCongrats("")}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", background: "#101820", borderRadius: "16px 16px 0 0", padding: 16 }}>
            <div style={{ color: "#00ff9d", fontWeight: 800 }}>Fed!</div>
            <div style={{ margin: "8px 0 12px" }}>{congrats}</div>
            <button type="button" style={{ ...primary, width: "100%" }} onClick={() => { setCongrats(""); setScene("street"); }}>Back to street</button>
          </div>
        </div>
      ) : null}
'''
    t = t.replace("{cart ? (", modal + "      {cart ? (", 1)

p.write_text(t)
print("size", p.stat().st_size)
for k in ["v0.10.1", "Choose your pets", "Pets food", "shopView", "FOODS", "feedWarn", "Go to Pets food"]:
    print(k, k in t)
