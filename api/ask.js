import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { question, vehicle, selectedPart } = req.body ?? {};

    if (!question || typeof question !== "string") {
      return res.status(400).json({ error: "Missing question" });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: "OPENAI_API_KEY is not configured" });
    }

    const response = await client.responses.create({
      model: "gpt-6-astra",
      reasoning: { effort: "medium" },
      input: [
        {
          role: "system",
          content: `Ești un expert tehnic pentru Audi A4 B9 (8W).
Răspunde în română, clar și tehnic.
Separă mereu: fapte generale, ce depinde de motorizare/VIN, pași de verificare și riscuri.
Nu inventa coduri OEM, cupluri de strângere, valori de adaptare sau proceduri de service.
Dacă informația exactă depinde de VIN/cod motor/cod cutie/PR-code, spune explicit acest lucru.
Pentru diagnoză, oferă o ordine logică de verificare, nu o certitudine falsă.
Nu recomanda dezactivarea sistemelor de siguranță sau emisii.`
        },
        {
          role: "user",
          content: JSON.stringify({ vehicle, selectedPart, question }, null, 2)
        }
      ]
    });

    return res.status(200).json({ answer: response.output_text });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "AI request failed" });
  }
}
