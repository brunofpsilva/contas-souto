import { describe, expect, test } from "vitest";
import { sslPara } from "../src/db/ssl.mjs";

describe("sslPara", () => {
  test("rede interna do Railway e local: sem SSL", () => {
    expect(sslPara("postgresql://u:p@postgres.railway.internal:5432/railway")).toBe(false);
    expect(sslPara("postgres://u:p@localhost:5432/x")).toBe(false);
  });
  test("endereço público: SSL obrigatório", () => {
    expect(sslPara("postgresql://u:p@abc.proxy.rlwy.net:25818/railway")).toBe("require");
  });
  test("sslmode no URL tem prioridade", () => {
    expect(sslPara("postgresql://u:p@abc.proxy.rlwy.net:25818/railway?sslmode=disable")).toBeUndefined();
  });
});
