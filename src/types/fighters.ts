export interface FightScore {
  date: string;
  value: number;
}

export interface Fighter {
  name: string;
  value: number;
  scores: FightScore[];
  active: boolean;
}

export interface FighterData {
  fighters: Fighter[];
}
