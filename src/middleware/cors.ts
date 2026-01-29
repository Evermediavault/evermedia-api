import { FastifyPluginAsync } from "fastify";

/**
 * CORS：根 app 的 onRequest 里写头 + 直接处理 OPTIONS，保证预检和实际请求都有头
 */
export const corsPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", async (request, reply) => {
    const origin = request.headers.origin || "*";
    reply.header("Access-Control-Allow-Origin", origin);
    reply.header("Access-Control-Allow-Credentials", "true");
    reply.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS,HEAD");
    reply.header("Access-Control-Allow-Headers", "*");

    if (request.method === "OPTIONS") {
      return reply.status(204).send();
    }
  });
};
