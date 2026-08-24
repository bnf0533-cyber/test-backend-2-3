import { MongoClient } from "mongodb";
import "dotenv/config";
import fs from "fs/promises";

export const client = new MongoClient(process.env.MONGO_URI || "mongodb://127.0.0.1:27017");

export const db = client.db(process.env.DB_NAME || "game-war");
export const mapsCollection = db.collection("maps");
export const gamesCollection = db.collection("games");

export async function createConnect() {
    try {
        await client.connect();
        console.log("mongo connect successfully...");
        const count = await mapsCollection.countDocuments();        
        if (count === 0) {
            const data = await fs.readFile("./map.json", "utf-8");
            const mapList = JSON.parse(data);
            await mapsCollection.insertMany(mapList);
            console.log("map added successfully");
        }
    } catch (error) {
        console.log("failed to connect", error);
        process.exit(1);
    }
}
