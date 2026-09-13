#!/usr/bin/env python3
from pathlib import Path
p = Path("dapp/src/petHub.tsx")
t = p.read_text()
t = t.replace(
    " * PAWLY Pet Hub v0.10.2 — cert/photo in-app download, no email send.",
    " * PAWLY Pet Hub v0.10.3 — 3 feeds/day hard cap per pet.",
)
if "FEED_DAY_MAX" not in t:
    t = t.replace(
        "export const PET_SLOT_CAP = 10;\n",
        '''export const PET_SLOT_CAP = 10;
export const FEED_DAY_MAX = 3;
function sgDay() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
}
function feedsTodayOf(p?: { feedDay?: string; feedsToday?: number } | null) {
  if (!p) return 0;
  return String(p.feedDay || "") === sgDay() ? Number(p.feedsToday || 0) : 0;
}
function pickFeedPet(list: PetRec[], id?: string) {
  return list.find((x) => x.id === id) || list[0];
}
''',
        1,
    )

t = t.replace(
    "  const openCart = (item: CartItem) => {\n    setNote(\"\");\n    setCart(item);\n  };",
    '''  const openCart = (item: CartItem) => {
    setNote("");
    if (item.kind === "food" || item.kind === "feed") {
      const pet = pickFeedPet(pets, item.petId || focusId);
      if (!pet) {
        setNote("Adopt a pet first / 先领养");
        return;
      }
      const n = feedsTodayOf(pet);
      if (n >= FEED_DAY_MAX) {
        setNote(pet.name + " already fed " + FEED_DAY_MAX + "/" + FEED_DAY_MAX + " today. Come back tomorrow / 今日已喂满 3 次");
        return;
      }
    }
    setCart(item);
  };''',
    1,
)

if "already fed" not in t[t.find("const confirmPay"):t.find("const confirmPay")+900]:
    t = t.replace(
        "    if (cart.kind === \"rescue\" && cart.amount < 10) {\n      setNote(\"Rescue starts at 10 PAWLY\");\n      return;\n    }",
        '''    if (cart.kind === "rescue" && cart.amount < 10) {
      setNote("Rescue starts at 10 PAWLY");
      return;
    }
    if (cart.kind === "food" || cart.kind === "feed") {
      const pet = pickFeedPet(pets, cart.petId || focusId);
      if (!pet) {
        setNote("Adopt a pet first / 先领养");
        return;
      }
      if (feedsTodayOf(pet) >= FEED_DAY_MAX) {
        setNote(pet.name + " already fed " + FEED_DAY_MAX + "/" + FEED_DAY_MAX + " today. Come back tomorrow / 今日已喂满 3 次");
        setCart(null);
        return;
      }
    }''',
        1,
    )

t = t.replace(
    'onClick={() => { setFeedWarn(false); setScene("shop"); setShopView("food"); }}',
    '''onClick={() => {
              const pet = pickFeedPet(pets, focusId);
              const n = feedsTodayOf(pet);
              if (!pet) { setFeedWarn(false); setNote("Adopt a pet first / 先领养"); return; }
              if (n >= FEED_DAY_MAX) {
                setFeedWarn(false);
                setNote(pet.name + " already fed " + n + "/" + FEED_DAY_MAX + " today. Come back tomorrow / 今日已喂满 3 次");
                return;
              }
              setFeedWarn(false);
              setScene("shop");
              setShopView("food");
            }}''',
    1,
)

t = t.replace(
    "Pets food · 10–30 PAWLY · auto feed after pay",
    '''Pets food · 10–30 PAWLY · {feedsTodayOf(pickFeedPet(pets, focusId))}/''' + "{FEED_DAY_MAX} today",
    1,
)
# that replace may have broken JSX string - fix to template in JSX
t = t.replace(
    "Pets food · 10–30 PAWLY · {feedsTodayOf(pickFeedPet(pets, focusId))}/{FEED_DAY_MAX} today",
    'Pets food · 10–30 PAWLY · {String(feedsTodayOf(pickFeedPet(pets, focusId)))}/{FEED_DAY_MAX} today',
    1,
)

p.write_text(t)
print("v0103", "v0.10.3" in t)
print("FEED_DAY_MAX", "FEED_DAY_MAX" in t)
print("openCart cap", "already fed" in t)
