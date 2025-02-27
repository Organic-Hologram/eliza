export enum PlayerAction {
    FOLD = "fold",
    CHECK = "check",
    CALL = "call",
    RAISE = "raise",
}

export interface PokerDecision {
    action: PlayerAction;
    amount?: number;
}

export interface PlayerState {
    id: string;
    name: string;
    index?: number;
    chips?: number;
    cards?: string[];
    folded?: boolean;
    position?: string;
    currentBet?: number;
}

export interface GameState {
    gameId: string;
    pot: number;
    smallBlind?: {
        amount: number;
        player: string;
    };
    bigBlind?: {
        amount: number;
        player: string;
    };
    communityCards: string[];
    currentBet: number;
    currentPlayerIndex?: number;
    currentPlayerName?: string;
    currentPlayer?: string;
    players: PlayerState[];
    gameState: "waiting" | "preflop" | "flop" | "turn" | "river" | "showdown";
    readyPlayers?: number;
    totalPlayers?: number;
    roundHistory?: string[];
    playerHand?: string[];
    playerChips?: number;
    isGameOver: boolean;
    minRaise?: number;
    maxRaise?: number;
    status?: "waiting" | "playing" | "finished";
    round?: "preflop" | "flop" | "turn" | "river" | "showdown";
    actionHistory?: string[];
}
