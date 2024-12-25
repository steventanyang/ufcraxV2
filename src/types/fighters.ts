export interface Fighter {
  name: string;
  value: number;
  scores: Score[];
  active: boolean;
  ownedPasses: number;
}

export interface Score {
  date: string;
  value: number;
}

export interface FighterData {
  fighters: Fighter[];
}
