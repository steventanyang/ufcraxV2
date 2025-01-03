export interface PassDistribution {
  7: number;
  6: number;
  5: number;
  4: number;
}

export interface Fighter {
  name: string;
  value: number;
  scores: Score[];
  active: boolean;
  ownedPasses: number;
  id: number;
  passDistribution: PassDistribution;
  age?: number;
}

export interface Score {
  date: string;
  value: number;
}

export interface FighterData {
  fighters: Fighter[];
}
