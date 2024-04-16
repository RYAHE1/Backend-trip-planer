import express from "express";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";
dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3001;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY; // Assurez-vous que cette variable d'environnement est définie

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
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'The field "prompt" is required.' });
    }

    try {
        // Envoyer une requête à l'API Mistral
        const mistralResponse = await fetch(
            "https://api.mistral.ai/v1/chat/completions",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${MISTRAL_API_KEY}`,
                },
                body: JSON.stringify({
                    model: "open-mistral-7b",
                    messages: [{ role: "user", content: prompt }],
                }),
            }
        );

        const mistralData = await mistralResponse.json();

        // Utiliser la réponse de l'API Mistral pour créer un nouveau voyage
        const trip = await prisma.trip.create({
            data: { prompt, output: mistralData.choices[0].message.content },
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
        const { prompt } = req.body;
        const trip = await prisma.trip.update({
            where: { id: Number(req.params.id) },
            data: { prompt },
        });
        res.status(200).json(trip);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la mise à jour du voyage." });
    }
});

app.listen(port, () => {
    console.log(`http://127.0.0.1:${port}`);
});
