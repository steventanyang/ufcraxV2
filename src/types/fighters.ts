export interface FightScore {
    date: string;
    value: number;
}

export interface Fighter {
    name: string;
    value: number;
    scores: FightScore[];
}

export interface FighterData {
    fighters: Fighter[];
} 