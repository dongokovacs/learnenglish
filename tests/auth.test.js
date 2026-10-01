const assert = require("node:assert/strict");
const { after, before, test } = require("node:test");
const auth = require("../api/auth.js");

const envKeys = ["SESSION_SECRET", "DANI_PASSWORD", "DEMO_PASSWORD", "MARCSI_PASSWORD"];
const previousEnv = Object.fromEntries(envKeys.map((key) => [key, process.env[key]]));

before(() => {
  process.env.SESSION_SECRET = "test-only-session-secret-with-32-bytes";
  process.env.DANI_PASSWORD = "test-only-dani-password";
  process.env.DEMO_PASSWORD = "test-only-demo-password";
  process.env.MARCSI_PASSWORD = "test-only-marcsi-password";
});

after(() => {
  for (const key of envKeys) {
    if (previousEnv[key] === undefined) delete process.env[key];
    else process.env[key] = previousEnv[key];
  }
});

function invoke(method, { headers = {}, body } = {}) {
  const response = {
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
    end(value) {
      this.body = JSON.parse(value);
    },
  };
  auth({ method, headers, body }, response);
  return response;
}

test("rejects an incorrect password", () => {
  const response = invoke("POST", { body: { username: "demo", password: "wrong" } });
  assert.equal(response.statusCode, 401);
});

test("creates and validates a session for the selected profile", () => {
  const login = invoke("POST", { body: { username: "dani", password: process.env.DANI_PASSWORD } });
  assert.equal(login.statusCode, 200);
  assert.deepEqual(login.body.user, { id: "dani", name: "Dani" });
  assert.match(login.headers["set-cookie"], /HttpOnly/);
  assert.match(login.headers["set-cookie"], /SameSite=Lax/);

  const cookie = login.headers["set-cookie"].split(";")[0];
  const session = invoke("GET", { headers: { cookie } });
  assert.deepEqual(session.body.user, { id: "dani", name: "Dani" });

  const tampered = invoke("GET", { headers: { cookie: `${cookie.slice(0, -1)}x` } });
  assert.equal(tampered.body.user, null);
});

test("clears the session cookie on logout", () => {
  const response = invoke("DELETE");
  assert.equal(response.statusCode, 200);
  assert.match(response.headers["set-cookie"], /Max-Age=0/);
});

test("fails closed when a profile password is not configured", () => {
  delete process.env.DEMO_PASSWORD;
  const response = invoke("POST", { body: { username: "demo", password: "any" } });
  assert.equal(response.statusCode, 503);
});

test("allows Marcsi to sign in with her own profile", () => {
  const login = invoke("POST", { body: { username: "marcsi", password: process.env.MARCSI_PASSWORD } });
  assert.equal(login.statusCode, 200);
  assert.deepEqual(login.body.user, { id: "marcsi", name: "Marcsi" });
});