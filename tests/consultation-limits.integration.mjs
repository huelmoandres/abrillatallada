import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { registerHooks } from "node:module";
import test from "node:test";
import { promisify } from "node:util";

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export{}", shortCircuit: true };
    if (specifier.startsWith("@/")) return nextResolve(new URL(`../src/${specifier.slice(2)}.ts`, import.meta.url).href, context);
    return nextResolve(specifier, context);
  },
});

const { CONSULTATION_RATE_LIMIT_LUA } = await import("../src/lib/server/consultation-security.ts");
const container = process.env.CONSULTATION_REDIS_TEST_CONTAINER;
if (!container || !/^codex-abril-[a-zA-Z0-9-]+$/.test(container)) {
  throw new Error("Set CONSULTATION_REDIS_TEST_CONTAINER to an isolated codex-abril-* Redis test container.");
}
const execute = promisify(execFile);
async function redis(...args) {
  const { stdout } = await execute("docker", ["exec", container, "redis-cli", "--raw", ...args.map(String)], { maxBuffer: 64 * 1024 });
  return stdout.trim();
}
function scenario() {
  const prefix = `test:abril:${randomUUID()}`;
  return { ip: (id = "one") => `${prefix}:ip:${id}`, hour: `${prefix}:hour`, day: `${prefix}:day`, token: (id) => `${prefix}:token:${id}` };
}
async function admit(keys, token, ip = "one") {
  const value = await redis("EVAL", CONSULTATION_RATE_LIMIT_LUA, 4, keys.ip(ip), keys.hour, keys.day, keys.token(token));
  const result = value.split("\n").map(Number);
  assert.equal(result.length, 2, value);
  return result;
}

test("real Redis admits exactly five simultaneous attempts from one IP and does not spend global quota on denials", async () => {
  const keys = scenario();
  const results = await Promise.all(Array.from({ length: 20 }, (_, index) => admit(keys, `token-${index}`)));
  assert.equal(results.filter(([allowed]) => allowed === 1).length, 5);
  assert.equal(results.filter(([allowed]) => allowed === 0).length, 15);
  assert.equal(await redis("GET", keys.ip()), "5");
  assert.equal(await redis("GET", keys.hour), "5");
  assert.equal(await redis("GET", keys.day), "5");
  assert.ok(Number(await redis("TTL", keys.ip())) > 0);
  assert.ok(Number(await redis("TTL", keys.ip())) <= 900);
  assert.ok(Number(await redis("TTL", keys.hour)) <= 3600);
  assert.ok(Number(await redis("TTL", keys.day)) <= 86400);
});

test("real Redis consumes each verification token once, including a token rejected by the IP limit", async () => {
  const keys = scenario();
  assert.deepEqual(await admit(keys, "first"), [1, 0]);
  assert.deepEqual(await admit(keys, "first"), [-1, 0]);
  for (let index = 2; index <= 5; index++) assert.deepEqual(await admit(keys, `accepted-${index}`), [1, 0]);
  assert.equal((await admit(keys, "limited"))[0], 0);
  assert.deepEqual(await admit(keys, "limited", "different-ip"), [-1, 0]);
  assert.equal(await redis("GET", keys.hour), "5");
  assert.equal(await redis("GET", keys.day), "5");
  const ttl = Number(await redis("TTL", keys.token("limited")));
  assert.ok(ttl > 0 && ttl <= 600);
});

test("real Redis enforces the global hourly cap across concurrent distinct IPs", async () => {
  const keys = scenario();
  const results = await Promise.all(Array.from({ length: 40 }, (_, index) => admit(keys, `token-${index}`, `ip-${index}`)));
  assert.equal(results.filter(([allowed]) => allowed === 1).length, 30);
  assert.equal(results.filter(([allowed]) => allowed === 0).length, 10);
  assert.equal(await redis("GET", keys.hour), "30");
  assert.equal(await redis("GET", keys.day), "30");
});

test("real Redis stops the one-hundredth daily boundary without incrementing other counters", async () => {
  const keys = scenario();
  await redis("SET", keys.day, 99, "EX", 86400);
  assert.deepEqual(await admit(keys, "last-allowed"), [1, 0]);
  const denied = await admit(keys, "over-daily-budget", "different-ip");
  assert.equal(denied[0], 0);
  assert.ok(denied[1] > 0 && denied[1] <= 86400);
  assert.equal(await redis("GET", keys.day), "100");
  assert.equal(await redis("GET", keys.hour), "1");
  assert.equal(await redis("EXISTS", keys.ip("different-ip")), "0");
});

test("real Redis returns the longest blocking window and resumes after a window expires", async () => {
  const keys = scenario();
  await redis("SET", keys.ip(), 5, "EX", 10);
  await redis("SET", keys.hour, 30, "EX", 20);
  await redis("SET", keys.day, 100, "EX", 30);
  const blocked = await admit(keys, "blocked");
  assert.equal(blocked[0], 0);
  assert.ok(blocked[1] >= 28 && blocked[1] <= 30);

  const fresh = scenario();
  await redis("SET", fresh.hour, 30, "EX", 1);
  assert.equal((await admit(fresh, "before-expiry"))[0], 0);
  await new Promise((resolve) => setTimeout(resolve, 1200));
  assert.deepEqual(await admit(fresh, "after-expiry"), [1, 0]);
  assert.equal(await redis("GET", fresh.hour), "1");
});

test("real Redis refuses malformed or non-expiring counters without spending the other budgets", async () => {
  for (const corruptValue of ["-1", "not-a-number", "00", "1.5"]) {
    const keys = scenario();
    await redis("SET", keys.ip(), corruptValue, "EX", 900);
    assert.deepEqual(await admit(keys, "corrupt"), [-2, 0]);
    assert.equal(await redis("EXISTS", keys.hour), "0");
    assert.equal(await redis("EXISTS", keys.day), "0");
  }
  const keys = scenario();
  await redis("SET", keys.hour, 1);
  assert.deepEqual(await admit(keys, "missing-ttl"), [-2, 0]);
  assert.equal(await redis("EXISTS", keys.ip()), "0");
  assert.equal(await redis("EXISTS", keys.day), "0");
});
