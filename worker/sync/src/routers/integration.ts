import { IRequest, AutoRouter } from "itty-router";
import { Env } from "../types";
import { response } from "../utils/request";
import { getInstance, getInvitation, getUser } from "../utils/data";
import { importKey, KEY_PREFIX, verifyKeySignature } from "../utils/crypto";
import {
  Invitation,
  Incident,
  ShareInstanceMeta,
  ShareResponse,
  User,
} from "@referee-fyi/share";
import { generateIncidentReportPDF } from "@referee-fyi/pdf-export";
import { getRobotEventsClient } from "../utils/robotevents";
import { getSystemKeyMetadata } from "../utils/systemKey";

import {
  contentJson,
  fromIttyRouter,
  InputValidationException,
  NotFoundException,
  OpenAPIRoute,
} from "chanfana";
import { z } from "zod";

export type VerifyCredentialRequest = {
  sku: string;
  token: string;
  instance?: string;
};

export type VerifyCredentialResponse =
  | {
      success: true;
      user: User;
      invitation: Invitation;
      instance: ShareInstanceMeta;
    }
  | {
      success: false;
      reason: "bad_request" | "incorrect_code";
      details: string;
    };

const verifySystemToken = async (
  { sku, token, instance: instanceSecret }: VerifyCredentialRequest,
  env: Env
): Promise<VerifyCredentialResponse> => {
  if (!instanceSecret) {
    return {
      success: false,
      reason: "bad_request",
      details: "Missing instance secret.",
    };
  }

  /**
   * The format of the system token is a pipe delimited string:
   * 1. Public key of the system token
   * 2. Signed Message: <INSTANCE SECRET><SKU>
   **/
  const [publicKeyRaw, signedMessage] = token.split("|");

  // Verify Key
  const key = await importKey(publicKeyRaw);
  if (!key) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: can't obtain user key.",
    };
  }

  const keyHex = publicKeyRaw.slice(KEY_PREFIX.length);
  const metadata = await getSystemKeyMetadata(env, keyHex);
  if (!metadata) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Key is not system key",
    };
  }

  const message = instanceSecret + sku;
  console.log(message);
  const valid = await verifyKeySignature(key, signedMessage, message);

  if (!valid) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid system token.",
    };
  }

  const instance = await getInstance(env, instanceSecret, sku);
  if (!instance) {
    return {
      success: false,
      reason: "bad_request",
      details: "Unknown Share Instance.",
    };
  }

  const user = await getUser(env, keyHex);
  if (!user) {
    return {
      success: false,
      reason: "bad_request",
      details: "Unknown User.",
    };
  }

  const invitation: Invitation = {
    accepted: true,
    admin: true,
    from: keyHex,
    id: "system:" + crypto.randomUUID(),
    sku,
    instance_secret: instanceSecret,
    user: keyHex,
  };

  return { success: true, user, invitation, instance };
};

const verifyBearerToken = async (
  { sku, token }: VerifyCredentialRequest,
  env: Env
): Promise<VerifyCredentialResponse> => {
  /**
   * The format of the bearer token is a pipe delimited string:
   * 1. Public key of an admin user that is responsible for the integration
   * 2. Signed Message: <Invitation ID><SKU>
   **/

  const [publicKeyRaw, signedMessage] = token.split("|");

  // Verify Key
  const key = await importKey(publicKeyRaw);
  if (!key) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: can't obtain user key.",
    };
  }

  const keyHex = publicKeyRaw.slice(KEY_PREFIX.length);
  const invitation = await getInvitation(env, keyHex, sku);

  if (!invitation) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: User does not active invitation.",
    };
  }

  if (!invitation.admin) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: User does not have admin permissions.",
    };
  }

  const message = invitation.id + sku;
  const valid = await verifyKeySignature(key, signedMessage, message);

  if (!valid) {
    return {
      success: false,
      reason: "incorrect_code",
      details: "Invalid Bearer Token: Invalid signature.",
    };
  }

  const instance = await getInstance(env, invitation.instance_secret, sku);

  if (!instance) {
    return {
      success: false,
      reason: "bad_request",
      details: "Unknown Share Instance.",
    };
  }

  const user = await getUser(env, keyHex);
  if (!user) {
    return {
      success: false,
      reason: "bad_request",
      details: "Unknown User.",
    };
  }

  return { success: true, user, invitation, instance };
};

const verify = async (
  request: VerifyCredentialRequest,
  env: Env
): Promise<VerifyCredentialResponse> => {
  const system = await verifySystemToken(request, env);

  if (system.success) {
    return system;
  }

  const bearer = await verifyBearerToken(request, env);
  if (bearer.success) {
    return bearer;
  }

  return bearer;
};

const request = {
  params: z.object({
    sku: z.string(),
  }),
  query: z.object({
    token: z.string(),
    instance: z.string().optional(),
  }),
} as const;

export class VerifyEndpoint extends OpenAPIRoute<[IRequest, Env]> {
  schema = {
    tags: ["v1"],
    summary: "Verifies the bearer token can be used in this context.",
    request,
    responses: {
      "200": {
        description: "Ok",
        ...contentJson(
          z.object({
            success: z.boolean(),
          })
        ),
      },
      "403": {
        description: "Forbidden",
        ...contentJson(
          z.object({
            success: z.boolean(),
            reason: z.enum(["bad_request", "incorrect_code"]),
            details: z.string(),
          })
        ),
      },
      ...InputValidationException.schema(),
      ...NotFoundException.schema(),
    },
  };

  async handle(request: IRequest, env: Env) {
    const {
      params: { sku },
      query: { token, instance },
    } = await this.getValidatedData<typeof this.schema>();

    const result = await verify(
      {
        sku,
        token,
        instance,
      },
      env
    );

    return result;
  }
}

class GetIncidentJSONEndpoint extends OpenAPIRoute<[IRequest, Env]> {
  schema = {
    tags: ["v1"],
    summary: "Gets all entries in the shared instance.",
    request,
    responses: {
      "200": {
        description: "Ok",
        ...contentJson(
          z.object({
            success: z.boolean(),
            data: z.array(z.object({})),
          })
        ),
      },
      ...InputValidationException.schema(),
      ...NotFoundException.schema(),
    },
  };

  async handle(request: IRequest, env: Env) {
    const {
      params: { sku },
      query: { token, instance },
    } = await this.getValidatedData<typeof this.schema>();

    const result = await verify(
      {
        sku,
        token,
        instance,
      },
      env
    );

    if (!result.success) {
      return result;
    }

    const id = env.INCIDENTS.idFromString(result.instance.secret);
    const stub = env.INCIDENTS.get(id);
    return stub.handleJSON();
  }
}

class GetIncidentCSVEndpoint extends OpenAPIRoute<[IRequest, Env]> {
  schema = {
    tags: ["v1"],
    summary: "Gets all entries in the shared instance.",
    request,
    response: {
      200: {
        description: "Ok",
        content: {
          "text/csv": {},
        },
      },
      ...InputValidationException.schema(),
      ...NotFoundException.schema(),
    },
  };

  async handle(request: IRequest, env: Env) {
    const {
      params: { sku },
      query: { token, instance },
    } = await this.getValidatedData<typeof this.schema>();

    const result = await verify(
      {
        sku,
        token,
        instance,
      },
      env
    );

    if (!result.success) {
      return result;
    }

    const id = env.INCIDENTS.idFromString(result.instance.secret);
    const stub = env.INCIDENTS.get(id);
    return stub.handleCSV();
  }
}

class GetIncidentPDFEndpoint extends OpenAPIRoute<[IRequest, Env]> {
  schema = {
    tags: ["v1"],
    summary: "Gets all entries in the shared instance.",
    request,
    response: {
      200: {
        description: "Ok",
        content: {
          "application/pdf": {},
        },
      },
      ...InputValidationException.schema(),
      ...NotFoundException.schema(),
    },
  };

  async handle(request: IRequest, env: Env) {
    const {
      params: { sku },
      query: { token, instance },
    } = await this.getValidatedData<typeof this.schema>();

    const result = await verify(
      {
        sku,
        token,
        instance,
      },
      env
    );

    if (!result.success) {
      return result;
    }

    const client = getRobotEventsClient(env);

    const id = env.INCIDENTS.idFromString(result.instance.secret);
    const stub = env.INCIDENTS.get(id);

    const incidentResponse = await stub.handleJSON();

    const body = await (incidentResponse.json() as Promise<
      ShareResponse<Incident[]>
    >);

    if (!body.success) {
      return response({
        success: false,
        reason: "bad_request",
        details: "Could not get incidents from the sharing server.",
      });
    }

    const invitations = await stub.getInvitationList();

    const formatters = {
      date: new Intl.DateTimeFormat("en-US", {
        timeZone: `${request.cf?.timezone ?? "America/Chicago"}`,
        dateStyle: "full",
        timeStyle: "long",
      }),
    };

    const output = await generateIncidentReportPDF({
      sku,
      client,
      incidents: body.data,
      users: invitations.map((invitation) => invitation.user),
      formatters,
    });

    return new Response(output, {
      headers: {
        "Content-Type": "application/pdf",
      },
    });
  }
}

const integrationRouter = AutoRouter<IRequest, [Env]>({});

const openapi = fromIttyRouter(integrationRouter, {
  docs_url: "/api/integration/v1/docs",
  redoc_url: "/api/integration/v1/redoc",
  openapi_url: "/api/integration/v1/openapi.json",
  openapiVersion: "3.1",
  schema: {
    info: {
      title: "Referee FYI Integration API",
      description:
        "The integration API allows external integrations read-only access to shared instances. In order for your application to access the shared instance, you'll need to obtain the integration token from an active instance. This is available to Admins in the Manage Tab.",
      version: "1.0.0",
    },
    tags: [{ name: "v1", description: "Stable" }],
  },
});

openapi.get("/api/integration/v1/:sku/verify", VerifyEndpoint);
openapi.get("/api/integration/v1/:sku/incidents.json", GetIncidentJSONEndpoint);
openapi.get("/api/integration/v1/:sku/incidents.csv", GetIncidentCSVEndpoint);
openapi.get("/api/integration/v1/:sku/incidents.pdf", GetIncidentPDFEndpoint);

export { integrationRouter };
