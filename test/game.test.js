import test from "node:test";
import assert from "node:assert";
import { getGame, reinforce } from "../DAL/game.dal.js";
import { gamesCollection } from "../db/config.db.js";

test("getGame success", async () => {
    gamesCollection.findOne = async () => {
        return {
            _id: "64b1f2e1a3c4d5e6f7a8b9c0",
            playerName: "nehoray",
            status: "playing",
            round: 1,
            phase: "reinforce",
            territories: []
        };
    };

    const game = await getGame("64b1f2e1a3c4d5e6f7a8b9c0");
    assert.equal(game.id, "64b1f2e1a3c4d5e6f7a8b9c0");
    assert.equal(game.playerName, "Dana");
});

test("getGame not found", async () => {
    gamesCollection.findOne = async () => {
        return null;
    };

    try {
        await getGame("64b1f2e1a3c4d5e6f7a8b9c0");
        assert.fail("should throw error");
    } catch (err) {
        assert.equal(err.status, 404);
    }
});

test("reinforce add soldiers", async () => {
    gamesCollection.findOne = async () => {
        return {
            _id: "64b1f2e1a3c4d5e6f7a8b9c0",
            status: "playing",
            phase: "reinforce",
            territories: [
                { id: 10, owner: "player", soldiers: 4 }
            ]
        };
    };
    gamesCollection.updateOne = async () => {
        return {};
    };

    const res = await reinforce("64b1f2e1a3c4d5e6f7a8b9c0", 10);
    assert.equal(res.game.territories[0].soldiers, 7);
    assert.equal(res.game.phase, "attack");
    assert.equal(res.playerEvent.soldiersAdded, 3);
});

test("reinforce wrong owner", async () => {
    gamesCollection.findOne = async () => {
        return {
            _id: "64b1f2e1a3c4d5e6f7a8b9c0",
            status: "playing",
            phase: "reinforce",
            territories: [
                { id: 2, owner: "computer", soldiers: 8 }
            ]
        };
    };

    try {
        await reinforce("64b1f2e1a3c4d5e6f7a8b9c0", 2);
        assert.fail("should throw error");
    } catch (err) {
        assert.equal(err.status, 400);
    }
});