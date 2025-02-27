import { Client, IAgentRuntime, UUID, elizaLogger } from "@elizaos/core";
import { GameState, PlayerAction, PokerDecision } from "./game-state";
import { ApiConnector } from "./api-connector";

export class PokerClient implements Client {
    type = "poker"; // Identificador para o sistema Eliza
    private runtime: IAgentRuntime | null = null;
    private apiConnector: ApiConnector;
    private gameState: GameState | null = null;
    private gameId: string | null = null;
    private playerId: string | null = null;
    private intervalId: NodeJS.Timeout | null = null;
    private resetFailedCount = 0;

    constructor(apiBaseUrl: string = "http://localhost:3001") {
        this.apiConnector = new ApiConnector(apiBaseUrl);
        elizaLogger.log("Poker client created with API endpoint:", apiBaseUrl);
    }

    async start(runtime?: IAgentRuntime): Promise<any> {
        if (!runtime) {
            throw new Error("Runtime is required for PokerClient");
        }

        this.runtime = runtime;
        elizaLogger.log("PokerClient starting...");

        // Iniciar polling para verificar jogos disponíveis
        this.intervalId = setInterval(async () => {
            try {
                // Se não estiver em um jogo, tentar juntar-se
                if (!this.playerId) {
                    const availableGames =
                        await this.apiConnector.getAvailableGames();
                    if (availableGames.length > 0) {
                        // Entrar no primeiro jogo disponível
                        await this.joinGame(availableGames[0].id);
                    }
                }
                // Se estiver em um jogo, verificar atualizações
                else if (this.gameId) {
                    try {
                        const gameState = await this.apiConnector.getGameState(
                            this.gameId
                        );
                        await this.handleGameUpdate(gameState);
                    } catch (error) {
                        elizaLogger.error("Error getting game state:", error);
                        // On error, reset the game connection after a few tries
                        this.resetFailedCount =
                            (this.resetFailedCount || 0) + 1;
                        if (this.resetFailedCount > 5) {
                            elizaLogger.log(
                                "Too many failures, resetting connection"
                            );
                            this.playerId = null;
                            this.gameId = null;
                            this.resetFailedCount = 0;
                        }
                    }
                }
            } catch (error) {
                elizaLogger.error("Error in poker client polling:", error);
            }
        }, 2000);

        return this;
    }

    async stop(): Promise<void> {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }

        if (this.gameId && this.playerId) {
            try {
                await this.apiConnector.leaveGame(this.gameId, this.playerId);
            } catch (error) {
                elizaLogger.error("Error leaving game:", error);
            }
        }

        elizaLogger.log("PokerClient stopped");
    }

    async joinGame(gameId: string): Promise<void> {
        try {
            const name = this.runtime?.character.name || "ElizaPokerBot";
            this.playerId = await this.apiConnector.joinGame(gameId, name);
            this.gameId = gameId;
            elizaLogger.log(
                `Agent joined game ${gameId} as player ${this.playerId}`
            );
        } catch (error) {
            elizaLogger.error("Failed to join game:", error);
        }
    }

    private async handleGameUpdate(gameState: GameState): Promise<void> {
        this.gameState = gameState;
        this.resetFailedCount = 0;

        elizaLogger.log("Game state update:", {
            gameId: gameState.gameId,
            gameState: gameState.gameState,
            currentPlayerIndex: gameState.currentPlayerIndex,
            currentPlayerName: gameState.currentPlayerName,
            playerId: this.playerId,
        });

        // Verificar se é a vez do agente jogar
        const isPlayerTurn =
            // Check using currentPlayer directly if available
            (gameState.currentPlayer &&
                gameState.currentPlayer === this.playerId) ||
            // Or check by comparing player names
            (gameState.currentPlayerName &&
                this.runtime?.character.name === gameState.currentPlayerName);

        if (isPlayerTurn) {
            elizaLogger.log("It's the agent's turn to play");

            // Aguardar um pouco para parecer mais humano
            await new Promise((resolve) =>
                setTimeout(resolve, 1500 + Math.random() * 2000)
            );

            try {
                const decision = await this.makeDecision(gameState);
                await this.apiConnector.submitAction(
                    this.gameId!,
                    this.playerId!,
                    decision
                );
            } catch (error) {
                elizaLogger.error(
                    "Error making or submitting decision:",
                    error
                );
            }
        }
    }

    private async makeDecision(gameState: GameState): Promise<PokerDecision> {
        if (!this.runtime) return { action: PlayerAction.FOLD };

        // Preparar contexto para o modelo
        const context = this.prepareGameContext(gameState);

        // Consultar o agente para tomar uma decisão
        elizaLogger.log("Asking agent for poker decision");

        const response = await this.runtime.generateText({
            systemPrompt: `Você é um jogador de poker experiente chamado ${
                this.runtime.character.name || "PokerBot"
            }.
                          Seu objetivo é maximizar seus ganhos usando estratégia.
                          Analise a situação atual e tome a melhor decisão possível.
                          IMPORTANTE: Responda APENAS com a ação e valor se aplicável, como "FOLD", "CHECK", "CALL", ou "RAISE 100".`,
            prompt: context,
            roomId: this.gameId as UUID,
        });

        // Analisar a resposta para extrair a ação
        const decision = this.parseAgentResponse(response);
        elizaLogger.log(`Agent decision: ${JSON.stringify(decision)}`);
        return decision;
    }

    private prepareGameContext(gameState: GameState): string {
        const playerInfo = gameState.players.find(
            (p) => p.id === this.playerId
        );

        if (!playerInfo) {
            return "Não foi possível encontrar suas informações no jogo. Decisão: FOLD";
        }

        // Use either playerHand from game state or cards from playerInfo
        const playerCards = gameState.playerHand?.length
            ? gameState.playerHand
            : playerInfo.cards || [];

        // Use either playerChips from game state or chips from playerInfo
        const playerChips =
            gameState.playerChips !== undefined
                ? gameState.playerChips
                : playerInfo.chips || 0;

        return `
Situação atual do jogo de Poker:
=================================
Suas cartas: ${playerCards.join(", ") || "Nenhuma carta na mão ainda"}
Cartas na mesa: ${
            gameState.communityCards.join(", ") ||
            "Nenhuma carta revelada ainda"
        }
Pot atual: ${gameState.pot}
Suas fichas: ${playerChips}
Valor para igualar (call): ${gameState.currentBet || 0}
Aposta mínima para aumentar: ${
            gameState.minRaise || gameState.currentBet * 2 || 20
        }

Jogadores ativos: ${gameState.players.length}
Sua posição: ${playerInfo.position || "N/A"}

Histórico de ações desta mão:
${
    gameState.roundHistory?.join("\n") ||
    gameState.actionHistory?.join("\n") ||
    "Primeira rodada de apostas"
}

Estado do jogo: ${gameState.gameState || gameState.round || "Esperando"}

Suas opções:
1. FOLD (Desistir) - Você descarta suas cartas e sai desta mão
2. CHECK (Passar) - Disponível apenas se não houver aposta para igualar
3. CALL (Igualar) - Igualar a aposta atual de ${gameState.currentBet || 0}
4. RAISE [valor] (Aumentar) - Aumentar a aposta para um novo valor

Qual é a sua decisão? Responda apenas com a ação e valor se aplicável.
`;
    }

    private parseAgentResponse(response: string): PokerDecision {
        const responseText = response.toUpperCase();

        if (responseText.includes("FOLD")) {
            return { action: PlayerAction.FOLD };
        } else if (responseText.includes("CHECK")) {
            return { action: PlayerAction.CHECK };
        } else if (responseText.includes("CALL")) {
            return { action: PlayerAction.CALL };
        } else if (responseText.includes("RAISE")) {
            // Tentar extrair o valor da aposta
            const match = responseText.match(/RAISE\s+(\d+)/i);
            const amount = match ? parseInt(match[1]) : 0;

            return {
                action: PlayerAction.RAISE,
                amount: amount || this.gameState?.minRaise || 0,
            };
        }

        // Padrão: fold para segurança
        elizaLogger.warn(
            `Could not parse agent response: "${response}". Defaulting to FOLD.`
        );
        return { action: PlayerAction.FOLD };
    }
}
