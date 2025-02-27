# Cliente de Poker para Eliza

Este pacote implementa um cliente para o sistema Eliza que permite integração com um jogo de Poker baseado em API.

## Instalação

```bash
cd packages/client-poker
pnpm install
pnpm build
```

Em seguida, adicione-o ao agente:

```bash
cd ../../agent
pnpm add @elizaos/client-poker@workspace:*
```

## Configuração

Crie um arquivo de personagem para seu agente jogador de poker em `characters/poker-player.json`:

```json
{
    "name": "TexasHoldBot",
    "archetype": "Jogador de Poker Profissional",
    "personality": "Calculista, paciente e observador.",
    "background": "Um experiente jogador de poker que ganhou vários torneios importantes.",
    "clients": ["poker"],
    "plugins": ["plugin-bootstrap"],
    "parameters": {
        "pokerStyle": "tight-aggressive",
        "model": "gpt-4o"
    }
}
```

## Variáveis de Ambiente

Configure a URL da API de Poker usando a variável de ambiente `POKER_API_URL`. Se não especificada, o cliente usará `http://localhost:3000` como padrão.

```bash
export POKER_API_URL=http://localhost:3000
```

## Uso

Execute o Eliza com o personagem jogador de poker:

```bash
pnpm start --characters="characters/poker-player.json"
```

## Sobre o Cliente

Este cliente foi projetado para se conectar automaticamente ao servidor de Poker, entrar em jogos disponíveis e tomar decisões com base na análise do estado do jogo usando a IA do Eliza.

### Funcionalidades

-   Detecção automática de jogos disponíveis
-   Entrada automática em jogos
-   Tomada de decisões baseada em IA usando o sistema Eliza
-   Gerenciamento de estado do jogo
-   Comunicação com API RESTful do jogo de Poker

### Adaptação

É possível que você precise modificar alguns aspectos deste cliente para adequá-lo à implementação específica do servidor de Poker. As principais áreas que podem exigir adaptação são:

1. Endpoints da API em `api-connector.ts`
2. Formato do estado do jogo em `game-state.ts`
3. Mecanismo de tomada de decisão em `poker-client.ts`
