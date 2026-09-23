const fs = require('fs');
const path = require('path');

const MARKER = 'window.INNIE_PRODUCTS = ';
const LOCAL_FILE = path.join(__dirname, '..', '..', 'content.js');

// Extracts the product array from the text of content.js.
function parseProducts(text) {
  const start = text.indexOf(MARKER);
  const end = text.indexOf('];', start);
  if (start < 0 || end < 0) return null;
  // The hand-written starter file keeps an example inside // comments; published files are plain JSON.
  return JSON.parse(text.slice(start + MARKER.length, end + 1).replace(/^\s*\/\/.*$/gm, ''));
}

function serializeProducts(products) {
  return `// INNIE content source of truth.\n// Automatically maintained by the INNIE Publishing API.\n${MARKER}${JSON.stringify(products, null, 2)};\n`;
}

// Products in the copy of content.js deployed with this build.
function deployedProducts() {
  try {
    return parseProducts(fs.readFileSync(LOCAL_FILE, 'utf8')) || [];
  } catch {
    return [];
  }
}

module.exports = { LOCAL_FILE, parseProducts, serializeProducts, deployedProducts };
