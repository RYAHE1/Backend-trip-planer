import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3001;

app.use(express.json());

// Routes

// GET /trips : pour récupérer l'historique des trips.
app.get("/trips", async (req, res) => {
    try {
        const trips = await prisma.trip.findMany();
        res.status(200).json(trips);
    } catch (error) {
        console.log(error);
        res.status(500).json({});
    }
});

// GET /trips/:id : pour récupérer un voyage spécifique.
app.get("/trips/:id", async (req, res) => {
    try {
        const trip = await prisma.trip.findUnique({
            where: { id: Number(req.params.id) },
        });
        res.status(200).json(trip);
    } catch (error) {
        console.log(error);
        res.status(500).json({});
    }
});

// POST /trips : pour créer un nouveau voyage.
app.post("/trips", async (req, res) => {
    const { prompt, output } = req.body;

    if (!prompt || !output) {
        return res.status(400).json({ error: 'The fields "prompt" and "output" are required.' });
    }

    try {
        const trip = await prisma.trip.create({
            data: { prompt, output },
        });
        res.status(200).json(trip);
    } catch (error) {
        console.log(error);
        res.status(500).json({});
    }
});
// PATCH /trips/:id : pour modifier un voyage existant.
app.patch("/trips/:id", async (req, res) => {
    try {
        const trip = await prisma.trip.update({
            where: { id: Number(req.params.id) },
            data: req.body,
        });
        res.status(200).json(trip);
    } catch (error) {
        console.log(error);
        res.status(500).json({});
    }
});

app.listen(port, () => {
    console.log(`http://127.0.0.1:${port}`);
});