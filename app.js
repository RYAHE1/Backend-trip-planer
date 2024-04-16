import express from "express";
import dotenv from "dotenv";
import https from "https";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
const port = process.env.PORT || 3001;

// Assurez-vous de remplacer 'your_api_key' par votre propre clé API Mistral
const mistralApiKey = 'iZNLEK4woJQqj5Rer3W5oI9NGuMcs4Mk';
const mistralApiUrl = 'https://api.mistral.ai/v1/chat/completions'; // Remplacez par l'URL de l'API Mistral

function generateItinerary(prompt) {
    return new Promise((resolve, reject) => {
        const requestOptions = {
            hostname: mistralApiUrl,
            path: '/v1/chat/completions',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${mistralApiKey}`
            }
        };

        const req = https.request(requestOptions, (res) => {
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`HTTP error! status: ${res.statusCode}`));
            }

            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });

            res.on('end', () => {
                try {
                    const parsedData = JSON.parse(data);
                    resolve(parsedData.choices[0].text);
                } catch (error) {
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(JSON.stringify({
            model: 'open-mistral-7b',
            prompt: prompt,
            max_tokens: 100,
            temperature: 0.7,
            top_p: 1,
            frequency_penalty: 0,
            presence_penalty: 0,
        }));

        req.end();
    });
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
