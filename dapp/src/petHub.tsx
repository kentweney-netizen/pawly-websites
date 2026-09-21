/**
 * PAWLY Pet Hub v0.4.14 — PAWLY till + Studio (parts + doodle + 0-dec mint).
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Connection, PublicKey, VersionedTransaction } from "@solana/web3.js";
import { usePawlyWallet } from "./localWallet";
import { PetRig, PET_RIG_CSS } from "./petAvatar";
import {
  PET_SLOT_CAP, FEED_DAY_MAX, sgDay, feedsTodayOf, pickFeedPet,
  loadPets, savePets, mergePetLists, pullCloudPets, loadEmail, saveEmail,
  drawPetPhotoPng, drawCertPng, downloadDataUrl, asset, fetchHubPx, payHub, requireHubPaySuccess, HUB_POOL,
  COMPANIONS, RESCUES, FOODS, TITLE, SHOPS, CLIP, ghost, primary, rowBtn,
} from "./petHubLib";
import type { SceneId, PetRec, CartItem, CertJob, PayCoin } from "./petHubLib";
import { StallLayer } from "./petHubStalls";

const VER = "v0.4.14";
const BGM_MP3 = asset("we-love-animals.mp3");
const BGM_WAV = asset("we-love-animals.wav");
