const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { google } = require('googleapis');
const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Načtení environmentálních proměnných

console.log('SERVICE_ACCOUNT_KEY:', process.env.SERVICE_ACCOUNT_KEY ? 'Načteno' : 'Nenalezeno');
console.log("Aktuální načtení serveru", new Date().toISOString());

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware pro zpracování JSON a CORS
app.use(bodyParser.json());
app.use(cors());

// Google Sheets konfigurace
const keyFile = path.join(__dirname, process.env.SERVICE_ACCOUNT_KEY); // Cesta k JSON klíči
const credentials = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
});

const spreadsheetId = process.env.SHEET_ID; // ID tabulky
const range = 'Form Responses!A:E'; // Název listu

// Funkce pro dekódování a ověření JWT tokenu
function decodeAndVerifyJWT(token) {
  try {
    const decoded = jwt.decode(token, { complete: true });
    console.log('JWT Header:', decoded.header);
    console.log('JWT Payload:', decoded.payload);

    // Kontrola audience
    if (decoded.payload.aud !== 'https://www.googleapis.com/oauth2/v4/token') {
      throw new Error('Audience není správná.');
    }

    // Kontrola času
    const now = Math.floor(Date.now() / 1000);
    if (decoded.payload.iat > now || decoded.payload.exp < now) {
      throw new Error('Token není časově platný.');
    }

    console.log('JWT token je platný.');
  } catch (error) {
    console.error('Chyba při dekódování JWT:', error.message);
  }
}

// Funkce pro zápis do Google Sheets
async function appendData(animal, productType, color, email) {
  try {
    console.log('Inicializuji autentizaci...');
    const client = await auth.getClient();
    console.log('Autentizace proběhla úspěšně.');

    // Získání JWT tokenu
    const token = await auth.getAccessToken();
    console.log('JWT token získán:', token);

    // Dekódování a kontrola JWT
    decodeAndVerifyJWT(token);

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