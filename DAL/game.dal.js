import { createError, formatGame } from "../utils/utils.js";
import { gamesCollection, mapsCollection } from "../db/config.db.js";
import { ObjectId } from "bson";

async function saveGame(game) {
    const gameId = new ObjectId(game.id);
    const updateGame = {
        playerName: game.playerName,
        round: game.round,
        phase: game.phase,
        status: game.status,
        winner: game.winner,
        territories: game.territories,
    };
    await gamesCollection.updateOne({ _id: gameId }, { $set: updateGame });
    return game;
}

export async function createGame(playerName) {
    if (playerName === "" || !playerName || typeof playerName !== "string") {
        throw createError(400, "bad request");
    }
    playerName = playerName.trim();

    const map = await mapsCollection.find().toArray();
    if (!map || map.length === 0) {
        throw createError(500, "map details missing");
    }
    const territories = map.map((t) => ({
        id: t.id,
        name: t.name,
        x: t.x,
        y: t.y,
        neighbors: t.neighbors,
        startOwner: t.startOwner,
        headquarters: Boolean(t.headquarters),
        distanceFromComputerHQ: t.distanceFromComputerHQ,
        distanceFromPlayerHQ: t.distanceFromPlayerHQ,
        owner: t.startOwner,
        soldiers: t.headquarters ? 8 : 4,
    }));

    const newGame = {
        playerName,
        round: 1,
        phase: "reinforce",
        status: "playing",
        winner: null,
        territories,
    };
    const result = await gamesCollection.insertOne(newGame);
    newGame._id = result.insertedId;
    return formatGame(newGame);
}

export async function getGame(id) {
    if (!ObjectId.isValid(id)) {
        throw createError(404, "game not found");
    }
    const gameGet = await gamesCollection.findOne({ _id: new ObjectId(id) });
    if (!gameGet) {
        throw createError(404, "game not found");
    }
    return formatGame(gameGet);
}

export async function reinforce(gameId, territoryId) {
    const game = await getGame(gameId);

    if (game.status === "finished")
        throw createError(409, "the game is finish");
    if (game.phase !== "reinforce")
        throw createError(400, "you are currently not in reinforcement mode");
    const target = game.territories.find((t) => t.id === Number(territoryId));
    if (!target || target.owner !== "player")
        throw createError(400, "illegal territory to strengthen");
    target.soldiers += 3;
    game.phase = "attack";
    await saveGame(game);
    const playerEvent = {
        type: "reinforce",
        territoryId: target.id,
        soldiersAdded: 3,
    };
    return { game, playerEvent, computerEvents: [] };
}

export async function attack(gameId, body) {
    const game = await getGame(gameId);
    if (game.status === "finished")
        throw createError(409, "the game is finish");
    if (game.phase !== "attack")
        throw createError(400, "you are currently not in attack mode");
    if (body && body.skip) {
        game.phase = "move";
        await saveGame(game);
        return {
            game,
            playerEvent: null,
            computerEvents: [],
        };
    }
    const fromId = Number(body?.fromId);
    const toId = Number(body?.toId);
    const soldiers = Number(body?.soldiers);
    if (!Number.isInteger(soldiers) || soldiers < 1) {
        throw createError(400, "wrong number");
    }
    const from = game.territories.find((t) => t.id === fromId);
    const to = game.territories.find((t) => t.id === toId);
    if (!from || from.owner !== "player")
        throw createError(400, "illegal source territory");
    if (!to || to.owner !== "computer")
        throw createError(400, "illegal target territory");
    if (!from.neighbors.includes(toId))
        throw createError(
            400,
            "the destination is not a neighbor of the source"
        );
    if (soldiers > from.soldiers - 1)
        throw createError(400, "must leave at least one soldier at the source");

    const attackLuck = 0.6 + Math.random() * 0.4;
    const defenseLuck = 0.6 + Math.random() * 0.4;
    const attackPower = soldiers * attackLuck;
    const defensePower = to.soldiers * defenseLuck;

    let winner = "computer";
    if (attackPower > defensePower) {
        winner = "player";
        const survivors = Math.max(
            1,
            Math.ceil((soldiers * (attackPower - defensePower)) / attackPower)
        );
        from.soldiers -= soldiers;
        to.owner = "player";
        to.soldiers = survivors;
        if (to.headquarters) {
            game.status = "finished";
            game.winner = "player";
        }
    } else {
        const survivors = Math.max(
            1,
            Math.ceil(
                (to.soldiers * (defensePower - attackPower)) / defensePower
            )
        );
        from.soldiers -= soldiers;
        to.soldiers = survivors;
    }
    if (game.status !== "finished") {
        game.phase = "move";
    }
    await saveGame(game);
    const playerEvent = {
        type: "attack",
        fromId,
        toId,
        soldiers,
        winner,
    };
    return {
        game,
        playerEvent,
        computerEvents: [],
    };
}

export async function move(gameId, body) {
    const game = await getGame(gameId);
    if (game.status === "finished")
        throw createError(409, "the game is finish");
    if (game.phase !== "move")
        throw createError(400, "no forces are being transferred at the moment");
    const fromId = Number(body?.fromId);
    const toId = Number(body?.toId);
    const soldiers = Number(body?.soldiers);
    if (!Number.isInteger(soldiers) || soldiers < 1)
        throw createError(400, "wrong number");
    if (fromId === toId)
        throw createError(400, "the source and target must be different");
    const from = game.territories.find((t) => t.id === fromId);
    const to = game.territories.find((t) => t.id === toId);
    if (!from || from.owner !== "player")
        throw createError(400, "illegal source territory");
    if (!to || to.owner !== "player")
        throw createError(400, "illegal target territory");
    if (!from.neighbors.includes(toId))
        throw createError(
            400,
            "the destination is not a neighbor of the source"
        );
    if (soldiers > from.soldiers - 1)
        throw createError(400, "must leave at least one soldier at the source");
    from.soldiers -= soldiers;
    to.soldiers += soldiers;
    const playerEvent = {
        type: "move",
        fromId,
        toId,
        soldiers,
    };
    // const computerEvents = runComputerTurn(game);
    await saveGame(game);
    return {
        game,
        playerEvent,
        computerEvents: [],
    };
}

export async function endTurn(gameId) {
    const game = await getGame(gameId);
    if (game.status === "finished")
        throw createError(409, "the game is finish");
    if (game.phase !== "move")
        throw createError(400, "the game phase is not the end of a turn");
    // const computerEvents = runComputerTurn(game);
    await saveGame(game);
    return {
        game,
        playerEvent: null,
        computerEvents: [],
    };
}

function getMinDistanceToComputerHQ(territories) {
    const playerTerritories = territories.filter((t) => t.owner === "player");
    const minDistance = Math.min(
        ...playerTerritories.map((t) => t.distanceFromComputerHQ)
    );
    return minDistance;
}

function computerReinforce(game, isDefensive) {
    const computerTerritories = game.territories.filter(
        (t) => t.owner === "computer"
    );
    let targets = computerTerritories.filter((t) =>
        t.neighbors.some((nid) => {
            const neighbor = game.territories.find((item) => item.id === nid);
            return neighbor && neighbor.owner === "player";
        })
    );
    if (targets.length === 0) {
        targets = computerTerritories;
    }
    if (isDefensive) {
        targets.sort(
            (a, b) =>
                a.distanceFromComputerHQ - b.distanceFromComputerHQ ||
                a.soldiers - b.soldiers ||
                a.id - b.id
        );
    } else {
        targets.sort(
            (a, b) =>
                a.distanceFromPlayerHQ - b.distanceFromPlayerHQ ||
                b.soldiers - a.soldiers ||
                a.id - b.id
        );
    }
    const chosen = targets[0];
    if (!chosen) return null;
    chosen.soldiers += 3;
    return {
        type: "reinforce",
        territoryId: chosen.id,
        soldiersAdded: 3,
    };
}

// export async function runComputerTurn(game) {
//     const computerEvents = [];

//     if (playerTerritories.length === 0) return computerEvents;
//     const minDistance = Math.min(
//         ...playerTerritories.map((t) => t.distanceFromComputerHQ)
//     );
//     const isDefensive = minDistance <= 2;
//     const computerTerritories = game.territories.filter(
//         (t) => t.owner === "computer"
//     );
// }
