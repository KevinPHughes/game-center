// Import required Node.js modules
const http = require('http');
const fs = require('fs');
const path = require('path');

// Define the port the server will listen on
const PORT = 3000; // You can use any available port

// Create the HTTP server
const server = http.createServer((req, res) => {
    console.log(`Request received for: ${req.url}`);

    // Parse the requested URL
    let filePath = '.' + req.url;
    if (filePath === './') {
        // If root path is requested, serve index.html
        filePath = './public/index.html';
    } else {
        // Otherwise, prepend /public/ to the path
        filePath = './public' + req.url;
    }

    // Determine the content type based on the file extension
    const extname = String(path.extname(filePath)).toLowerCase();
    const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        // Add other MIME types as needed
    };

    const contentType = mimeTypes[extname] || 'application/octet-stream';

    // Read the requested file
    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code == 'ENOENT') {
                // File not found - send 404
                console.error(`Error: File not found - ${filePath}`);
                fs.readFile('./public/404.html', (err404, content404) => {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    if (err404) {
                        // Fallback if 404.html is also missing
                        res.end('404 Not Found', 'utf-8');
                    } else {
                        res.end(content404, 'utf-8');
                    }
                });
            } else {
                // Some other server error - send 500
                console.error(`Error: Server error - ${error.code}`);
                res.writeHead(500);
                res.end(`Sorry, check with the site admin for error: ${error.code} ..\n`);
            }
        } else {
            // File found - send 200 OK with the file content
            console.log(`Serving file: ${filePath} as ${contentType}`);
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

// Start the server and listen on the specified port
server.listen(PORT, () => {
    console.log(`--------------------------------------`);
    console.log(`Server running at http://localhost:${PORT}/`);
    console.log(`--------------------------------------`);
    console.log(`To stop the server, press Ctrl+C`);
});
