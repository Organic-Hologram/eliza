import { elizaLogger } from "@elizaos/core";
import { GameState, PokerDecision } from "./game-state";

export class ApiConnector {
    private baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
        elizaLogger.log("ApiConnector initialized with base URL:", baseUrl);
    }

    async getAvailableGames(): Promise<Array<{ id: string; name: string }>> {
        try {
            // Since there's no endpoint to list all games,
            // we'll create a dummy game entry for the current game
            elizaLogger.log(
                "Creating dummy game entry since no listing endpoint exists"
            );
            return [{ id: "current", name: "Poker Game" }];
        } catch (error) {
            elizaLogger.error("Error fetching available games:", error);
            return [];
        }
    }

    async getGameState(gameId: string): Promise<GameState> {
        try {
            if (!this.playerId) {
                throw new Error("Cannot get game state: Player ID is not set");
            }

            const url = `${this.baseUrl}/api/game/state/${this.playerId}`;
            elizaLogger.log(`Fetching game state from: ${url}`);

            const response = await fetch(url);
            if (!response.ok) {
                const errorText = await response.text();
                elizaLogger.error(
                    `HTTP error (${response.status}): ${errorText}`
                );
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return (await response.json()) as GameState;
        } catch (error) {
            elizaLogger.error(`Error fetching game state:`, error);
            throw error;
        }
    }

    private playerId: string | null = null;

    async joinGame(gameId: string, playerName: string): Promise<string> {
        try {
            const url = `${this.baseUrl}/api/game/join`;
            elizaLogger.log(
                `Joining game at: ${url} with player name: ${playerName}`
            );

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    playerName,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                elizaLogger.error(
                    `HTTP error (${response.status}): ${errorText}`
                );
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            elizaLogger.log(`Successfully joined game, response:`, data);
            this.playerId = data.playerId;

            // Once joined, mark as ready
            await this.setPlayerReady(data.playerId);

            return data.playerId;
        } catch (error) {
            elizaLogger.error(`Error joining game:`, error);
            throw error;
        }
    }

    async setPlayerReady(playerId: string): Promise<void> {
        try {
            const url = `${this.baseUrl}/api/game/ready/${playerId}`;
            elizaLogger.log(`Setting player ready at: ${url}`);

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                elizaLogger.error(
                    `HTTP error (${response.status}): ${errorText}`
                );
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            elizaLogger.log(`Player ready response:`, data);
        } catch (error) {
            elizaLogger.error(`Error setting player ready:`, error);
            throw error;
        }
    }

    async leaveGame(gameId: string, playerId: string): Promise<void> {
        // No explicit leave endpoint in the server, so we'll just log this
        elizaLogger.log(`Player ${playerId} leaving game ${gameId}`);
        this.playerId = null;
    }

    async submitAction(
        gameId: string,
        playerId: string,
        decision: PokerDecision
    ): Promise<void> {
        try {
            const url = `${this.baseUrl}/api/game/move/${playerId}`;
            elizaLogger.log(`Submitting action to: ${url}`, decision);

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    action: decision.action.toLowerCase(), // Server expects lowercase
                    amount: decision.amount,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                elizaLogger.error(
                    `HTTP error (${response.status}): ${errorText}`
                );
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            elizaLogger.log(`Action submission response:`, data);
        } catch (error) {
            elizaLogger.error(`Error submitting action:`, error);
            throw error;
        }
    }

    async createGame(gameName: string, options: any = {}): Promise<string> {
        try {
            const url = `${this.baseUrl}/api/game/new-game`;
            elizaLogger.log(`Creating new game at: ${url}`);

            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                elizaLogger.error(
                    `HTTP error (${response.status}): ${errorText}`
                );
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            elizaLogger.log(`Game creation response:`, data);

            // Return a dummy game ID since the server doesn't return one
            return "current";
        } catch (error) {
            elizaLogger.error("Error creating game:", error);
            throw error;
        }
    }
}
