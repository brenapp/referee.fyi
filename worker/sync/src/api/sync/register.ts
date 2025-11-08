import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../../router";
import { z } from "zod/v4";
import {
  verifySignature,
  VerifySignatureHeadersSchema,
} from "../../utils/verify";
import { UserSchema } from "@referee-fyi/share";
import { getUser, isSystemKey, registerUser } from "../../utils/data";

export const QuerySchema = z.object({
  name: z.string().min(1, "Name is required"),
  version: z.string(),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      user: UserSchema,
      isSystemKey: z.boolean(),
    }),
  })
  .meta({
    id: "PostUserResponse",
    description: "Response body for user registration",
  });

export const route = createRoute({
  method: "post",
  path: "/api/sync/register",
  tags: ["User"],
  summary: "Register information about a user device.",
  hide: process.env.WRANGLER_ENVIRONMENT === "production",
  description: "Register a device's public key with the sync engine.",
  middleware: [verifySignature],
  request: {
    query: QuerySchema,
    headers: VerifySignatureHeadersSchema,
  },
  responses: {
    200: {
      description: "User registered successfully",
      content: {
        "application/json": {
          schema: SuccessResponseSchema,
        },
      },
    },
    ...ErrorResponses,
  },
});

export type Route = typeof route;
export const handler: RouteHandler<Route, AppArgs> = async (c) => {
  const signature = c.get("verifySignature");
  if (!signature) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Signature verification failed.",
        },
        code: "VerifySignatureInvalidSignature",
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      401
    );
  }

  const key = signature.keyHex;
  const name = c.req.valid("query").name;
  const version = c.req.valid("query").version;

  await registerUser(
    c.env,
    {
      key,
      name,
    },
    version
  );

  const user = await getUser(c.env, key);
  if (!user) {
    return c.json(
      {
        success: false,
        error: {
          name: "ValidationError",
          message: "Encountered error when registering user.",
        },
      } as const satisfies z.infer<typeof ErrorResponseSchema>,
      500
    );
  }

  const systemKey = await isSystemKey(c.env, key);
  return c.json(
    {
      success: true,
      data: { user, isSystemKey: systemKey },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};
