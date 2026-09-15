import React from "react";

export type PetRigPet = {
  species: string;
  level: number;
  emoji?: string;
  name?: string;
};

export function PetRig(props: { pet: PetRigPet; size?: number; moving?: boolean }) {
  const size = props.size || 88;
  const face = props.pet.emoji || "🐾";
  return (
    <div
      className={props.moving ? "pawly-rig pawly-bob" : "pawly-rig"}
      style={{ fontSize: size * 0.72, lineHeight: 1, textAlign: "center" }}
    >
      {face}
    </div>
  );
}

export const PET_RIG_CSS = `
.pawly-rig { display: inline-block; line-height: 0; vertical-align: bottom; }
.pawly-bob { animation: pawly-step 0.28s steps(2) infinite; }
.pawly-stroll { position: absolute; pointer-events: none; z-index: 4; }
@keyframes pawly-step {
  0% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
  100% { transform: translateY(0); }
}
`;
