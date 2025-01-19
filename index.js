const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware pro zpracování JSON a CORS
app.use(bodyParser.json());
app.use(cors());

// Google Sheets konfigurace
const keyFile = path.join(__dirname, 'test-calendar-351811-66c2979693c0.json');
const auth = new google.auth.GoogleAuth({
  keyFile,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});
const spreadsheetId = '1hlTB8d_XgEUIv7uPkEBLb7Pirk4S7_-RdGLxoAiCz-8'; // Nahraďte správným ID tabulky
const range = 'Form Responses!A:E'; // Nahraďte názvem listu

// Funkce pro zápis do Google Sheets
async function appendData(animal, productType, color, email) {
  try {
    console.log('Inicializuji autentizaci...');
    const client = await auth.getClient();
    console.log('Autentizace proběhla úspěšně.');

    console.log('Připravuji požadavek...');
    const request = {
      spreadsheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [
          [new Date().toISOString(), animal, productType, color, email],
        ],
      },
      auth: client,
    };

    console.log('Odesílám požadavek na API...');
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.append(request);

    console.log('Data byla úspěšně zapsána:', response.data);
    return { success: true, message: 'Data byla úspěšně zapsána.' };
  } catch (error) {
    console.error('Chyba při zápisu dat:', error);
    return { success: false, message: 'Došlo k chybě při zápisu dat.', error };
  }
}

// API endpoint pro příjem dat z formuláře
app.post('/submit', async (req, res) => {
  const { animal, productType, color, email } = req.body;

  // Validace vstupů
  if (!animal || !productType || !color || !email) {
    return res.status(400).json({ success: false, message: 'Chybí některá data.' });
  }

  // Zápis dat do Google Sheets
  const result = await appendData(animal, productType, color, email);
  res.json(result);
});

// Spuštění serveru
app.listen(PORT, () => {
  console.log(`Server běží na http://localhost:${PORT}`);
});