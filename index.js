const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const axios = require('axios');

// Solo necesitamos la llave de Voiceflow ahora
const VF_API_KEY = process.env.VF_API_KEY;

// Configuramos el cliente para que funcione en los servidores de Render
const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    }
});

// Paso 1: Generar el QR en la consola
client.on('qr', (qr) => {
    console.log('¡Escanea este código QR con el WhatsApp del negocio!');
    qrcode.generate(qr, { small: true });
});

// Paso 2: Avisar cuando esté conectado
client.on('ready', () => {
    console.log('¡Teléfono conectado exitosamente! El bot está escuchando...');
});

// Paso 3: Escuchar mensajes y enviarlos a Voiceflow
client.on('message', async msg => {
    // Ignorar mensajes de estado/historias
    if (msg.from === 'status@broadcast') return;

    const phone_number = msg.from;
    const msg_text = msg.body;

    console.log(`Mensaje de ${phone_number}: ${msg_text}`);

    try {
        // Enviar a Voiceflow
        const vfResponse = await axios({
            method: 'POST',
            url: `https://general-runtime.voiceflow.com/state/user/${phone_number}/interact`,
            headers: { 
                'Authorization': VF_API_KEY,
                'versionID': 'development',
                'accept': 'application/json',
                'content-type': 'application/json'
            },
            data: { action: { type: 'text', payload: msg_text } }
        });

        // Devolver la respuesta al cliente
        for (const trace of vfResponse.data) {
            if (trace.type === 'text') {
                await client.sendMessage(msg.from, trace.payload.message);
            }
        }
    } catch (error) {
        console.error('Error con Voiceflow:', error.message);
    }
});

// Arrancar el bot
client.initialize();
