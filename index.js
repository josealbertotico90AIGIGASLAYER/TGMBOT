const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const { META_TOKEN, PHONE_NUMBER_ID, VERIFY_TOKEN, VF_API_KEY } = process.env;

app.get('/webhook', (req, res) => {
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    if (mode && token) {
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            console.log('¡Webhook verificado!');
            res.status(200).send(challenge);
        } else {
            res.sendStatus(403);
        }
    }
});

app.post('/webhook', async (req, res) => {
    try {
        let body = req.body;
        if (body.object && body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages) {
            let msg = body.entry[0].changes[0].value.messages[0];
            let phone_number = msg.from;
            let msg_text = msg.text.body;

            // ESTA ES LA LÍNEA QUE TENÍA EL ERROR (Ya corregida con backticks )
            console.log(Mensaje recibido de ${phone_number}: ${msg_text});

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

            for (const trace of vfResponse.data) {
                if (trace.type === 'text') {
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
                            text: { body: trace.payload.message }
                        }
                    });
                }
            }
        }
        res.sendStatus(200);
    } catch (error) {
        console.error('Error:', error.message);
        res.sendStatus(500);
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(Servidor activo en puerto ${PORT}`));
