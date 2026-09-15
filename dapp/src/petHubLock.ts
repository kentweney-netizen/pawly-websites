/** FROZEN Pet Hub GameFi contract. Later upgrades only ADD / UNLOCK.
 * Do not change art pipeline, walk animation, economy numbers, or entry.
 */
export const PET_HUB_LOCK = {
  version: "1.0",
  lockedAt: "2026-09-15",
  entry: "dapp home pawly-token-helps -> /pet + current wallet",
  world: {
    plate: "pet-hub-street.mp4 shared overworld",
    actors: "only this wallet Lv1+ pixel sprites walk the road",
    lv0: "collection card heads only, never street overlay",
    noBake: "do not hard-bake player pets into the shared plate",
    noStreetVideo: "never overlay grown 3D mp4 on the street",
  },
  rooms: ["shop", "hospital", "shelter", "hotel", "groom", "park"] as const,
  economy: {
    emitPawly: false,
    mintLv: 1,
    mintPawly: 80,
    listFeePawly: 15,
    breedLv: 2,
    breedPawly: 200,
    breedCoolHours: 48,
    feedDayMax: 3,
    slotCap: 10,
    till: "BPFiVa5trVtS9CQcaeQ9aNA8ZpBAbbvH8qcyZ3FR4C7Z",
  },
} as const;
