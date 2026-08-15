const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables from .env or .env.local if present
function loadEnv() {
  const envFiles = ['.env.local', '.env'];
  for (const file of envFiles) {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf8');
      content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      });
    }
  }
}

loadEnv();

const PORT = parseInt(process.env.PORT || '3000', 10);

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  let pathname = decodeURIComponent(parsedUrl.pathname);

  // Helper response functions compatible with Vercel serverless handlers
  res.status = function (code) {
    res.statusCode = code;
    return res;
  };
  res.json = function (data) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.end(JSON.stringify(data));
    return res;
  };
  res.send = function (data) {
    res.end(data);
    return res;
  };

  // API Routes handling (/api/*)
  if (pathname.startsWith('/api/')) {
    const routeName = pathname.slice('/api/'.length).replace(/\.js$/, '');
    const apiFilePath = path.join(__dirname, 'api', `${routeName}.js`);

    if (fs.existsSync(apiFilePath)) {
      try {
        let body = '';
        req.on('data', chunk => {
          body += chunk;
        });
        req.on('end', async () => {
          try {
            if (body && req.headers['content-type']?.includes('application/json')) {
              req.body = JSON.parse(body);
            } else if (body) {
              req.body = body;
            } else {
              req.body = {};
            }
          } catch {
            req.body = body;
          }
          req.query = parsedUrl.query;

          try {
            // Delete cache in dev so changes to api files are picked up immediately
            delete require.cache[require.resolve(apiFilePath)];
            const handler = require(apiFilePath);
            await handler(req, res);
          } catch (err) {
            console.error(`API Error in ${pathname}:`, err);
            if (!res.writableEnded) {
              res.status(500).json({ error: err.message || 'Internal server error' });
            }
          }
        });
        return;
      } catch (err) {
        console.error(`Request parsing error in ${pathname}:`, err);
        return res.status(500).json({ error: 'Server error processing request' });
      }
    } else {
      return res.status(404).json({ error: `API route ${pathname} not found` });
    }
  }

  // Static file serving
  if (pathname === '/') {
    pathname = '/index.html';
  }

  const filePath = path.join(__dirname, pathname);

  // Security check: avoid directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('403 Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      return res.end('404 Not Found');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache'
    });

    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`\n🚀 INNIE Website dev server running at:`);
  console.log(`   - Home:     http://localhost:${PORT}`);
  console.log(`   - Admin:    http://localhost:${PORT}/admin.html`);
  console.log(`   - Products: http://localhost:${PORT}/product.html\n`);
});
