const crypto = require("node:crypto");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const products = require("./src/products.js");

const rootDirectory = __dirname;
const port = Number.parseInt(process.env.PORT || "3000", 10);
const deliveryFeeSetting = process.env.DELIVERY_FEE_NGN ?? "1000";
const deliveryFeeNgn = /^\d+$/.test(deliveryFeeSetting) ? Number(deliveryFeeSetting) : null;
const productById = new Map(products.map((product) => [product.id, product]));

function sendJson(response, statusCode, data) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  });
  response.end(JSON.stringify(data));
}

function readJson(request, maxBytes = 32 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let length = 0;

    request.on("data", (chunk) => {
      length += chunk.length;
      if (length > maxBytes) {
        reject(Object.assign(new Error("Request is too large."), { statusCode: 413 }));
        request.resume();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(Object.assign(new Error("Send a valid JSON request."), { statusCode: 400 }));
      }
    });
    request.on("error", reject);
  });
}

async function createDemoOrder(request, response) {
  if (!Number.isSafeInteger(deliveryFeeNgn) || deliveryFeeNgn < 0) {
    return sendJson(response, 503, { error: "Set DELIVERY_FEE_NGN to a valid whole number." });
  }

  const payload = await readJson(request);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return sendJson(response, 400, { error: "Send valid checkout details." });
  }

  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const email = typeof payload.email === "string" ? payload.email.trim() : "";
  const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
  const address = typeof payload.address === "string" ? payload.address.trim() : "";

  if (name.length < 2 || name.length > 100) {
    return sendJson(response, 400, { error: "Enter your full name." });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return sendJson(response, 400, { error: "Enter a valid email address." });
  }
  if (phone.length < 7 || phone.length > 30) {
    return sendJson(response, 400, { error: "Enter a valid phone number." });
  }
  if (address.length < 8 || address.length > 500) {
    return sendJson(response, 400, { error: "Enter a complete delivery address." });
  }
  if (!Array.isArray(payload.items) || payload.items.length < 1 || payload.items.length > 20) {
    return sendJson(response, 400, { error: "Your cart does not contain valid items." });
  }

  const quantities = new Map();
  for (const item of payload.items) {
    if (
      !item || typeof item.id !== "string" || !productById.has(item.id) ||
      !Number.isSafeInteger(item.quantity) || item.quantity < 1 || item.quantity > 99
    ) {
      return sendJson(response, 400, { error: "Your cart contains an invalid item or quantity." });
    }
    quantities.set(item.id, Math.min(99, (quantities.get(item.id) || 0) + item.quantity));
  }

  const items = [...quantities].map(([id, quantity]) => {
    const product = productById.get(id);
    return { id, name: product.name, quantity, unitPriceNgn: product.priceNgn };
  });
  const subtotalNgn = items.reduce((sum, item) => sum + item.unitPriceNgn * item.quantity, 0);
  const totalNgn = subtotalNgn + deliveryFeeNgn;
  if (!Number.isSafeInteger(totalNgn)) {
    return sendJson(response, 400, { error: "This cart total is too large." });
  }

  // This preview endpoint intentionally discards the submitted customer details.
  const reference = `DEMO-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  return sendJson(response, 201, {
    demo: true,
    reference,
    items,
    subtotalNgn,
    deliveryFeeNgn,
    totalNgn,
    currency: "NGN"
  });
}

function resolveStaticFile(pathname) {
  if (pathname === "/") return null;
  let parts;
  try {
    parts = pathname.split("/").filter(Boolean).map((part) => decodeURIComponent(part));
  } catch {
    return null;
  }

  const rootName = parts[0];
  if (!(rootName === "src" || rootName === "img") || parts.length < 2) return null;
  if (parts.some((part) => part === "." || part === ".." || part.includes("\\") || part.includes("\0"))) {
    return null;
  }

  const baseDirectory = path.join(rootDirectory, rootName);
  const filePath = path.resolve(baseDirectory, ...parts.slice(1));
  const relativePath = path.relative(baseDirectory, filePath);
  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) return null;
  try {
    return fs.statSync(filePath).isFile() ? filePath : null;
  } catch {
    return null;
  }
}

function serveStaticFile(filePath, response) {
  const contentTypes = {
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".ico": "image/x-icon",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".webp": "image/webp"
  };
  response.writeHead(200, {
    "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache",
    "X-Content-Type-Options": "nosniff"
  });
  fs.createReadStream(filePath).pipe(response);
}

async function handleRequest(request, response) {
  let requestUrl;
  try {
    requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);
  } catch {
    return sendJson(response, 400, { error: "Invalid request URL." });
  }
  const { pathname } = requestUrl;

  if ((pathname === "/" || pathname === "/index.html") && ["GET", "HEAD"].includes(request.method)) {
    const indexFile = path.join(rootDirectory, "index.html");
    try {
      const stat = fs.statSync(indexFile);
      if (request.method === "HEAD") {
        response.writeHead(200, { "Content-Length": stat.size, "Cache-Control": "no-cache" });
        return response.end();
      }
      return serveStaticFile(indexFile, response);
    } catch {
      return sendJson(response, 404, { error: "Not found." });
    }
  }
  if (pathname === "/api/config" && request.method === "GET") {
    return sendJson(response, 200, {
      deliveryFeeNgn,
      checkoutMode: "demo",
      checkoutReady: Number.isSafeInteger(deliveryFeeNgn) && deliveryFeeNgn >= 0
    });
  }
  if (pathname === "/api/orders/demo" && request.method === "POST") {
    try {
      return await createDemoOrder(request, response);
    } catch (error) {
      return sendJson(response, error.statusCode || 500, {
        error: error.statusCode ? error.message : "Could not prepare this demo order. Please try again."
      });
    }
  }
  if (request.method !== "GET" && request.method !== "HEAD") {
    return sendJson(response, 405, { error: "Method not allowed." });
  }

  const staticFile = resolveStaticFile(pathname);
  if (!staticFile) return sendJson(response, 404, { error: "Not found." });
  if (request.method === "HEAD") {
    const stat = fs.statSync(staticFile);
    response.writeHead(200, { "Content-Length": stat.size, "Cache-Control": "no-cache" });
    return response.end();
  }
  return serveStaticFile(staticFile, response);
}

const server = http.createServer((request, response) => {
  handleRequest(request, response).catch(() => {
    if (!response.headersSent) sendJson(response, 500, { error: "The request could not be completed." });
    else response.destroy();
  });
});

server.listen(port, () => {
  console.log(`Nike Boutique Mart demo is available at http://localhost:${port}`);
  console.log("Checkout is in demo mode. It does not take payments or save customer details.");
});
