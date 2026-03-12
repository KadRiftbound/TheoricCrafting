// ============================================================
// RIFTBOUND GAME ENGINE v2 — Rules-Accurate
// Based on official Riftbound Core Rules v1.1
// ============================================================

export type Domain = 'Fury' | 'Hope' | 'Glory' | 'Cunning' | 'Knowledge' | 'Order' | 'Void' | 'Chaos' | 'Colorless';
export type CardType = 'Champion' | 'Unit' | 'Spell' | 'Gear' | 'Signature' | 'Rune';
export type Rarity = 'Champion' | 'Epic' | 'Rare' | 'Uncommon' | 'Common';
export type Phase = 'awaken' | 'beginning' | 'channel' | 'draw' | 'action' | 'end';
export type Zone = 'hand' | 'deck' | 'runeDeck' | 'base' | 'battlefield' | 'trash' | 'banished' | 'legendZone' | 'championZone' | 'runePool';
export type TurnState = 'open' | 'closed' | 'showdown';

// --- Card ---
export interface GameCard {
  uid: string;           // unique instance id
  id: string;            // card definition id
  name: string;
  type: CardType;
  domain: Domain;
  energyCost: number;    // top-left cost
  powerCost: number;     // power cost (domain-specific)
  powerDomain?: Domain;  // which domain for power cost
  might: number;         // attack
  power: number;         // defense/health
  rules: string;
  rarity: Rarity;
  imageUrl?: string;
  // board state
  zone: Zone;
  isExhausted: boolean;
  damage: number;
  canAttack: boolean;    // ready to declare attack
  tapped: boolean;       // moved to battlefield
  keywords: string[];
}

// --- Rune ---
export interface Rune {
  uid: string;
  domain: Domain;
  zone: 'runeDeck' | 'runePool';
  isExhausted: boolean;  // exhausted = used for energy
  isRecycled: boolean;   // recycled = went to bottom of rune deck
}

// --- Battlefield (shared zone) ---
export interface BattlefieldZone {
  id: string;
  name: string;
  controller: 'player' | 'opponent' | null;
  contested: boolean;
  playerUnits: GameCard[];
  opponentUnits: GameCard[];
  victoryModifier: number; // some battlefields add +1 to victory score
}

// --- Player State ---
export interface PlayerState {
  id: 'player' | 'opponent';
  name: string;
  score: number;
  hand: GameCard[];
  deck: GameCard[];
  trash: GameCard[];
  banished: GameCard[];
  base: GameCard[];          // units/gear on base
  runeDeck: Rune[];
  runePool: Rune[];          // channeled runes this turn
  legend: { name: string; domain: Domain; ability: string } | null;
  champion: GameCard | null; // champion zone
  energyPool: number;        // calculated from exhausted runes
  powerPool: Record<Domain, number>; // domain -> power
}

// --- Game State ---
export interface GameState {
  id: string;
  player: PlayerState;
  opponent: PlayerState;
  battlefield: BattlefieldZone;
  turn: number;
  activePlayer: 'player' | 'opponent';
  phase: Phase;
  turnState: TurnState;
  victoryScore: number;      // default 8, can be modified
  gameOver: boolean;
  winner: 'player' | 'opponent' | null;
  log: string[];
  chain: ChainItem[];        // current chain
}

export interface ChainItem {
  id: string;
  sourceId: string;
  type: 'spell' | 'ability' | 'trigger';
  description: string;
  owner: 'player' | 'opponent';
}

// ============================================================
// CARD DATABASE (starter cards)
// ============================================================

function uid(): string {
  return Math.random().toString(36).substring(2, 11);
}

const CARD_TEMPLATES: Omit<GameCard, 'uid' | 'zone' | 'isExhausted' | 'damage' | 'canAttack' | 'tapped'>[] = [
  // Champions
  { id: 'ahri', name: 'Ahri, Nine-Tailed', type: 'Champion', domain: 'Cunning', energyCost: 4, powerCost: 0, might: 3, power: 3, rules: 'Fox-Fire: When Ahri attacks, deal 1 damage to the enemy player.', rarity: 'Champion', keywords: [] },
  { id: 'darius', name: 'Darius, Trifarian', type: 'Champion', domain: 'Fury', energyCost: 5, powerCost: 0, might: 4, power: 4, rules: 'Trifarian: +2 Attack for each other Fury unit you control.', rarity: 'Champion', keywords: [] },
  { id: 'lux', name: 'Lux, Lady of Luminosity', type: 'Champion', domain: 'Knowledge', energyCost: 4, powerCost: 0, might: 3, power: 3, rules: 'Light Binding: When Lux attacks, deal 1 damage for each spell played this turn.', rarity: 'Champion', keywords: [] },
  { id: 'jinx', name: 'Jinx, Loose Cannon', type: 'Champion', domain: 'Cunning', energyCost: 3, powerCost: 0, might: 2, power: 3, rules: 'Get Excited: When Jinx attacks, draw a card.', rarity: 'Champion', keywords: [] },
  { id: 'draven', name: 'Draven, Glorious Executioner', type: 'Champion', domain: 'Fury', energyCost: 5, powerCost: 0, might: 4, power: 4, rules: 'Spinning Axe: When Draven attacks, create a Spinning Axe spell.', rarity: 'Champion', keywords: [] },
  { id: 'irelia', name: 'Irelia, Blade Dancer', type: 'Champion', domain: 'Order', energyCost: 4, powerCost: 0, might: 4, power: 3, rules: 'Blade Dancer: Each spell you play creates a 1/1 Blade Surge unit.', rarity: 'Champion', keywords: [] },
  // Units
  { id: 'noxus-hopeful', name: 'Noxus Hopeful', type: 'Unit', domain: 'Fury', energyCost: 2, powerCost: 0, might: 2, power: 1, rules: 'When played: draw a card.', rarity: 'Common', keywords: [] },
  { id: 'pouty-poro', name: 'Pouty Poro', type: 'Unit', domain: 'Hope', energyCost: 1, powerCost: 0, might: 1, power: 1, rules: 'When played: restore 1 health.', rarity: 'Common', keywords: [] },
  { id: 'ironback-patrol', name: 'Ironback Patrol', type: 'Unit', domain: 'Order', energyCost: 3, powerCost: 0, might: 2, power: 3, rules: 'Defender.', rarity: 'Uncommon', keywords: ['Defender'] },
  { id: 'tideturner', name: 'Tideturner', type: 'Unit', domain: 'Fury', energyCost: 2, powerCost: 0, might: 2, power: 2, rules: 'Overwhelm.', rarity: 'Uncommon', keywords: ['Overwhelm'] },
  { id: 'treasure-hunter', name: 'Treasure Hunter', type: 'Unit', domain: 'Cunning', energyCost: 2, powerCost: 0, might: 1, power: 2, rules: 'When played: draw a card.', rarity: 'Common', keywords: [] },
  { id: 'overzealous-fan', name: 'Overzealous Fan', type: 'Unit', domain: 'Fury', energyCost: 1, powerCost: 0, might: 2, power: 1, rules: 'Reckless: Attacks each turn if able.', rarity: 'Common', keywords: ['Reckless'] },
  { id: 'darius-trifarian', name: 'Darius, Trifarian', type: 'Unit', domain: 'Fury', energyCost: 4, powerCost: 0, might: 4, power: 3, rules: 'Overwhelm.', rarity: 'Rare', keywords: ['Overwhelm'] },
  { id: 'brynhir', name: 'Brynhir Thundersong', type: 'Unit', domain: 'Fury', energyCost: 3, powerCost: 0, might: 3, power: 2, rules: 'When this attacks: deal 1 damage to opponent.', rarity: 'Rare', keywords: [] },
  // Spells
  { id: 'cleave', name: 'Cleave', type: 'Spell', domain: 'Fury', energyCost: 2, powerCost: 0, might: 0, power: 0, rules: 'Deal 3 damage to a unit.', rarity: 'Common', keywords: [] },
  { id: 'strike', name: 'Strike', type: 'Spell', domain: 'Fury', energyCost: 1, powerCost: 0, might: 0, power: 0, rules: 'Deal 2 damage to a unit.', rarity: 'Common', keywords: [] },
  { id: 'rally', name: 'Rally', type: 'Spell', domain: 'Glory', energyCost: 2, powerCost: 0, might: 0, power: 0, rules: 'Give all your units +1/+1 until end of turn.', rarity: 'Uncommon', keywords: [] },
  { id: 'flash', name: 'Flash of Brilliance', type: 'Spell', domain: 'Knowledge', energyCost: 1, powerCost: 0, might: 0, power: 0, rules: 'Draw 2 cards.', rarity: 'Rare', keywords: [] },
  { id: 'spinning-axe', name: 'Spinning Axe', type: 'Spell', domain: 'Fury', energyCost: 1, powerCost: 0, might: 0, power: 0, rules: 'Deal 1 damage. Draw a card.', rarity: 'Uncommon', keywords: [] },
  { id: 'stacked-deck', name: 'Stacked Deck', type: 'Spell', domain: 'Fury', energyCost: 2, powerCost: 0, might: 0, power: 0, rules: 'Look at the top 3 cards. Draw 1, discard the rest.', rarity: 'Rare', keywords: [] },
  { id: 'falling-star', name: 'Falling Star', type: 'Spell', domain: 'Cunning', energyCost: 3, powerCost: 0, might: 0, power: 0, rules: 'Deal 4 damage to a unit.', rarity: 'Rare', keywords: [] },
  // Gear
  { id: 'edge-of-night', name: 'Edge of Night', type: 'Gear', domain: 'Fury', energyCost: 2, powerCost: 0, might: 0, power: 0, rules: 'Equipped unit gets +2 Attack.', rarity: 'Uncommon', keywords: [] },
];



const CARD_IMAGE_MAP: Record<string,string> = {
  "blazing scorcher": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/15ed971e4029a92b362a81ccadf309fb81e40b81-744x1039.png",
  "brazen buccaneer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/d481971f7560e7235e7d6934767da18daa019eff-744x1039.png",
  "chemtech enforcer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/19dcf211457d9c9c6e9ea0cd32af76c2c92a3160-744x1039.png",
  "cleave": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/95d476a1e88ff547fb846149619177bc7e3cea9f-744x1039.png",
  "disintegrate": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a27374ac3a81f3dfefb43c3c3237c23b4883cb5a-744x1039.png",
  "flame chompers": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/1f6f5ebd18e5daac30d62626fddd785c4b457c2b-744x1039.png",
  "fury rune": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/09da06c69d07d4e72dde703737ef167472c715af-1488x2078.png",
  "get excited!": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/2906c932c482af17fbb2979a8c42a6992f95d6a6-744x1039.png",
  "hextech ray": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/1e7d12693822c38377ddc8f15db23e2f9b6d560a-744x1039.png",
  "legion rearguard": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/aedece01c7792c689050460db1670e6b9b15b61f-744x1039.png",
  "magma wurm": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f6565b15f65f538804e6a56623c8aa2eedeffc22-744x1039.png",
  "noxus hopeful": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c3bb6f4cb58feeb50e396d12ec9865c5434025af-744x1039.png",
  "pouty poro": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/d541bf3bcb5aa3ad0d48d87f5753569b72ac426f-744x1039.png",
  "sky splitter": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/01faae468720dd5bf5e3fe12ba56c01af70263be-744x1039.png",
  "captain farron": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/4c65e2cae6748590f589ad8b26bc5a20c0d770c2-744x1039.png",
  "dangerous duo": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3c02ea9e438d407c739276b788e015ac93843651-744x1039.png",
  "iron ballista": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9b5cfe757b6067994e17e284eba46433880a1461-744x1039.png",
  "noxus saboteur": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b78f0c822cb984db24ac3f1956cc8c10f8f88b22-744x1039.png",
  "raging soul": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/037647d0decc94ff4a5d53b11cf36afe9d849533-744x1039.png",
  "scrapyard champion": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/10f096d2b469fd73329386e5efe88c9bec667d7c-744x1039.png",
  "sun disc": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/146d7514f15e6674f471f3aa9c3fadf22c0b634b-744x1039.png",
  "thermo beam": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/88661e852b864491e6d7f5f087caf4263f61c361-744x1039.png",
  "unlicensed armory": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/1a80bedd893d9024fc90f108da36b4fd1d496ad6-744x1039.png",
  "void seeker": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/5b64b63c6be58ff3c33c7fb3c2dcb168d64e287e-744x1039.png",
  "blind fury": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/d74ba4998df9348408f1400090a0b0737c675fbd-744x1039.png",
  "brynhir thundersong": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/44e805aa0f2928acf1156eef692403df319b333a-744x1039.png",
  "darius, trifarian": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/bf7a4900fd2296972c1305a4707c23860bb0522e-744x1039.png",
  "draven, showboat": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7600d6cea66e8146ea2202f72cb9035cb44608a3-744x1039.png",
  "falling star": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9cf2d2e59e1bf839cdf5c2a77e95f5d1e871788f-744x1039.png",
  "jinx, demolitionist": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/d6cac988aa7798945e550eba6841d3993868c4a4-744x1039.png",
  "raging firebrand": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9566fc064c098bd7f3540f3074dc6353c7ca5663-744x1039.png",
  "ravenborn tome": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/81f968126026635e5b9a2fa1048fc979fcd13a1d-744x1039.png",
  "shakedown": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ab71d92c94bf609e2fa6efc8fec06fe1e8b10108-744x1039.png",
  "tryndamere, barbarian": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/124c93495c927be1baea03fdacf6c7b283cf8b6c-744x1039.png",
  "vayne, hunter": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b38a22e6f4bfaa8589f32754a7466fe5214e81b5-744x1039.png",
  "vi, destructive": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7ab52254ac49b8853fc7ae65b03aaee3f8c5994a-744x1039.png",
  "immortal phoenix": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7b623ae985bf5f362b6d8d4a17e9b8146aeae3c3-744x1039.png",
  "kadregrin the infernal": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/733c32b1fccc7e2983cbb3586358152f90a6df04-744x1039.png",
  "kai'sa, survivor": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ad69bde670ce218adee1d2a618a7295d2fb7bd4c-744x1039.png",
  "seal of rage": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/fbdd14adb40b0ca46b89f476a356fa21413d812e-744x1039.png",
  "volibear, furious": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c9165d49b8caae9a856433cd5151e8b368eb80b5-744x1039.png",
  "calm rune": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0a0e8c3d16c2595e2f8efcc2b1466226539b506c-744x1039.png",
  "charm": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/62ae564505db8fcba70605eac2083ac2d4397b5a-744x1039.png",
  "clockwork keeper": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/417e606418349bb25d4b07d460fa043ad85f2778-744x1039.png",
  "defy": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/4989bfcc4bd7be77051f0c2c349a981ba9c273e0-744x1039.png",
  "en garde": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/03c0ec7eaa5957a62869dad2a0ce40913fc874a9-744x1039.png",
  "find your center": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/cd9d798b496fdce133c5b0106d636a230b6e7ebe-744x1039.png",
  "meditation": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7103336ab0d7f7bebdaa4155e4258d8d9beb06de-744x1039.png",
  "playful phantom": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3171ef8c7968b0dfe088725b9721b19d175bdb1e-744x1039.png",
  "rune prison": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/21867baeaced3c22cda5f40f6b6c9a8dad4b7042-744x1039.png",
  "solari shieldbearer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9387ea6480c9fd6991760b07a178c07a5fcf1c57-744x1039.png",
  "stalwart poro": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c4a5d7178e783c3975749271b6df333a82a2328a-744x1039.png",
  "stand united": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/4d10570e70a998de520d4baba254c3b726caa4f0-744x1039.png",
  "sunlit guardian": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/28bce7a662b9008f65565300f828d98790a641e1-744x1039.png",
  "wielder of water": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/5b38a7758705bd739caf07b5c0c49482a4a23015-744x1039.png",
  "adaptatron": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a3ddb00a2a872eaceb96469739531414aa27455d-744x1039.png",
  "block": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/36f7352e715fe073631ed85be41408c9a38ab865-744x1039.png",
  "discipline": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8b9613970b505e3ad6abe2d51d091778314a7d48-744x1039.png",
  "eclipse herald": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/bbe4fec278b8960681f97da658dc2f06ee46c4bd-744x1039.png",
  "mask of foresight": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/03824709acbb4151d13b083a842c4702a3e61221-744x1039.png",
  "poro herder": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/166b718a8517fcceac7e7d4f6acbc4fa0bbc2c55-744x1039.png",
  "reinforce": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/5bb4ce960c7636dac103c560a2e2f4e32f9d5390-744x1039.png",
  "spirit's refuge": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/26d5e54580d1f17ed6c35a66ac6a90ce56c99ec8-744x1039.png",
  "wind wall": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/72c4dbe48d06916c847dab40340e5f05228fadfe-744x1039.png",
  "wizened elder": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7b98797789ad7e3a6cf52126b82a42ec6f269bb7-744x1039.png",
  "ahri, alluring": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/fabbcc2f83f397cf07299236a702db05a151053b-744x1039.png",
  "blitzcrank, impassive": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/654dcc4aef0a0b5a0c6e928d7aae397a52c3ab17-744x1039.png",
  "caitlyn, patrolling": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/51e6bacf25d19e7c391367ff107efb9e0b9f1ff5-744x1039.png",
  "last stand": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9062d372d299c5c6a0c679f0ff07ba71590ca5f1-744x1039.png",
  "mageseeker warden": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ae844b929f817cdf76fe40c7bf5d5fc02062bdac-744x1039.png",
  "party favors": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/fddcef3c55663c5d6856f6d039d19cacfd64abb5-744x1039.png",
  "solari shrine": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/139a6d1c62a717bab4cdd75926e7f4aba6efb15d-744x1039.png",
  "sona, harmonious": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8582f6430821fb912fcb3619c5ce9405f254cb2f-744x1039.png",
  "taric, protector": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7d08e3f64401cb87b8a0564a1cbe6fc94aee03a7-744x1039.png",
  "tasty faefolk": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/65f69ca9a1087deb12e91fb6fdee7b6efd0c088f-744x1039.png",
  "yasuo, remorseful": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3f2cff3ff3b146c8bfe11594e37e9d8109884273-744x1039.png",
  "zhonya's hourglass": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/dc38172c56f838b407fc9f170ba973da32d7cd4d-744x1039.png",
  "lee sin, ascetic": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c6cc55639ad87cf9c8a74d6b3e5292d0b192c9b8-744x1039.png",
  "leona, zealot": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/451caa433b1fbe8e9d2b86548b82c3c5f2bac620-744x1039.png",
  "mystic reversal": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/298fe91f9d76086b7d77880e11016ed46389b61b-744x1039.png",
  "seal of focus": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/288c300c4e4cb10ecfe6c3cbb543d0636b306852-744x1039.png",
  "whiteflame protector": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a5cdd793736f915fa1b4ea388af66de7b2bc00cb-744x1039.png",
  "consult the past": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/198d950d3933972273ec714e9264cbd563ea6920-744x1039.png",
  "eager apprentice": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/cf6d5447ff3634d8c2c0216cb2e5802fb5ca0b2e-744x1039.png",
  "falling comet": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/eaaf300a07d5b2927fe9a601d70f2a01b512cc7e-744x1039.png",
  "jeweled colossus": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/775bea14038165fd9feb15c796ed84aa00a032e1-744x1039.png",
  "lecturing yordle": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/62e22370dac35c18de21efbfce9c86ca821e9105-744x1039.png",
  "mega-mech": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f71db7b62798a2a10a1ab0d293c26ac9dd163c6a-744x1039.png",
  "mind rune": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ecf8c8632c728520b51cd4bc79036677e96ebdfd-1488x2078.png",
  "orb of regret": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/fd883b646d1a3cdb1a03b0c19dc62c92ca552f4f-744x1039.png",
  "pit crew": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8023223b55adc44bafe1f8c5f305d3dde6f6d114-744x1039.png",
  "riptide rex": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/e09bf1fb6d72da31d415ea31ae7413fe7f02d650-744x1039.png",
  "smoke screen": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/06c34457afd09b828ee0b2862ed51eb31004d888-744x1039.png",
  "sprite call": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ab3db48dcbb12b01151d3a08c2412020380b7ca5-744x1039.png",
  "stupefy": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/837a5976192bbf8bdb4086429802167548ecc119-744x1039.png",
  "watchful sentry": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/d84da2c62b1e218a0a74b227c49ce8a953918ebd-744x1039.png",
  "blastcone fae": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/fac53b2216490c99ad7ce11dc5e663a692d6c104-744x1039.png",
  "energy conduit": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f0e0a67e9e9b1d45d12d248df78b4e643b70bdc1-744x1039.png",
  "garbage grabber": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/199f21237aeee2582904463a15ec62ce29452c10-744x1039.png",
  "gemcraft seer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/4b6965bd592a5f602ab932094d677b6c85b2372b-744x1039.png",
  "mushroom pouch": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ef5b3125fda91c0d0a02b7e6dfb7d3d5bafa8bd0-744x1039.png",
  "portal rescue": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/bafb4c68fa9a3eb71fecd0cdffb9e20b9f68d532-744x1039.png",
  "ravenbloom student": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b98b1ff793b6eb263957258742cc83d50fda6537-744x1039.png",
  "retreat": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/71ecf6c06d3110a81ac0f01c726c06921f479a13-744x1039.png",
  "singularity": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/792edce1a64d4a92740aa3fa240e21e161513944-744x1039.png",
  "sprite mother": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/65c06528f88de1ac207b382d4830ccfdd08a2d12-744x1039.png",
  "ava achiever": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/93e91aa99eb09baa68dd95b0013a89d9ffde5240-744x1039.png",
  "convergent mutation": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/61d414fc67ff52b9082e282e628dd0916afd8454-744x1039.png",
  "dr. mundo, expert": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/cf51fe8bedf5139e8cc1fc062969949ea7b121f0-744x1039.png",
  "ekko, recurrent": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/65da19325b6def53d33c07bc1aa8f91fd2f1e723-744x1039.png",
  "heimerdinger, inventor": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/5b14a5f9d567c90329c151a8cc72d870b47b1434-744x1039.png",
  "kai'sa, evolutionary": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/2c8c9619d4afd081de548b511000f7c4b849ec1e-744x1039.png",
  "malzahar, fanatic": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ba1fa3a18b1c2ff132ad536577e53deb49bce1f9-744x1039.png",
  "progress day": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b15f479a8f29e31b6e4c06cf2d7c8cb8630073ef-744x1039.png",
  "promising future": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/1ea5e7e50aaecee0b2ee2657d3c829dff0718fba-744x1039.png",
  "thousand-tailed watcher": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b20e5644c33924a58e0497dd9f7db19723147003-744x1039.png",
  "viktor, innovator": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/35be0b10f13611b4f5d828f2a79001036ab57ba1-744x1039.png",
  "wraith of echoes": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/10785ab5267ca3ff2dea081d8d18ba47c3858517-744x1039.png",
  "ahri, inquisitive": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/cfa28e1abcac1db780d11e82985e13ee5978290d-744x1039.png",
  "seal of insight": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9ee0dc0221f83d569e0f458374e40f7238f306c2-744x1039.png",
  "teemo, strategist": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0709ab02b75d9acc8f3c4037ec3a4140323150d8-744x1039.png",
  "time warp": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b97bbcf3cf6cb6e5f4baaa1bfbb85dc860eb950b-744x1039.png",
  "unchecked power": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c44cd1f6f41144c770ac79f10e5ae75f0c6d6435-744x1039.png",
  "arena bar": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/519306d1d4a36f2d54fe0982268a197a257f5e5d-744x1039.png",
  "bilgewater bully": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/474f66ffa1ecebd9e0341d644cb82a3b8135eece-744x1039.png",
  "body rune": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3b3c3c07626d6180457c849047e0228dc0d19539-744x1039.png",
  "cannon barrage": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/07ef531829e5c6084a8d31044ebd783a9266f59e-744x1039.png",
  "challenge": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f5c1aeaee373c481b7ea2a638cd6f9e815ac105d-744x1039.png",
  "confront": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/691a38a7c344fdb5ee86e34d41321d99754286a7-744x1039.png",
  "crackshot corsair": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9106ab084e02d7a489cb351e98112e5833b0bb11-744x1039.png",
  "dune drake": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ba18bf4a5fa9777a0cb5ae69cc7e6f049bbceaa0-744x1039.png",
  "first mate": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/85e2b436ea482d53563cc5fa955f2a867ee6c32f-744x1039.png",
  "flurry of blades": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c72f872e7e71b55b2074c5be4f2d7a44fa6fafca-744x1039.png",
  "mobilize": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/cb22153e84ce250192b8e6e75e7f4dc0b66a728c-744x1039.png",
  "pakaa cub": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/156a66d7d44165367cc5a470fb35c86f337f9429-744x1039.png",
  "pit rookie": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ec19eeaee85c7e5669387a3f6ccb7718f5a0f570-744x1039.png",
  "stormclaw ursine": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/137e5a1faec1c8b26a5a0abc7802f6461cc725c8-744x1039.png",
  "catalyst of aeons": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/4753707323ab6f9ac572c097f29f2f76ac62f54f-744x1039.png",
  "cithria of cloudfield": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/6f0931db65e25e0a8d8351ffb97f8deed5dc0aa9-744x1039.png",
  "herald of scales": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/be49bceea1d328769774fb4daac4732861f6e4fd-744x1039.png",
  "kinkou monk": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/648b22c6f419ee55723247bbf4c3ac10f0be9ab5-744x1039.png",
  "mountain drake": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8a9c1d334b217e9bd0b23dfca2054de4d0b90ff1-744x1039.png",
  "pirate's haven": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/1991b64d58cbd3698574f44b404f7a88d6403134-744x1039.png",
  "spoils of war": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b8d59d015d6b8e15822b360447fcb364e14d550f-744x1039.png",
  "unyielding spirit": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9afea96ec04ce0c2ee76c4affbf4e6df470e7647-744x1039.png",
  "wallop": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7bbd2eb8ce224e1872a1c920d7c64d796b2355cd-744x1039.png",
  "wildclaw shaman": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7abc938fee4ba397f52c8ea60d350857a7517b0c-744x1039.png",
  "anivia, primal": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ca1a56035333e31b3a04d67ee9131bb4d533e5db-744x1039.png",
  "carnivorous snapvine": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/5ceaec3452d623931b5ac93d0af26b180b9646de-744x1039.png",
  "kraken hunter": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/51aab4710d000a9c1e665a37ef8c919ff11b0282-744x1039.png",
  "lee sin, centered": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/eca1aec1304de9c237751eb0aeed620b9ad0408e-744x1039.png",
  "mistfall": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/1cedf0dcd6c4a44ae867e9f04f9f179d9b91c357-744x1039.png",
  "overt operation": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/69dba13c930ba3962851346d2bc6cbeb4ca48455-744x1039.png",
  "primal strength": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/dfd910a9836cd36340d0ffdb5fe8cb92a1069963-744x1039.png",
  "qiyana, victorious": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/90d1a07ef0c6c8282e6eee77e479254f50752eb2-744x1039.png",
  "sabotage": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/70f186b85fd224ee23dcf64957f0fab835d28040-744x1039.png",
  "udyr, wildman": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/2e461e5d05b5ee86e47a425c42c6f3b3c12bc4cf-744x1039.png",
  "volibear, imposing": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/bcb15f95f4a72f8b070a3b1cd54e6482fe1a4b3e-744x1039.png",
  "warwick, hunter": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/fcbf878905001fa81858e9f081346fd05425f264-744x1039.png",
  "dazzling aurora": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c023856a50c75058465f283d181277ce265ba108-744x1039.png",
  "deadbloom predator": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/112b4b3847b26ea2d245ac0976717d109be7b032-744x1039.png",
  "miss fortune, captain": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/6a7a0dfa952259993fa0d8998a820585ff4f81c6-744x1039.png",
  "seal of strength": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/415644b2798348e3d7198ec900cc40aaa4eb8bdf-744x1039.png",
  "sett, brawler": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/26e65c15e8a1ce1a9cd60d96345c7916e67e00ac-744x1039.png",
  "cemetery attendant": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/6bbbe6923105c53fc6b2a44430db940e009609b6-744x1039.png",
  "chaos rune": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/daf23b0deaa5e1a5a5d310b59e9ad25d1bd70363-744x1039.png",
  "ember monk": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0441f70a7acc377d8cbe08559b7a2fc3139c903b-744x1039.png",
  "fight or flight": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/2c3d543ab6c3809f45f3e410d59d376b4bee6de7-744x1039.png",
  "gust": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/dfd3b161ab76ba0c5d503384f1289b3395434b10-744x1039.png",
  "morbid return": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/33b5ca4e580b94f2056bd884a4a35e8c630920a2-744x1039.png",
  "mystic poro": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/11af57d045768e886d05e1c0933b0d57cb1e459d-744x1039.png",
  "rebuke": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c8e1ad72e9d562f9267c1512f29e9c04dc5cc15f-744x1039.png",
  "ride the wind": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/864d9f8992db7f9a9e795d9438d941ca564ddde7-744x1039.png",
  "sai scout": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/eab1fc8c95931519319c4c80681a261d75214c48-744x1039.png",
  "shipyard skulker": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/000634f32b897638760b82e5365961f6d85bc0cb-744x1039.png",
  "sneaky deckhand": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/6f95b6aac293d8e477192281df47d8466da502bf-744x1039.png",
  "stealthy pursuer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ab23fd84badd67e9981512acbe6c3e9a8f97f42d-744x1039.png",
  "undercover agent": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3e4e318c0cc97b13646ee454da71046a09236e47-744x1039.png",
  "acceptable losses": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b2b470bab1ae511ab9de0b1ce576e2050532a081-744x1039.png",
  "fading memories": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a2b366942f1a7ec1f4bd3c1b17e10356214705d7-744x1039.png",
  "pack of wonders": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a0830f326c49abe7fb1d3c9787e7ce5d7b776eec-744x1039.png",
  "scrapheap": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/198088dda16a95186a597433c3a62e8d982e666c-744x1039.png",
  "stacked deck": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/fdcb22cb620a4c1c37920d6b744edb615647cbd4-744x1039.png",
  "the syren": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/cafdd212b542243e10e5fac587616ab77e3d9cf1-744x1039.png",
  "traveling merchant": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b7dbebe2bf5691391c8e4146e478b8bd2ac40aef-744x1039.png",
  "treasure trove": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/682f5ee828ede4dbaf428cd0666db64ee8bae722-744x1039.png",
  "whirlwind": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/24f5e0a8811b5a0e0930c0f6476600e2a37a5f93-744x1039.png",
  "zaunite bouncer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0f4e8258e3920e4a4654cfe74faf8c266f2aa5dd-744x1039.png",
  "kayn, unleashed": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a1ce0e784264748f170bebb3b26a09a7f55efe0f-744x1039.png",
  "kog'maw, caustic": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/1ba2b780619714f2bf97597a180f3b118f4faf55-744x1039.png",
  "maddened marauder": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0f3a2ab8e5894e0dd1b625ee29f3304e7832ef9a-744x1039.png",
  "mindsplitter": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8753058698cff6455da6cccd13a7fe901a164051-744x1039.png",
  "miss fortune, buccaneer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/e6ff9ad3d6e2b96ff76cda4c7bc75415c1cdcced-744x1039.png",
  "nocturne, horrifying": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/19a751364bc6eb5297596e8733d0d30a1111ac78-744x1039.png",
  "rhasa the sunderer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/e34fe8a9ee533dee99f96b4e6677d1edbd6a262d-744x1039.png",
  "soulgorger": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/439c4fa7c8c47cba41df8bce3fe3c8068d297382-744x1039.png",
  "teemo, scout": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ca8a2e11dd78dd09ad1c9ad3a23e5699254b947e-744x1039.png",
  "the harrowing": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/6914034f56dd50ab37df26e3541c997479bb5a6d-744x1039.png",
  "tideturner": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/bad355dba8b32d1fba33dc3924cad6a34b61b5af-744x1039.png",
  "twisted fate, gambler": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9eff1a038528c4d633196f13259670d84b74c2a8-744x1039.png",
  "invert timelines": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b916326fdcf61af4630d953c7540a4aa97e6db01-744x1039.png",
  "jinx, rebel": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a7fe105f40df66525be51bd18e25506945a7b027-744x1039.png",
  "possession": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f26462174fd01407f25f7d49a70862d2b9af35cc-744x1039.png",
  "seal of discord": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/dd8433e77e46ca77aaf0be35d1774218d9a2f037-744x1039.png",
  "yasuo, windrider": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/35f7ca6802af48585af55d23cf7675a8922d8535-744x1039.png",
  "back to back": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7f5585dcd3e9c7866e3b99cb169a0404ea4c010f-744x1039.png",
  "call to glory": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ced53bc3fb15f263471067fc3868295b09e62a07-744x1039.png",
  "cruel patron": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c1c2c08fa0032a245c1ffee6ba29fff2826bd468-744x1039.png",
  "cull the weak": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/49338a4b31727c6ef50e7dbc54e7004dcd2b6f4c-744x1039.png",
  "daring poro": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/41dee7ec46124c261352595cfbd8a6d38d32b947-744x1039.png",
  "faithful manufactor": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b41107b7456a2a38d203983b1e504e3789d6b6ea-744x1039.png",
  "forge of the future": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8e6a76d28590bcd835b0a9a1e806fe0fa6883141-744x1039.png",
  "hidden blade": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0437ab8a0b67f43ef5483a103bbae9e57fd05822-744x1039.png",
  "order rune": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0e4904221c3bbbfcfde1734bc414dbe97c67e295-1488x2078.png",
  "petty officer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/29e062c4a38c0be12056568a2f8563557e2611c6-744x1039.png",
  "soaring scout": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/75b6ce420888035b566c3795cabe0999a9a918b0-744x1039.png",
  "trifarian gloryseeker": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/19ad6a0e743b56021b9651a2105034a488e172e8-744x1039.png",
  "vanguard captain": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f0c9ddb2af7a0d4991938cf1e3058eb0f5d2e357-744x1039.png",
  "vanguard sergeant": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/6bcff5c718cfcff1c2466bf5e1a2a1ea9a9cf09b-744x1039.png",
  "facebreaker": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b7cddc717b886bb955b900ffaae4db9154a19280-744x1039.png",
  "imperial decree": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/fc6ab617f1ce20c82ed76dc6446d42d416c08b34-744x1039.png",
  "noxian drummer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/45a69adf92b6951c8c8fa974273c22aade312068-744x1039.png",
  "peak guardian": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/bb56433bc032fd31a957923c43babc48b66db24c-744x1039.png",
  "salvage": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9bdbac358e7c9415c1354b6d1f6888dcf9c5519b-744x1039.png",
  "solari chief": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/02fd791fdaa7d1c63221655e889fb412de103ca2-744x1039.png",
  "spectral matron": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c8aebd03c8722d485ebfc38774488778c756ff5c-744x1039.png",
  "symbol of the solari": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/d4f746c396df48623ef8a4df763b5deb47f59339-744x1039.png",
  "vanguard helm": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9718c666cbf789a572760c826d0a06b26b787ae5-744x1039.png",
  "vengeance": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a21e2ffee47ecdd1575bf48edb8c2a84722cc6b9-744x1039.png",
  "albus ferros": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ec0be8d2a79196b689fccf9ee42ce8baa7e9c35e-744x1039.png",
  "commander ledros": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/1183be5effc6275f17da09b983feb36632752af4-744x1039.png",
  "fiora, victorious": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/24d4d1997e6a5b145412e402fc69399d590ecda0-744x1039.png",
  "grand strategem": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/bda7514aefa94ac3f368690cdd2d0f955d44c089-744x1039.png",
  "harnessed dragon": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/00bc15bc1c2f5b8e6d1713819998df1c04864dcb-744x1039.png",
  "karma, channeler": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/aca8664b334f2fa40cc7bae2811dd4e1b4f06388-744x1039.png",
  "karthus, eternal": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/df3497ce6a602da554813340f572240675c7f0e2-744x1039.png",
  "king's edict": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ec1b8b98e1ca7a34939322883309c71605bb8bc5-744x1039.png",
  "leona, determined": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/1ed0250f1d3bbbbde49b3ce1fc2e744e4da64baa-744x1039.png",
  "machine evangel": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ad15d4ff89548e83dcede9b209b12233652cf3a1-744x1039.png",
  "sett, kingpin": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/bd43f1dcef824b66f1af994b59b961fc3705f9c3-744x1039.png",
  "shen, kinkou": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/25f3a9fa33201278ebf475b2d02dae8c0c0cb20c-744x1039.png",
  "baited hook": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7b4e6a1e32878a7d5fe4e40869c83e47ea08de7c-744x1039.png",
  "darius, executioner": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/76a697f29d4fc3cd9a5e9a0ce79f229d26bc0c90-744x1039.png",
  "divine judgment": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/995778eea2e24fdc62ade38c2baa25b9f1e6ab79-744x1039.png",
  "seal of unity": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/e6fbd41d69bc0d235ea7993d2e9fa74e75e17dff-744x1039.png",
  "viktor, leader": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/19b66f8eccd6d6e9d41048f73e44660f1cf77068-744x1039.png",
  "daughter of the void": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3ea826277086945a2cdfda4e41b771075aa8b15b-744x1039.png",
  "icathian rain": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8df37f633d3da734f3f2d85808a7cb9eadec1b04-744x1039.png",
  "relentless storm": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8ef9c1827ccbba313d4591275e831854afffa5b1-744x1039.png",
  "stormbringer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/d86c4137cc7f77f103cd7d6228125df8cb9a54e1-744x1039.png",
  "loose cannon": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f57c14381b126e9f5a7b5bc4913151cb24c14fc3-744x1039.png",
  "super mega death rocket!": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/95d6fd4d7944e759cfe7ee5e208fa329b719333b-744x1039.png",
  "hand of noxus": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/5b9a904048b7fb936377844ec2d31564b7fedf81-744x1039.png",
  "noxian guillotine": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/57f646b0393b58b657cfabf66357d9fc4a34e046-744x1039.png",
  "nine-tailed fox": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/56457c7986d3f140b7123a988149cc30a83493a7-744x1039.png",
  "fox-fire": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7ad9d6a46a1c54080d54950a0044da3a82e32b45-744x1039.png",
  "blind monk": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/ffe064e002d3b9a366748eb85102a769b2545835-744x1039.png",
  "dragon's rage": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7f4cbd4fb340cc13b3fbe0ec0db706464d9b29f4-744x1039.png",
  "unforgiven": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/33e3d5596de0f560087d40414d62b8245d1dbb0d-744x1039.png",
  "last breath": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/e7e6dc840210124825f787095541a66ae5cea178-744x1039.png",
  "radiant dawn": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/822b8bc7987a47498550708b18ef166b121fd620-744x1039.png",
  "zenith blade": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a572f0bc3ed1bd47c5759d36f5b951b15338e57e-744x1039.png",
  "swift scout": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9723181e3392bb61c2aabc804a44f7b0558cedf1-744x1039.png",
  "guerilla warfare": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3a1f70e49f1fdbac907a3395f517e96717e8afea-744x1039.png",
  "herald of the arcane": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/913236dabf1e4f71650bbba46870fff8163e2eff-744x1039.png",
  "siphon power": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b449170ba312711c82708d1fea2b044822ce5eaa-744x1039.png",
  "bounty hunter": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/e0635cebc3dd8ee5355dbbc090ca27ebeacebad7-744x1039.png",
  "bullet time": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/96ed7f6b121a7f46003534393350838efe2776f0-744x1039.png",
  "the boss": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b132becb843b2cf418cb110ead64758f49f51554-744x1039.png",
  "showstopper": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c9b6f7a7cca1589fb53276f74ac8bc547b31e5ec-744x1039.png",
  "recruit (de)": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7c3362dc6e6e6fb724ef31b061a44d2976f5b01f-744x1039.png",
  "recruit (nx)": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c168ca334739090a060710dfc440982c3462ac8c-744x1039.png",
  "recruit (zn)": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/d93ec9a524a2989b9d7ef23c6fc02e8ce39959c2-744x1039.png",
  "sprite": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/055892752559d2d3d32e76f491a7a0b540e1a669-744x1039.png",
  "altar to unity": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/2392529560dc9af72596c6fc65b4c0356bbc44d1-1038x744.png",
  "aspirant's climb": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9301593f3800e68427469d38181b578a672473c3-1038x744.png",
  "back-alley bar": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3e9f659a32e390b45bc87a01bdd6af4a8a3565f7-1038x744.png",
  "bandle tree": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/538f93a34006c4afaddb890cbc75b4db222f1783-1038x744.png",
  "fortified position": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/45363bbd907f4f3717868cb04b3cfed814b3bb32-1038x744.png",
  "grove of the god-willow": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/1574863000ab23d69cbd388a32b1a09f29f78d5f-1038x744.png",
  "hallowed tomb": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/2f29ea42fb3e1c8ce05d2e82f2a2fe0d45851953-1038x744.png",
  "monastery of hirana": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8767d9ed30e2873d3fa1045f973be229da56175d-1038x744.png",
  "navori fighting pit": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/c03ed3ddf8b764963e4b0745e86a12a5ebcef2a3-1038x744.png",
  "obelisk of power": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/649437d1dec8abcaae4fbbef64f06b8b679a8c2f-1038x744.png",
  "reaver's row": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/364af10bac81e6ffb8658b0dc0db551608d207ce-1038x744.png",
  "reckoner's arena": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/6b7d867487efcbefa8c3d67043a839497ec50388-1038x744.png",
  "sigil of the storm": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/9b795e7a2af421aabc01dc6f35c0b5d547fe3c0e-1038x744.png",
  "startipped peak": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/05adde1d8ab40e2a2f832a89ac5c9174ee78796f-1038x744.png",
  "targon's peak": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/6ff1b34ad231645910f670496e1662de0b545a44-1038x744.png",
  "the arena's greatest": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/2afd8bdfdd42b1595af0746a6c6b92879ac770d6-1038x744.png",
  "the candlelit sanctum": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f14fe78f2b7f3909eadb07bce24bd582e190653d-1038x744.png",
  "the dreaming tree": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/82a30070a1461db889539b4b4b3c678990e19b6c-1038x744.png",
  "the grand plaza": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f9ca8d04cb269ad99bca7e6dae874cad1bec336a-1038x744.png",
  "trifarian war camp": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/3788cf718e716e35a7fa20ec1dc56991644e6484-1038x744.png",
  "vilemaw's lair": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/f374b90a0bec11a5f423e7d4ebd869ab1a146471-1038x744.png",
  "void gate": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/14a52a367fd41fd84745e050e62d1f281f733467-1038x744.png",
  "windswept hillock": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/aba557a4053fd76c6aa95b2b907ec682bad70d9f-1038x744.png",
  "zaun warrens": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/458ee40086c77b43b98c2decbaf33a4aa2359bb9-1038x744.png",
  "annie, fiery": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/532d75dc36a16eb5954253a77366fcceac7aec62-744x1039.png",
  "firestorm": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a7a34129e64f0296bf2da166c2b06ed156d568db-744x1039.png",
  "incinerate": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/46e4eaada1412f9b6c24751bdb3932c6a51e905f-744x1039.png",
  "yi, meditative": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/5508566c8f05f09492148faa803332a731095eb7-744x1039.png",
  "zephyr sage": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/7664b03bb107954195153d9f2f86c5d63682fa4b-744x1039.png",
  "lux, illuminated": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/a0d10edf30abb6fde21f5d386e9a7db3c1b0a098-744x1039.png",
  "garen, rugged": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/67c22dc29a7a28dabe0f169a7848c25bef1fbda4-744x1039.png",
  "gentlemen's duel": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/4568ab827fdcd42d6bb86b1c2de6182e286c9ee9-744x1039.png",
  "yi, honed": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0e16976cd6d7ee5a874be9351b428671990fbd25-744x1039.png",
  "annie, stubborn": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/44eb968cf0c54e75970588b69eef5c5f5ccc9b24-744x1039.png",
  "flash": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/4d9cc1c13b75933e509e642213f13359350cd3f9-744x1039.png",
  "blast of power": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/026f851a703601fce4142c0791e913377c170b47-744x1039.png",
  "garen, commander": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/cbf2c12d69a86566e4cda07050b2d4495e40187e-744x1039.png",
  "lux, crownguard": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/17d0793ad495727e67bb1c94ae0e11cd4705870f-744x1039.png",
  "recruit the vanguard": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/81d1c47459606f7b627778cce9b5f0e44d80f7fa-744x1039.png",
  "vanguard attendant": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/4ce467c1d51a65ab4fbae918dca38ae90b510844-744x1039.png",
  "dark child - starter": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/89963e1d1cffd69c620fb5d6b037f50d5c334463-744x1039.png",
  "tibbers": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/74f8bc78573b33d9979b0e9c121b858d770a490c-744x1039.png",
  "wuju bladesman - starter": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8231ced23eaf22ca3bf62ec8cb86b83a3e222da6-744x1039.png",
  "highlander": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/18c0818cbbfdf26a1237b4f7703b1f035f47b014-744x1039.png",
  "lady of luminosity - starter": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/44885d811b70621b188d9813b2b10b5cff1b81e6-744x1039.png",
  "final spark": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/4558a2dc1bb1f1b8a73ec0d82244654e84b12687-744x1039.png",
  "might of demacia - starter": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/e7185deb46f17770802d06aeddfe3b929afff880-744x1039.png",
  "decisive strike": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/986782271be078c184a8d1c196e375106459c6c5-744x1039.png",
  "draven, vanquisher": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/8fa3f1fe63392c4744152d98ff781497a4d17b74-744x1039.png",
  "long sword": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/48d798bf93afd1ef139dcafc6cd8705742b93169-744x1039.png",
  "dorans shield": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/49a24d4c6d770ed233c4a69bf8d87385bfc997d8-744x1039.png",
  "guardian angel": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/d09a797345659a1853d6d12910cf3c634990ea0c-744x1039.png",
  "steraks gage": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/df16e6b668fc6771ff657512deba1bf48363e23a-744x1039.png",
  "svellsongur": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/bc254398dfb5db217327b56862011a2fd6020789-744x1039.png",
  "lucian, merciless": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/bc192b6e22e7a277c53f035809c59db4548a0fd5-744x1039.png",
  "trinity force": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/e8b64985389e5792afc2a2fe0dc23ae7590d7709-744x1039.png",
  "overzealous fan": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/922d7f337fbf14f0d62d43f69ca2a1e7480dd022-744x1039.png",
  "blade of the ruined king": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/26ab126258a15afd380c313e973f7469808ce55f-744x1039.png",
  "glorious executioner": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b01b2d0454ceeffdc106c4c64a390b275ebf390b-744x1039.png",
  "spinning axe": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/e4e0328034e605d000e23ac5e820d233f0e3b520-744x1039.png",
  "blade dancer": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/656ef2d1724b818e9e737ec5dcce923de067a316-744x1039.png",
  "emperor of the sands": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/0472274c49f6540858758ebf9bd2f107a601541a-744x1039.png",
  "chem-baroness": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/4bd289c281ad64229061ff909abf88c12a574833-744x1039.png",
  "battle mistress": "https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/fd060882c32a8deac04aea4241c6ab7b97236a05-744x1039.png",
};

function makeCard(templateId: string): GameCard {
  const t = CARD_TEMPLATES.find(c => c.id === templateId)!;
  return {
    ...t,
    uid: uid(),
    zone: 'hand',
    isExhausted: false,
    damage: 0,
    canAttack: false,
    tapped: false,
    imageUrl: CARD_IMAGE_MAP[t.name.toLowerCase()] ?? t.imageUrl,
  };
}

function makeRune(domain: Domain): Rune {
  return { uid: uid(), domain, zone: 'runeDeck', isExhausted: false, isRecycled: false };
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(domain: Domain): GameCard[] {
  const domainCards = CARD_TEMPLATES.filter(c => c.domain === domain || c.domain === 'Colorless' || c.type === 'Champion');
  const deck: GameCard[] = [];
  
  const pool = domainCards.filter(c => c.type !== 'Champion');
  for (let i = 0; i < 36; i++) {
    const t = pool[Math.floor(Math.random() * pool.length)];
    deck.push(makeCard(t.id));
  }
  return shuffle(deck);
}

function buildRuneDeck(primary: Domain, secondary: Domain): Rune[] {
  const runes: Rune[] = [];
  for (let i = 0; i < 6; i++) runes.push(makeRune(primary));
  for (let i = 0; i < 6; i++) runes.push(makeRune(secondary));
  return shuffle(runes);
}

function makePlayer(id: 'player' | 'opponent', name: string, domain: Domain, legendName: string): PlayerState {
  const deck = buildDeck(domain);
  const hand = deck.splice(0, 4);
  hand.forEach(c => c.zone = 'hand');

  const champion = makeCard(
    domain === 'Fury' ? 'draven' :
    domain === 'Cunning' ? 'ahri' :
    domain === 'Knowledge' ? 'lux' :
    domain === 'Order' ? 'irelia' :
    domain === 'Hope' ? 'jinx' : 'darius'
  );
  champion.zone = 'championZone';

  return {
    id,
    name,
    score: 0,
    hand,
    deck,
    trash: [],
    banished: [],
    base: [],
    runeDeck: buildRuneDeck(domain, 'Colorless'),
    runePool: [],
    legend: { name: legendName, domain, ability: 'Your Legend ability' },
    champion,
    energyPool: 0,
    powerPool: {} as Record<Domain, number>,
  };
}

// ============================================================
// INIT
// ============================================================

export const STARTER_DECKS: Record<string, { name: string; domain: Domain; cards: string[]; imageUrl?: string }> = {
  'draven-aggro': {
    name: 'Draven Fury Aggro',
    domain: 'Fury',
    imageUrl: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/b01b2d0454ceeffdc106c4c64a390b275ebf390b-744x1039.png',
    cards: [
      'overzealous-fan', 'overzealous-fan', 'overzealous-fan',
      'noxus-hopeful', 'noxus-hopeful', 'noxus-hopeful',
      'tideturner', 'tideturner', 'tideturner',
      'darius-trifarian', 'darius-trifarian',
      'brynhir', 'brynhir',
      'strike', 'strike', 'strike',
      'cleave', 'cleave',
      'spinning-axe', 'spinning-axe', 'spinning-axe',
      'stacked-deck', 'stacked-deck',
      'edge-of-night', 'edge-of-night',
    ]
  },
  'ahri-control': {
    name: 'Ahri Cunning Control',
    domain: 'Cunning',
    imageUrl: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/fabbcc2f83f397cf07299236a702db05a151053b-744x1039.png',
    cards: [
      'treasure-hunter', 'treasure-hunter', 'treasure-hunter',
      'pouty-poro', 'pouty-poro', 'pouty-poro',
      'ironback-patrol', 'ironback-patrol',
      'falling-star', 'falling-star', 'falling-star',
      'flash', 'flash', 'flash',
      'rally', 'rally',
      'noxus-hopeful', 'noxus-hopeful',
      'tideturner', 'tideturner',
    ]
  },
  'irelia-combo': {
    name: 'Irelia Order Combo',
    domain: 'Order',
    imageUrl: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/game_data_live/656ef2d1724b818e9e737ec5dcce923de067a316-744x1039.png',
    cards: [
      'ironback-patrol', 'ironback-patrol', 'ironback-patrol',
      'pouty-poro', 'pouty-poro', 'pouty-poro',
      'noxus-hopeful', 'noxus-hopeful',
      'rally', 'rally', 'rally',
      'flash', 'flash',
      'strike', 'strike',
      'cleave', 'cleave',
      'spinning-axe', 'spinning-axe',
    ]
  }
};

export function initializeGame(playerDomain: Domain = 'Fury', opponentDomain: Domain = 'Cunning', starterDeckId?: string): GameState {
  let player: PlayerState;
  
  if (starterDeckId && STARTER_DECKS[starterDeckId]) {
    const starter = STARTER_DECKS[starterDeckId];
    const cards = starter.cards.map(id => makeCard(id));
    const deck = shuffle(cards);
    const hand = deck.splice(0, 4);
    hand.forEach(c => c.zone = 'hand');
    
    player = makePlayer('player', 'Vous', starter.domain, starter.name);
    player.deck = deck;
    player.hand = hand;
  } else {
    player = makePlayer('player', 'Vous', playerDomain, 'Your Legend');
  }

  const opponent = makePlayer('opponent', 'IA', opponentDomain, 'Enemy Legend');

  return {
    id: uid(),
    player,
    opponent,
    battlefield: {
      id: 'bf1',
      name: 'Noxian Warfront',
      controller: null,
      contested: false,
      playerUnits: [],
      opponentUnits: [],
      victoryModifier: 0,
    },
    turn: 1,
    activePlayer: 'player',
    phase: 'awaken',
    turnState: 'open',
    victoryScore: 8,
    gameOver: false,
    winner: null,
    log: ['🎮 La partie commence ! Objectif : 8 points.'],
    chain: [],
  };
}

export function initializeGameWithDeck(playerDomain: Domain = 'Fury', savedDeck?: any): GameState {
  if (savedDeck && savedDeck.cards && savedDeck.cards.length > 0) {
    const cards: GameCard[] = [];
    savedDeck.cards.forEach((c: any) => {
      for (let i = 0; i < (c.count || 1); i++) {
        cards.push(makeCard(c.id));
      }
    });
    
    const deck = shuffle(cards);
    const hand = deck.splice(0, 4);
    hand.forEach(c => c.zone = 'hand');
    
    const player = makePlayer('player', 'Vous', savedDeck.domain as Domain, savedDeck.name);
    player.deck = deck;
    player.hand = hand;
    
    const opponent = makePlayer('opponent', 'IA', 'Cunning', 'Enemy Legend');
    
    return {
      id: uid(),
      player,
      opponent,
      battlefield: {
        id: 'bf1',
        name: 'Noxian Warfront',
        controller: null,
        contested: false,
        playerUnits: [],
        opponentUnits: [],
        victoryModifier: 0,
      },
      turn: 1,
      activePlayer: 'player',
      phase: 'awaken',
      turnState: 'open',
      victoryScore: 8,
      gameOver: false,
      winner: null,
      log: ['🎮 La partie commence avec votre deck personnalisé !'],
      chain: [],
    };
  }
  return initializeGame(playerDomain);
}

// ============================================================
// HELPERS
// ============================================================

function getActive(state: GameState): PlayerState {
  return state.activePlayer === 'player' ? state.player : state.opponent;
}

function getInactive(state: GameState): PlayerState {
  return state.activePlayer === 'player' ? state.opponent : state.player;
}

function addLog(state: GameState, msg: string): GameState {
  return { ...state, log: [...state.log, msg] };
}

function calcEnergy(player: PlayerState): number {
  return player.runePool.filter(r => r.isExhausted).length;
}

export function getEnergy(state: GameState): number {
  return calcEnergy(getActive(state));
}

// ============================================================
// PHASE PROCESSING
// ============================================================

export function processPhase(state: GameState): GameState {
  const active = getActive(state);
  let s = { ...state };

  switch (s.phase) {
    case 'awaken': {
      // Ready all runes and units on base/battlefield
      active.runePool.forEach(r => { r.isExhausted = false; r.isRecycled = false; });
      active.base.forEach(c => { c.isExhausted = false; c.canAttack = c.type === 'Unit' || c.type === 'Champion'; c.damage = 0; });
      s.battlefield.playerUnits.forEach(c => { c.isExhausted = false; c.canAttack = true; c.damage = 0; });
      s = addLog(s, `⚡ ${active.name} — Phase Éveil`);
      return { ...s, phase: 'beginning' };
    }

    case 'beginning': {
      // Hold scoring: if you control the battlefield at start of your turn
      if (s.battlefield.controller === s.activePlayer) {
        active.score += 1;
        s = addLog(s, `🏆 ${active.name} marque 1 point (Hold)`);
        if (active.score >= s.victoryScore) {
          return { ...s, gameOver: true, winner: s.activePlayer };
        }
      }
      s = addLog(s, `📋 ${active.name} — Phase Début`);
      return { ...s, phase: 'channel' };
    }

    case 'channel': {
      // Auto-channel 2 runes (3 for second player first turn)
      const amount = (s.turn === 1 && s.activePlayer === 'opponent') ? 3 : 2;
      for (let i = 0; i < amount && active.runeDeck.length > 0; i++) {
        const rune = active.runeDeck.shift()!;
        rune.zone = 'runePool';
        active.runePool.push(rune);
      }
      active.energyPool = calcEnergy(active);
      s = addLog(s, `🔮 ${active.name} canalise ${Math.min(amount, active.runePool.length)} runes`);
      return { ...s, phase: 'draw' };
    }

    case 'draw': {
      if (active.deck.length > 0) {
        const card = active.deck.shift()!;
        card.zone = 'hand';
        active.hand.push(card);
        s = addLog(s, `🃏 ${active.name} pioche une carte`);
      } else {
        // Burn rule: opponent scores 1 point
        getInactive(s).score += 1;
        s = addLog(s, `💀 Deck vide ! L'adversaire marque 1 point.`);
      }
      // Clear rune pool (unused energy)
      active.energyPool = calcEnergy(active);
      return { ...s, phase: 'action', turnState: 'open' };
    }

    case 'action': {
      return { ...s, phase: 'end' };
    }

    case 'end': {
      // Clear temp effects
      active.base.forEach(c => { c.damage = 0; });
      // Recycle unused runes back to bottom of rune deck
      active.runePool.forEach(r => {
        r.zone = 'runeDeck';
        r.isExhausted = false;
        active.runeDeck.push(r);
      });
      active.runePool = [];
      active.energyPool = 0;

      s = addLog(s, `🔄 ${active.name} — Fin de tour`);

      // Switch active player
      const next: 'player' | 'opponent' = s.activePlayer === 'player' ? 'opponent' : 'player';
      const nextTurn = next === 'player' ? s.turn + 1 : s.turn;

      return { ...s, phase: 'awaken', activePlayer: next, turn: nextTurn, turnState: 'open' };
    }
  }
  return s;
}

export function skipToAction(state: GameState): GameState {
  let s = state;
  while (s.phase !== 'action' && !s.gameOver) {
    s = processPhase(s);
  }
  return s;
}

// ============================================================
// ACTIONS
// ============================================================

export function channelRune(state: GameState): GameState {
  const active = getActive(state);
  if (state.phase !== 'channel') return state;

  if (active.runeDeck.length === 0) return addLog(state, '❌ Pas de runes à canaliser');

  const rune = active.runeDeck.shift()!;
  rune.zone = 'runePool';
  active.runePool.push(rune);
  active.energyPool = calcEnergy(active);

  return addLog(state, `🔮 ${active.name} canalise une rune ${rune.domain}`);
}

export function exhaustRune(state: GameState, runeUid: string): GameState {
  const active = getActive(state);
  const rune = active.runePool.find(r => r.uid === runeUid);
  if (!rune || rune.isExhausted) return state;

  rune.isExhausted = true;
  active.energyPool = calcEnergy(active);

  return addLog(state, `⚡ Rune ${rune.domain} exhaustée → +1 énergie`);
}

export function playCard(state: GameState, cardUid: string): GameState {
  if (state.phase !== 'action' || state.turnState === 'closed') return state;

  const active = getActive(state);
  const cardIdx = active.hand.findIndex(c => c.uid === cardUid);
  if (cardIdx === -1) return state;

  const card = active.hand[cardIdx];
  const energy = calcEnergy(active);

  if (card.energyCost > energy) {
    return addLog(state, `❌ Pas assez d'énergie (${energy}/${card.energyCost})`);
  }

  // Pay energy (exhaust runes)
  let toPay = card.energyCost;
  for (const rune of active.runePool) {
    if (toPay <= 0) break;
    if (!rune.isExhausted) {
      rune.isExhausted = true;
      toPay--;
    }
  }
  active.energyPool = calcEnergy(active);

  // Remove from hand
  active.hand.splice(cardIdx, 1);

  let s = { ...state };

  if (card.type === 'Unit' || card.type === 'Champion') {
    card.zone = 'base';
    card.canAttack = false;
    card.isExhausted = true; // summoning sickness
    active.base.push(card);
    s = addLog(s, `▶️ ${active.name} joue ${card.name} sur la Base`);
  } else if (card.type === 'Spell') {
    card.zone = 'trash';
    active.trash.push(card);
    s = addLog(s, `✨ ${active.name} joue le sort ${card.name}`);
    s = resolveSpell(s, card);
  } else if (card.type === 'Gear') {
    card.zone = 'base';
    active.base.push(card);
    s = addLog(s, `🛡️ ${active.name} joue l'équipement ${card.name}`);
  }

  return s;
}

function resolveSpell(state: GameState, card: GameCard): GameState {
  const active = getActive(state);
  const inactive = getInactive(state);
  let s = state;

  switch (card.id) {
    case 'strike':
      // Deal 2 to strongest enemy unit
      if (inactive.base.length > 0) {
        const target = inactive.base.reduce((a, b) => b.power > a.power ? b : a);
        target.damage += 2;
        s = addLog(s, `⚔️ Strike inflige 2 dégâts à ${target.name}`);
        s = checkDeaths(s);
      }
      break;
    case 'cleave':
      if (inactive.base.length > 0) {
        const target = inactive.base.reduce((a, b) => b.power > a.power ? b : a);
        target.damage += 3;
        s = addLog(s, `⚔️ Cleave inflige 3 dégâts à ${target.name}`);
        s = checkDeaths(s);
      }
      break;
    case 'flash':
      for (let i = 0; i < 2 && active.deck.length > 0; i++) {
        const drawn = active.deck.shift()!;
        drawn.zone = 'hand';
        active.hand.push(drawn);
      }
      s = addLog(s, `🃏 Flash of Brilliance : +2 cartes`);
      break;
    case 'rally':
      active.base.forEach(u => { u.might += 1; u.power += 1; });
      s = addLog(s, `🔥 Rally : +1/+1 à toutes vos unités`);
      break;
    case 'spinning-axe':
      if (inactive.base.length > 0) {
        const target = inactive.base[0];
        target.damage += 1;
      }
      if (active.deck.length > 0) {
        const drawn = active.deck.shift()!;
        drawn.zone = 'hand';
        active.hand.push(drawn);
      }
      s = addLog(s, `🪓 Spinning Axe : 1 dégât + pioche`);
      break;
    case 'falling-star':
      if (inactive.base.length > 0) {
        const target = inactive.base.reduce((a, b) => b.power > a.power ? b : a);
        target.damage += 4;
        s = addLog(s, `💫 Falling Star : 4 dégâts à ${target.name}`);
        s = checkDeaths(s);
      }
      break;
    case 'stacked-deck':
      for (let i = 0; i < Math.min(1, active.deck.length); i++) {
        const drawn = active.deck.shift()!;
        drawn.zone = 'hand';
        active.hand.push(drawn);
      }
      s = addLog(s, `📚 Stacked Deck : +1 carte`);
      break;
  }
  return s;
}

function checkDeaths(state: GameState): GameState {
  const s = state;
  // Check player base
  const playerDead = s.player.base.filter(c => c.damage >= c.power && c.power > 0);
  playerDead.forEach(c => { c.zone = 'trash'; s.player.trash.push(c); });
  s.player.base = s.player.base.filter(c => c.damage < c.power || c.power === 0);

  // Check opponent base
  const opponentDead = s.opponent.base.filter(c => c.damage >= c.power && c.power > 0);
  opponentDead.forEach(c => { c.zone = 'trash'; s.opponent.trash.push(c); });
  s.opponent.base = s.opponent.base.filter(c => c.damage < c.power || c.power === 0);

  // Check battlefield
  const bfPlayerDead = s.battlefield.playerUnits.filter(c => c.damage >= c.power && c.power > 0);
  bfPlayerDead.forEach(c => { c.zone = 'trash'; s.player.trash.push(c); });
  s.battlefield.playerUnits = s.battlefield.playerUnits.filter(c => c.damage < c.power || c.power === 0);

  const bfOpponentDead = s.battlefield.opponentUnits.filter(c => c.damage >= c.power && c.power > 0);
  bfOpponentDead.forEach(c => { c.zone = 'trash'; s.opponent.trash.push(c); });
  s.battlefield.opponentUnits = s.battlefield.opponentUnits.filter(c => c.damage < c.power || c.power === 0);

  if (playerDead.length + opponentDead.length > 0) {
    return addLog(s, `💀 ${playerDead.length + opponentDead.length} unité(s) détruite(s)`);
  }
  return s;
}

// Move unit from base to battlefield
export function moveToField(state: GameState, cardUid: string): GameState {
  if (state.phase !== 'action') return state;

  const active = getActive(state);
  const cardIdx = active.base.findIndex(c => c.uid === cardUid);
  if (cardIdx === -1) return state;

  const card = active.base[cardIdx];
  if (card.isExhausted) return addLog(state, `❌ ${card.name} ne peut pas se déplacer ce tour`);

  active.base.splice(cardIdx, 1);
  card.zone = 'battlefield';
  card.tapped = true;

  if (state.activePlayer === 'player') {
    state.battlefield.playerUnits.push(card);
  } else {
    state.battlefield.opponentUnits.push(card);
  }

  state.battlefield.contested = state.battlefield.playerUnits.length > 0 && state.battlefield.opponentUnits.length > 0;

  return addLog(state, `⚔️ ${active.name} déplace ${card.name} sur le Battlefield`);
}

// Declare attack (unit at battlefield attacks)
export function declareAttack(state: GameState, attackerUid: string): GameState {
  if (state.phase !== 'action') return state;

  const active = getActive(state);
  const inactive = getInactive(state);

  const attackerList = state.activePlayer === 'player'
    ? state.battlefield.playerUnits
    : state.battlefield.opponentUnits;

  const defenderList = state.activePlayer === 'player'
    ? state.battlefield.opponentUnits
    : state.battlefield.playerUnits;

  const attacker = attackerList.find(c => c.uid === attackerUid);
  if (!attacker || !attacker.canAttack || attacker.isExhausted) return state;

  attacker.isExhausted = true;
  attacker.canAttack = false;

  let s = { ...state, turnState: 'showdown' as TurnState };

  if (defenderList.length === 0) {
    // Unblocked — Conquer
    s = handleConquer(s, attacker);
  } else {
    // Auto-combat with strongest defender
    const defender = defenderList.reduce((a, b) => b.might > a.might ? b : a);
    attacker.damage += defender.might;
    defender.damage += attacker.might;
    s = addLog(s, `⚔️ Combat: ${attacker.name} (${attacker.might}) vs ${defender.name} (${defender.might})`);
    s = checkDeaths(s);
    s = { ...s, turnState: 'open' };
  }

  return s;
}

function handleConquer(state: GameState, attacker: GameCard): GameState {
  const active = getActive(state);
  const bf = state.battlefield;

  bf.controller = state.activePlayer;
  bf.contested = false;
  
  let s = { ...state };

  // Final Point Rule: 8th point by Conquer requires "both" battlefields (if 1 BF, you can't win this way)
  if (active.score === state.victoryScore - 1) {
    // In our current 1-battlefield setup, you can't win by Conquer on the 8th point
    if (active.deck.length > 0) {
      const drawn = active.deck.shift()!;
      drawn.zone = 'hand';
      active.hand.push(drawn);
      s = addLog(s, `⚠️ Règle du Point Final : Vous ne pouvez pas gagner par Conquête (8e point). Vous piochez une carte à la place.`);
    } else {
      s = addLog(s, `⚠️ Règle du Point Final : Impossible de gagner par Conquête.`);
    }
  } else {
    active.score += 1;
    s = addLog(s, `🏴 ${active.name} conquiert le Battlefield ! +1 point`);
  }

  s = { ...s, turnState: 'open' };

  if (active.score >= state.victoryScore) {
    return { ...s, gameOver: true, winner: state.activePlayer };
  }

  return s;
}

export function block(state: GameState, attackerUid: string, blockerUid: string): GameState {
  const active = getActive(state);
  const inactive = getInactive(state);

  const attackerList = state.activePlayer === 'player'
    ? state.battlefield.opponentUnits
    : state.battlefield.playerUnits;

  const blockerList = state.activePlayer === 'player'
    ? state.battlefield.playerUnits
    : state.battlefield.opponentUnits;

  const attacker = attackerList.find(c => c.uid === attackerUid);
  const blocker = blockerList.find(c => c.uid === blockerUid);

  if (!attacker || !blocker) return state;

  attacker.damage += blocker.might;
  blocker.damage += attacker.might;

  let s = addLog(state, `🛡️ ${blocker.name} bloque ${attacker.name}`);
  s = checkDeaths(s);
  return { ...s, turnState: 'open' };
}

// ============================================================
// AI (Simple)
// ============================================================

export function runAI(state: GameState): GameState {
  if (state.activePlayer !== 'opponent' || state.gameOver) return state;

  let s = skipToAction(state);

  const opp = s.opponent;
  const energy = calcEnergy(opp);

  // Play cheapest affordable cards
  const playable = [...opp.hand]
    .filter(c => c.energyCost <= energy && (c.type === 'Unit' || c.type === 'Champion' || c.type === 'Spell'))
    .sort((a, b) => b.energyCost - a.energyCost);

  for (const card of playable.slice(0, 2)) {
    if (s.gameOver) break;
    s = playCard(s, card.uid);
  }

  // Move units to battlefield
  for (const unit of [...s.opponent.base]) {
    if (!unit.isExhausted && (unit.type === 'Unit' || unit.type === 'Champion')) {
      s = moveToField(s, unit.uid);
    }
  }

  // Attack with battlefield units
  for (const unit of [...s.battlefield.opponentUnits]) {
    if (unit.canAttack && !unit.isExhausted) {
      s = declareAttack(s, unit.uid);
      if (s.gameOver) break;
    }
  }

  // End turn
  s = processPhase(s); // action → end
  s = processPhase(s); // end → awaken (next player)

  return s;
}
