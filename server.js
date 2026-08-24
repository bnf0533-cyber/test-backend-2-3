import express from 'express';
import 'dotenv/config';
import { createConnect } from './db/config.db.js';
import cors from "cors";
import gameRouter from './routes/game.route.js';

const PORT = process.env.PORT || 3001

const app = express()

app.use(express.json())
app.use(cors())
app.use("/",gameRouter)



createConnect().then(() => {
    app.listen(PORT,()=>{
        console.log(`server running on port ${PORT}...`);
    })
})