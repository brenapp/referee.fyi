import { createRoute, RouteHandler } from "@hono/zod-openapi";
import { ErrorResponseSchema, ErrorResponses, AppArgs } from "../router";
import { z } from "zod/v4";
import { verifySignature, VerifySignatureHeadersSchema } from "../utils/verify";
import { User, UserSchema } from "@referee-fyi/share";
import { setUser } from "../utils/data";
import { isSystemKey } from "../utils/systemKey";
import { env } from "cloudflare:workers";

export const QuerySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      user: UserSchema,
      isSystemKey: z.coerce.boolean(),
    }),
  })
  .meta({
    id: "PostUserResponse",
    description: "Response body for user registration",
  });

export const route = createRoute({
  method: "post",
  path: "/api/user",
  tags: ["User"],
  summary: "Register information about a user device.",
  hide: env.ENVIRONMENT !== "staging",
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

  const name = c.req.valid("query").name;

  const user: User = {
    key: signature.keyHex,
    name,
  };
  await setUser(c.env, user);

  const systemKey = await isSystemKey(c.env, user.key);
  return c.json(
    {
      success: true,
      data: { user, isSystemKey: systemKey },
    } as const satisfies z.infer<typeof SuccessResponseSchema>,
    200
  );
};

export default [route, handler] as const;
