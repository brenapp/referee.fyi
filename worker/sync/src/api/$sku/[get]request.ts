import { app, ErrorResponseSchema } from "../../router";
import { createRoute } from "@hono/zod-openapi";
import { z } from "zod/v4";
import { ErrorResponses } from "../../router";
import {
  verifySignature,
  VerifySignatureHeadersSchema,
  verifyUser,
} from "../../utils/verify";
import { getRequestCodeUserKey, getUser } from "../../utils/data";
import { UserSchema } from "@referee-fyi/share";

export const ParamsSchema = z.object({
  sku: z.string(),
});
export const QuerySchema = z.object({
  code: z.string(),
});

export const SuccessResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: UserSchema,
    version: z.string(),
  }),
});

export const route = createRoute({
  method: "get",
  path: "/api/{sku}/request",
  tags: ["Key Exchange"],
  summary: "Obtains another user's public key.",
  middleware: [verifySignature, verifyUser],
  request: {
    headers: VerifySignatureHeadersSchema,
    params: ParamsSchema,
    query: QuerySchema,
  },
  responses: {
    200: {
      description: "Public key retrieved successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
        },
      },
    },
    404: {
      description: "No such request code.",
      content: {
        "application/json": {
          schema: ErrorResponseSchema,
        },
      },
    },
    ...ErrorResponses,
  },
});

app.openapi(route, async (c) => {
  const sku = c.req.valid("param").sku;
  const code = c.req.valid("query").code;

  const verifyUser = c.get("verifyUser");
  if (!verifyUser) {
    return c.json(
      {
        success: false,
        error: "User verification failed.",
        code: "VerifyUserNotRegistered",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const req = await getRequestCodeUserKey(c.env, code, sku);
  if (!req) {
    return c.json(
      {
        success: false,
        code: "GetRequestCodeUnknownCode",
        error: "No such request code.",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      404
    );
  }

  const { key, version } = req;
  const user = await getUser(c.env, key);
  return c.json(
    {
      success: true,
      data: { user: user ?? { key, name: "<Unknown User>" }, version },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
});
