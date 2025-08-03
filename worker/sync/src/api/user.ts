import { createRoute } from "@hono/zod-openapi";
import { app, ErrorResponses, ErrorResponseSchema } from "../router";
import { z } from "zod/v4";
import { verifySignature, VerifySignatureHeadersSchema } from "../utils/verify";
import { User } from "@referee-fyi/share";
import { setUser } from "../utils/data";
import { isSystemKey } from "../utils/systemKey";

export const QuerySchema = z.object({
  name: z.string().min(1, "Name is required"),
});

export const SuccessResponseSchema = z
  .object({
    success: z.literal(true),
    data: z.object({
      user: z.object({
        key: z.string(),
        name: z.string(),
      }),
      isSystemKey: z.boolean(),
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

app.openapi(route, async (c) => {
  const signature = c.get("verifySignature");
  if (!signature) {
    return c.json(
      {
        success: false,
        error: "Signature verification failed.",
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
});
