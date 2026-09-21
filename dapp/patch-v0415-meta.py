#!/usr/bin/env python3
"""Apply Pet Hub v0.4.16 mint-retry wiring before tsc."""
from pathlib import Path
root = Path(__file__).resolve().parent
src = root / "src"
if not src.exists():
    src = Path("dapp/src")

def patch_path(p: Path, pairs):
    if not p.exists():
        print("skip missing", p)
        return
    t = p.read_text()
    orig = t
    for a, b in pairs:
        t = t.replace(a, b)
    if t != orig:
        p.write_text(t)
        print("patched", p)
    else:
        print("no change", p)

patch_path(src / "petHub.tsx", [
    ("v0.4.14", "v0.4.16"),
    ("v0.4.15", "v0.4.16"),
    ("PAWLY till + Studio (parts + doodle + 0-dec mint).", "PAWLY till + Studio + on-chain mint retry."),
    ("PAWLY till + Studio + Metaplex metadata for Magic Eden / Tensor.", "PAWLY till + Studio + on-chain mint retry."),
])

patch_path(src / "petHubStudio.tsx", [
    ('import { mintStudioToken } from "./petHubMintOnchain";',
     'import { mintHubNft } from "./petHubMintOnchain";\nimport { nftImageOf } from "./petHubMeta";'),
    ("        const on = await mintStudioToken({",
     "        const on = await mintHubNft({"),
    ("          paySig: sig,\n          wallet: props.wallet as never,",
     "          paySig: sig,\n          species: label,\n          source: \"studio\",\n          image: nftImageOf(label, body),\n          wallet: props.wallet as never,"),
    ("      } catch {\n        memoSig = \"\";\n      }",
     "      } catch (e) {\n        const extra = e as { mint?: string; sig?: string; message?: string };\n        if (extra && extra.mint) { mint = extra.mint; memoSig = extra.sig || \"\"; }\n        props.setNote(String(extra && extra.message || e));\n      }"),
    ("On-chain 0-dec mint + memo when wallet can sign.",
     "Pay 80 once. If mint missed, use Retry mint on the card. Do not open Tensor until Solscan Token exists."),
    ('props.setNote(mint ? "Studio NFT minted on-chain" : "Studio NFT saved (chain mint skipped)");',
     'props.setNote(mint ? "Studio mint live. Open Solscan Token before Magic Eden / Tensor." : "Paid. Card saved. Tap Retry mint — no second 80.");'),
])

patch_path(src / "petHubStalls.tsx", [
    ('import { StudioPanel } from "./petHubStudio";',
     'import { StudioPanel } from "./petHubStudio";\nimport { mintHubNft } from "./petHubMintOnchain";\nimport { marketLinks } from "./petHubMeta";'),
    ("      const nft = makeNft({ owner: addr, a, b, sig });\n      const nextPets = props.pets.filter((p) => p.id !== a.id && p.id !== b.id);",
     "      const nft = makeNft({ owner: addr, a, b, sig });\n      try {\n        props.setNote(\"Signing on-chain mint...\");\n        const on = await mintHubNft({\n          owner: props.wallet.publicKey,\n          label: nft.name,\n          paySig: sig,\n          species: nft.species,\n          source: \"breed\",\n          wallet: props.wallet as never,\n          signTransaction: props.wallet.signTransaction,\n        });\n        nft.mint = on.mint;\n        nft.memoSig = on.sig;\n      } catch (e) {\n        const extra = e as { mint?: string; sig?: string; message?: string };\n        if (extra && extra.mint) { nft.mint = extra.mint; nft.memoSig = extra.sig || \"\"; }\n        props.setNote(String(extra && extra.message || e));\n      }\n      const nextPets = props.pets.filter((p) => p.id !== a.id && p.id !== b.id);"),
    ('                <div style={{ fontSize: 10, color: "#9f8" }}>{"g" + Number(n.gen || 1) + " \\u00b7 " + priceLabel(n)}</div>\n              </div>\n              {n.listed',
     '                <div style={{ fontSize: 10, color: "#9f8" }}>{"g" + Number(n.gen || 1) + " \\u00b7 " + priceLabel(n)}</div>\n                {n.mint ? (\n                  <div style={{ display: "flex", gap: 6, marginTop: 2 }}>\n                    {marketLinks(n.mint).map((l) => (\n                      <button key={l.label} type="button" style={{ ...tiny, padding: "2px 6px", fontSize: 9 }} onClick={() => window.open(l.href, "_blank")}>{l.label}</button>\n                    ))}\n                  </div>\n                ) : null}\n              </div>\n              {!n.mint\n                ? <button type="button" style={tiny} disabled={props.busy} onClick={() => void (async () => {\n                    if (!props.wallet.publicKey) { props.setNote("Connect wallet in dApp first"); return; }\n                    props.setBusy(true); props.setNote("Retry mint — no extra PAWLY");\n                    try {\n                      const on = await mintHubNft({\n                        owner: props.wallet.publicKey,\n                        label: nftSpriteName(n),\n                        paySig: n.breedSig || n.memoSig || n.id,\n                        species: n.species,\n                        source: (n.source === "studio" ? "studio" : "breed"),\n                        wallet: props.wallet as never,\n                        signTransaction: props.wallet.signTransaction,\n                      });\n                      flush(s.myStall, s.myNfts.map((x) => x.id === n.id ? { ...x, mint: on.mint, memoSig: on.sig } : x));\n                      props.setLastSig(on.sig); props.setNote("Mint live. Check Solscan Token first.");\n                    } catch (e) {\n                      const extra = e as { mint?: string; sig?: string; message?: string };\n                      if (extra && extra.mint) {\n                        flush(s.myStall, s.myNfts.map((x) => x.id === n.id ? { ...x, mint: extra.mint, memoSig: extra.sig || x.memoSig } : x));\n                      }\n                      props.setNote(String(extra && extra.message || e));\n                    } finally { props.setBusy(false); }\n                  })()}>Retry mint</button>\n                : n.listed'),
])
print("v0.4.16 patch done")
