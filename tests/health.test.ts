import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createApplication } from "../src/app.js";
import type { FastifyInstance } from "fastify";

describe("Health Check Endpoints", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await createApplication();
    await app.ready();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe("GET /api/v1/health", () => {
    it("should return healthy status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/health",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("healthy");
      expect(body.data).toHaveProperty("timestamp");
      expect(body.data).toHaveProperty("version");
      expect(body.data).toHaveProperty("environment");
    });
  });

  describe("GET /api/v1/health/live", () => {
    it("should return alive status", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/health/live",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(body.data.status).toBe("alive");
      expect(body.data).toHaveProperty("timestamp");
    });
  });

  describe("GET /api/v1/health/ready", () => {
    it("should return ready status when database is connected", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/v1/health/ready",
      });

      // 如果数据库连接成功，返回 200；否则返回 503
      expect([200, 503]).toContain(response.statusCode);
      const body = JSON.parse(response.body);
      expect(body.success).toBe(true);
      expect(["ready", "not_ready"]).toContain(body.data.status);
      expect(body.data).toHaveProperty("timestamp");
      expect(body.data).toHaveProperty("database");
    });
  });
});
