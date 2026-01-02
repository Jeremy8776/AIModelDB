const https = require('https');

https.get('https://ollama.com/library', (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
        const target = 'llama3.1';
        const idx = data.indexOf(target);
        if (idx !== -1) {
            // Get ample context around the model name to identify the container
            console.log('Snippet around "' + target + '":');
            // Escape check for easier reading
            const snippet = data.substring(Math.max(0, idx - 400), idx + 600);
            console.log(snippet);
        } else {
            console.log('Could not find ' + target);
            console.log('First 500 chars:', data.substring(0, 500));
        }
    });
});
