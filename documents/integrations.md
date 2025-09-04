# Integration API

Referee FYI supports an integration API that allows third-party applications to
pull data from a sharing instance with the permission of an administrator on
that instance. _Currently, this integration supports readonly access to incident
data._

> Note: the Integration API is currently provided for free for applications that
> wish to pull data from Referee FYI. The authors disclaim all liability from
> integrating with Referee FYI in your application, and all services are
> provided as-is, with no guarantee of future available. We will attempt to
> provide notice here for any significant disruption or change to the service.

## Background

Referee FYI is an application that allows Head Referees at robotics events to
record match violations (Incidents) and maintain a digital anomaly log. If they
wish to share the anomaly log between multiple people, they can use the Sync
Engine to allow multiple Head Referees to coordinate on a shared match anomaly
log. Your application communicates with the Sync Engine to obtain information
about a particular event.

Referee FYI's sharing mechanism is designed to be resilient to unstable network
conditions, so different users can have different understandings of the current
match anomaly log, and we must reconcile those changes when the devices are able
to "sync up" again at some point in the future. How this is accomplished is
beyond the scope of this document, but it's important to remember that your
application is accessing the _sync engine's_ understanding of the current match
anomaly log. If the Head Referee's device loses internet access for multiple
hours, they wil be able to continue to record incidents, and your application
would not have access to that data.

## Authorization

All access to the integration requires a bearer token from an instance
administrator. The bearer token is cryptographically derived from the grantor's
private key, which guarantees that bearer tokens are unique to instance
administrators and invalid if the user leaves the instance.

Instance Admins can access the bearer token (and data URLs) from the Manage tab
for the event they are an administrator for.

When developing applications that integrate with Referee FYI, you should prompt
the user to copy the Bearer token from the Manage tab for a particular event.
Access to a bearer token allows your application to pull data from a particular
event on behalf of that user.

You can pass the bearer token either in the `token` query parameter, or using
the standard `Authorization: Bearer <token>`, but you should not specify both.
You should only use the `token` query parameter if your use case (say, exporting
Referee FYI to a spreadsheet), does not support passing a header.

You can use the verify endpoint to validate that the token a user has given to
you is currently valid.

```bash
curl -X 'GET' \
  'https://referee.fyi/api/integration/v1/RE-VIQRC-25-1030/verify' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer <TOKEN>'
```

## Supported Endpoints

The main base URL for the production integration API is:

```
https://referee.fyi/api/
```

- OpenAPI Specification: `https://referee.fyi/api/integration/openapi`
- Swagger Documentation: `https://referee.fyi/api/integration/swagger`
