import { describe, expect, test } from "vitest";
import { sslFor } from "../src/db/ssl.mjs";

describe("sslFor", () => {
  test("Railway private network and local: no SSL", () => {
    expect(sslFor("postgresql://u:p@postgres.railway.internal:5432/railway")).toBe(false);
    expect(sslFor("postgres://u:p@localhost:5432/x")).toBe(false);
  });
  test("public address: SSL required", () => {
    expect(sslFor("postgresql://u:p@abc.proxy.rlwy.net:25818/railway")).toBe("require");
  });
  test("sslmode in the URL wins", () => {
    expect(sslFor("postgresql://u:p@abc.proxy.rlwy.net:25818/railway?sslmode=disable")).toBeUndefined();
  });
});
