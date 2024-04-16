// app.js

import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3001;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;

app.use(cors());
app.use(express.json());

// GET /trips : pour récupérer l'historique des trips.
app.get("/trips", async (req, res) => {
    try {
        const trips = await prisma.trip.findMany();
        res.status(200).json(trips);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la récupération des voyages." });
    }
});

// GET /trips/:id : pour récupérer un voyage 
app.get("/trips/:id", async (req, res) => {
    try {
        const tripId = Number(req.params.id);

        if (isNaN(tripId)) {
            return res.status(400).json({ error: "L'identifiant du voyage doit être un nombre." });
        }

        const trip = await prisma.trip.findUnique({
            where: { id: tripId },
        });

        if (!trip) {
            return res.status(404).json({ error: "Le voyage demandé n'existe pas." });
        }

        res.status(200).json(trip);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la récupération du voyage." });
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
        if (!MISTRAL_API_KEY) {
            throw new Error("MISTRAL_API_KEY is not defined.");
        }

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
                    model: "open-mixtral-8x7b",
                    messages: [{ role: "user", content: prompt }],
                }),
            }
        );

        if (!mistralResponse.ok) {
            throw new Error(`API Mistral returned status ${mistralResponse.status}`);
        }

        const mistralData = await mistralResponse.json();

        // Utiliser la réponse de l'API Mistral pour créer un nouveau voyage
        const trip = await prisma.trip.create({
            data: { prompt, output: mistralData.choices[0].message.content },
        });

        res.status(200).json(trip);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la création du voyage." });
    }
});

// PATCH /trips/:id : pour modifier un voyage existant.
app.patch("/trips/:id", async (req, res) => {
    try {
        const { prompt } = req.body;
        const tripId = Number(req.params.id);

        if (isNaN(tripId)) {
            return res.status(400).json({ error: "L'identifiant du voyage doit être un nombre." });
        }

        const updatedTrip = await prisma.trip.update({
            where: { id: tripId },
            data: { prompt },
        });

        if (!updatedTrip) {
            return res.status(404).json({ error: "Le voyage demandé n'existe pas." });
        }

        res.status(200).json(updatedTrip);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Une erreur s'est produite lors de la mise à jour du voyage." });
    }
});

app.listen(port, () => {
    console.log(`http://127.0.0.1:${port}`);
});