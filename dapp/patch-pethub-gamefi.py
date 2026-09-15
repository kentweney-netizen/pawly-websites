#!/usr/bin/env python3
from pathlib import Path
p = Path(__file__).resolve().parent / "src" / "petHub.tsx"
t = p.read_text()

def once(old, new, label):
    global t
    if old in t:
        t = t.replace(old, new, 1)
        print(label)
    else:
        print("skip", label)

once(
    'import { PetRig, PET_RIG_CSS } from "./petAvatar";',
    'import { PetRig, PET_RIG_CSS } from "./petAvatar";\nimport { PetHubGameFiDock } from "./petHubNft";\nimport { BREED_PAWLY, LIST_FEE_PAWLY, MINT_PAWLY } from "./petHubGameFi";',
    "import gamefi",
)
once(
    '  const [shopView, setShopView] = useState<"home" | "adopt" | "food">("home");',
    '  const [shopView, setShopView] = useState<"home" | "adopt" | "food">("home");\n  const [desk, setDesk] = useState<"" | "nft" | "market" | "breed">("");',
    "desk state",
)

pay_fn = '''
  const payDesk = async (title: string, amount: number) => {
    if (!wallet.publicKey || !wallet.sendTransaction) throw new Error("Connect wallet in dApp first / 先在 dApp 连钱包");
    const q = quoteCoin(amount, payCoin, px);
    if (payCoin !== "PAWLY" && q.amount <= 0) throw new Error("No live price / 拉不到价，改用 PAWLY");
    const sig = await payHubToken({
      from: wallet.publicKey,
      pawlyList: amount,
      coin: payCoin,
      coinAmount: q.amount,
      sendTransaction: wallet.sendTransaction,
      signTransaction: wallet.signTransaction,
    });
    saveLedger(addr, { t: Date.now(), title, amount, sig, scene, kind: title });
    return sig;
  };
'''
once(
    "  const openCart = (item: CartItem) => {",
    pay_fn + "  const openCart = (item: CartItem) => {",
    "payDesk",
)

once(
    '{SHOPS.map((s) => (',
    '''<button type="button" onClick={() => { setDesk(desk === "nft" ? "" : "nft"); setNote(""); }} style={{ ...ghost, flex: "0 0 auto", background: desk === "nft" ? "rgba(0,255,157,0.28)" : ghost.background }}>NFT</button>
          <button type="button" onClick={() => { setDesk(desk === "market" ? "" : "market"); setNote(""); }} style={{ ...ghost, flex: "0 0 auto", background: desk === "market" ? "rgba(0,255,157,0.28)" : ghost.background }}>Market</button>
          <button type="button" onClick={() => { setDesk(desk === "breed" ? "" : "breed"); setNote(""); }} style={{ ...ghost, flex: "0 0 auto", background: desk === "breed" ? "rgba(0,255,157,0.28)" : ghost.background }}>Breed</button>
          {SHOPS.map((s) => (''',
    "nav buttons",
)

once(
    '{scene === "shop" && shopView === "home" && (',
    '''{desk ? (
          <PetHubGameFiDock
            desk={desk}
            addr={addr}
            pets={pets}
            busy={busy}
            onMint={async (pet) => payDesk("Mint NFT " + pet.name, MINT_PAWLY)}
            onList={async (nft, _price, fee) => payDesk("List NFT " + nft.name, fee || LIST_FEE_PAWLY)}
            onBuy={async (row) => payDesk("Buy NFT " + row.name, Number(row.pricePawly || 0))}
            onBreed={async (a, b) => {
              const sig = await payDesk("Breed " + a.name + " x " + b.name, BREED_PAWLY);
              if (pets.length >= PET_SLOT_CAP) return sig;
              const baby = {
                id: "pet_egg_" + Date.now(),
                kind: "adopted",
                species: a.species,
                name: (a.name.split(" ")[0] || "Pup") + " Jr",
                emoji: a.emoji,
                hunger: 60,
                health: 70,
                streak: 0,
                pricePawly: BREED_PAWLY,
                sig,
                feedsTotal: 0,
                level: 0,
              };
              const next = [...pets, baby];
              setPets(next);
              savePets(addr, next);
              return sig;
            }}
          />
        ) : null}
        {scene === "shop" && shopView === "home" && !desk && (''',
    "dock render",
)

p.write_text(t)
print("ok", p)
