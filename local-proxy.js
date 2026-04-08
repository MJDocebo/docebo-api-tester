/**
 * Docebo Local Test Proxy
 * * To run this proxy:
 * 1. Ensure you have Node.js installed.
 * 2. Run: npm install express cors
 * 3. Run: node local-proxy.js
 * * This proxy takes requests sent to http://localhost:3001/proxy?url=<TARGET>
 * and forwards them securely, maintaining headers (including Authorization).
 */

const express = require('express');
const cors = require('cors');

const app = express();

// Enable CORS for the local React App
app.use(cors()); 

// Parse JSON bodies if provided
app.use(express.json());

// Main Proxy Route
app.all('/proxy', async (req, res) => {
    const targetUrl = req.query.url;
    
    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing target URL in query parameter `url`' });
    }

    try {
        console.log(`[PROXY] ${req.method} -> ${targetUrl}`);

        // Clone incoming headers but remove problematic ones
        const headers = { ...req.headers };
        delete headers.host;
        delete headers.origin;
        delete headers.referer;
        // Node's fetch handles content-length automatically based on body
        delete headers['content-length']; 

        const fetchOptions = {
            method: req.method,
            headers: headers,
        };

        // Forward the body if the method allows it
        if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
            fetchOptions.body = JSON.stringify(req.body);
        }

        // Use native Node.js fetch (Node 18+)
        const response = await fetch(targetUrl, fetchOptions);
        const textData = await response.text();

        // Forward status code
        res.status(response.status);
        
        // Forward safe response headers
        response.headers.forEach((val, key) => {
            // Ignore headers that might break the client response
            const lowerKey = key.toLowerCase();
            if (!['content-encoding', 'transfer-encoding', 'connection'].includes(lowerKey)) {
                res.setHeader(key, val);
            }
        });

        // Send the response back to the React app
        res.send(textData);

    } catch (error) {
        console.error(`[ERROR] Proxy failed for ${targetUrl}:`, error.message);
        res.status(500).json({ error: 'Proxy Request Failed', details: error.message });
    }
});

const PORT = 3001;
app.listen(PORT, () => {
    console.log(`\n==============================================`);
    console.log(`🚀 Docebo Local Proxy is running!`);
    console.log(`🔗 Listening on: http://localhost:${PORT}`);
    console.log(`==============================================\n`);
    console.log(`Leave this terminal open while using the React testing app.`);
});

// Serve static files (like tester.html) from the current directory
app.use(express.static(__dirname));