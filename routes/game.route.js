import express from "express";
import {
    createGame,
    getGame,
    reinforce,
    attack,
    move,
    endTurn,
} from "../DAL/game.dal.js";

const router = express.Router();

router.post("/games", async (req, res) => {
    try {
        const { playerName } = req.body;
        const game = await createGame(playerName);
        res.status(201).json(game);
    } catch (error) {
        console.error(error);
        res.status(error.status || 500).json({
            error: error.message || "server error",
        });
    }
});

router.get("/games/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const game = await getGame(id);
        res.status(200).json(game);
    } catch (error) {
        res.status(error.status || 500).json({
            error: error.message || "server error",
        });
    }
});

router.post("/games/:id/reinforce", async (req, res) => {
    try {
        const { id } = req.params;
        const { territoryId } = req.body;
        const result = await reinforce(id, territoryId);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            error: error.message || "server error",
        });
    }
});
router.post("/games/:id/attack", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await attack(id, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            error: error.message || "server error",
        });
    }
});

router.post("/games/:id/move", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await move(id, req.body);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            error: error.message || "server error",
        });
    }
});

router.post("/games/:id/end-turn", async (req, res) => {
    try {
        const { id } = req.params;
        const result = await endTurn(id);
        res.status(200).json(result);
    } catch (error) {
        res.status(error.status || 500).json({
            error: error.message || "server error",
        });
    }
});

export default router;
