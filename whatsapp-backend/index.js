require("dotenv").config();

const express = require("express");
const axios = require("axios");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

// Health check
app.get("/", (req, res) => {
    res.json({
        message: "ChurchBuddy WhatsApp Backend is running!"
    });
});

// Check Python backend
app.get("/api/check-python", async (req, res) => {
    try {
        const response = await fetch("http://127.0.0.1:8000/docs");

        res.json({
            message: "Python backend connection successful!",
            python_status: response.status
        });
    } catch (error) {
        res.status(500).json({
            message: "Could not connect to Python backend",
            error: error.message
        });
    }
});

// Send WhatsApp test message
app.post("/send-message", async (req, res) => {
    try {
        const { recipient } = req.body;

        if (!recipient) {
            return res.status(400).json({
                error: "Recipient phone number is required"
            });
        }

        const token = process.env.WHATSAPP_TOKEN;
        const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

        const response = await axios.post(
            `https://graph.facebook.com/v25.0/${phoneNumberId}/messages`,
            {
                messaging_product: "whatsapp",
                to: recipient.replace(/\D/g, ""),
                type: "template",
                template: {
                    name: "hello_world",
                    language: {
                        code: "en_US"
                    }
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.json({
            message: "WhatsApp message sent successfully!",
            result: response.data
        });

    } catch (error) {
        res.status(500).json({
            message: "Failed to send WhatsApp message",
            error: error.response?.data || error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`WhatsApp backend running on http://localhost:${PORT}`);
});