const crypto = require("node:crypto");

const COOKIE_NAME = "learnenglish_session";
const SESSION_AGE_SECONDS = 60 * 60 * 24 * 7;
const USERS = {
  dani: { name: "Dani", passwordEnv: "DANI_PASSWORD" },
  demo: { name: "Demo", passwordEnv: "DEMO_PASSWORD" },
  marcsi: { name: "Marcsi", passwordEnv: "MARCSI_PASSWORD" },
};

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function cookieValue(req, name) {
  const cookies = String(req.headers.cookie || "").split(";");
  const cookie = cookies.find((part) => part.trim().startsWith(`${name}=`));
  return cookie ? cookie.trim().slice(name.length + 1) : "";
}

function signature(value, secret) {
  return crypto.createHmac("sha256", secret).update(value).digest("base64url");
}

function sameSecret(left, right) {
  const leftHash = crypto.createHash("sha256").update(left).digest();
  const rightHash = crypto.createHash("sha256").update(right).digest();
  return crypto.timingSafeEqual(leftHash, rightHash);
}

function readSession(req, secret) {
  const token = cookieValue(req, COOKIE_NAME);
  const splitAt = token.lastIndexOf(".");
  if (splitAt < 1) return null;

  const encoded = token.slice(0, splitAt);
  const suppliedSignature = token.slice(splitAt + 1);
  const expectedSignature = signature(encoded, secret);
  if (!sameSecret(suppliedSignature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
    const user = USERS[payload.sub];
    if (!user || !Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    return { id: payload.sub, name: user.name };
  } catch {
    return null;
  }
}

function setCookie(res, value, maxAge) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  res.setHeader(
    "Set-Cookie",
    `${COOKIE_NAME}=${value}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`,
  );
}

function parseBody(body) {
  if (body && typeof body === "object") return body;
  if (typeof body === "string") return JSON.parse(body);
  return {};
}

module.exports = function auth(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const secret = process.env.SESSION_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    return json(res, 503, { error: "A belépés szerveroldali beállítása hiányzik." });
  }

  if (req.method === "GET") {
    return json(res, 200, { user: readSession(req, secret) });
  }

  if (req.method === "DELETE") {
    setCookie(res, "", 0);
    return json(res, 200, { ok: true });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST, DELETE");
    return json(res, 405, { error: "A metódus nem támogatott." });
  }

  const origin = req.headers.origin;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (origin && host && new URL(origin).host !== host) {
    return json(res, 403, { error: "A kérés nem engedélyezett." });
  }

  let body;
  try {
    body = parseBody(req.body);
  } catch {
    return json(res, 400, { error: "Hibás kérés." });
  }

  const userId = String(body.username || "").trim().toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  const user = USERS[userId];
  const expectedPassword = user && process.env[user.passwordEnv];
  if (user && !expectedPassword) {
    return json(res, 503, { error: "Ennek a profilnak a belépése nincs beállítva a szerveren." });
  }
  if (!user || !password || !sameSecret(password, expectedPassword)) {
    return json(res, 401, { error: "A felhasználónév vagy a jelszó nem megfelelő." });
  }

  const payload = Buffer.from(JSON.stringify({
    sub: userId,
    exp: Date.now() + SESSION_AGE_SECONDS * 1000,
  })).toString("base64url");
  setCookie(res, `${payload}.${signature(payload, secret)}`, SESSION_AGE_SECONDS);
  return json(res, 200, { user: { id: userId, name: user.name } });
};