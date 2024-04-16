import express from "express";
import dotenv from "dotenv";
import fetch from "node-fetch";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3001;

// Assurez-vous de remplacer 'your_api_key' par votre propre clé API Mistral
const mistralApiKey = process.env.MISTRAL_API_KEY;
const mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions'; // Remplacez par l'URL de l'API Mistral

async function generateItinerary(prompt) {
    try {
        const response = await fetch(mistralApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralApiKey}`
            },
            body: JSON.stringify({
                model: 'open-mistral-7b',
                prompt: prompt,
                max_tokens: 100,
                temperature: 0.7,
                top_p: 1,
                frequency_penalty: 0,
                presence_penalty: 0,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data.choices[0].text;
    } catch (error) {
        console.log(error);
        throw error;
    }
}

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
        const itinerary = await generateItinerary(prompt);
        const trip = await prisma.trip.create({
            data: { prompt, itinerary },
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
