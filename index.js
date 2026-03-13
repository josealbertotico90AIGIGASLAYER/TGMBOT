const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

// Variables de entorno (Las contraseñas que configuraremos en Render)
const { META_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, VF_API_KEY } = process.env;

// 1. RUTA DE VERIFICACIÓN (Para que Meta confirme que el Webhook es tuyo)
app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('¡Webhook verificado por Meta!');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

// 2. RUTA DE MENSAJES (Recibe de WhatsApp, manda a Voiceflow, devuelve a WhatsApp)
app.post('/webhook', async (req, res) => {
    try {
        let body = req.body;

        // Verificar que es un mensaje de WhatsApp
        if (body.object && body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            let msg = body.entry[0].changes[0].value.messages[0];
            let phone_number = msg.from; // Número del usuario
            let msg_text = msg.text.body; // Texto que escribió el usuario

            console.log(Mensaje recibido de ${phone_number}: ${msg_text});

            // A) Enviar el mensaje a Voiceflow
            const vfResponse = await axios({
                method: 'POST',
                url: https://general-runtime.voiceflow.com/state/user/${phone_number}/interact,
                headers: { 
                    'Authorization': VF_API_KEY,
                    'accept': 'application/json',
                    'content-type': 'application/json'
                },
                data: { action: { type: 'text', payload: msg_text } }
            });

            // B) Leer lo que respondió Voiceflow
            for (const trace of vfResponse.data) {
                if (trace.type === 'text') {
                    let bot_reply = trace.payload.message;

                    // C) Enviar la respuesta de Voiceflow de vuelta a WhatsApp
                    await axios({
                        method: 'POST',
                        url: https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages,
                        headers: { 
                            'Authorization': Bearer ${META_TOKEN},
                            'Content-Type': 'application/json'
                        },
                        data: {
                            messaging_product: 'whatsapp',
                            to: phone_number,
                            text: { body: bot_reply }
                        }
                    });
                }
            }
        }
        res.sendStatus(200); // Decirle a Meta que todo salió bien
    } catch (error) {
        console.error('Error procesando el mensaje:', error);
        res.sendStatus(500);
    }
});

// Encender el servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(Servidor corriendo en el puerto ${PORT}));
