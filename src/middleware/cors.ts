import { FastifyPluginAsync } from "fastify";
import cors from "@fastify/cors";
import { settings } from "../core/config.js";

/**
 * CORS 中间件插件
 */
export const corsPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(cors, {
    origin: settings.CORS_ORIGINS,
    credentials: settings.CORS_CREDENTIALS,
    methods: settings.CORS_METHODS,
    allowedHeaders: settings.CORS_HEADERS,
  });
};
