import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import fetch from "node-fetch";

dotenv.config();

const prisma = new PrismaClient();
export const app = express();
const port = process.env.PORT || 3001;
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY;
const MISTRAL_API_ENDPOINT = process.env.MISTRAL_API_ENDPOINT;
const MISTRAL_MODEL = process.env.MISTRAL_MODEL;

app.use(cors());
app.use(express.json());

// GET /trips : pour récupérer l'historique des trips.
app.get("/trips", async (req, res) => {
    try {
        const trips = await prisma.trip.findMany();
        res.status(200).json(trips);

        // un tri par date desc
        // limiter le nb de resultats à 5
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Une erreur s'est produite" });
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
        res.status(500).json({ error: "Une erreur s'est produite" });
    }
});

// POST /trips : pour créer un nouveau voyage.
const prePrompt = "Tu es un planificateur de voyage, expert en tourisme. Pour la destination, le nombre de jours et le moyen de locomotion que je te donnerai à la fin du message, programme moi un itinéraire en plusieurs étapes Format de données souhaité: une liste d'élement en JSON, avec, pour chaque étape: - le nom du lieu (clef JSON: name) -sa position géographique (clef JSON: location-> avec latitude/longitude en numérique) - une courte description du lieu (clef JSON: description) Donne-moi uniquement cette liste d'étape JSON, tu as interdiction de rajouter des informations supplémentaires en dehors de la liste JSON.Tu ne dois pas rajouter de texte ou des commentaires après m'avoir envoyé la liste JSON.";

app.post("/trips", async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'une phrase est demander' });
    }

    try {
        // Envoyer une requête à l'API Mistral
        if (!MISTRAL_API_KEY) {
            throw new Error("MISTRAL_API_KEY is not defined.");
        }

        const mistralResponse = await fetch(
            MISTRAL_API_ENDPOINT,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${MISTRAL_API_KEY}`,
                },
                body: JSON.stringify({
                    model: MISTRAL_MODEL,
                    messages: [{ role: "user", content: prePrompt + " " + prompt }],
                }),
            }
        );

        if (!mistralResponse.ok) {
            throw new Error(`API Mistral returned status ${mistralResponse.status}`);
        }

        const mistralData = await mistralResponse.json();

        // Utiliser la réponse de l'API Mistral pour créer un nouveau voyage
        const trip = await prisma.trip.create({
            data: { prompt, output: JSON.parse(mistralData.choices[0].message.content) },
        });

        res.status(200).json(trip);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Une erreur s'est produite" });
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
            data: { prompt, updatedAt: new Date() },
        });

        if (!updatedTrip) {
            return res.status(404).json({ error: "Le voyage demandé n'existe pas." });
        }

        res.status(200).json(updatedTrip);
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Une erreur s'est produite" });
    }
});

app.listen(port, () => {
    console.log(`Server running at ${process.env.APP_URL}`);
});
