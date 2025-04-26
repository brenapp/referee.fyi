# Integration API

Referee FYI supports an integration API that allows third-party applications to
pull data from a sharing instance with the permission of an administrator on
that instance. _Currently, this integration supports readonly access to Incident
data._

## Bearer Token

All access to the integration requires a bearer token from an instance
administrator. The bearer token is cryptographically derived from the grantor's
private key, which guarantees that bearer tokens are unique to instance
administrators and invalid if the user leaves the instance.

Instance Admins can access the bearer token (and data URLs) from the Manage tab
for the event they are an administrator for.

## Supported Endpoints

The base URL for the production integration API is

```
https://referee.fyi/api/integration/v1/<SKU>/
```

where the SKU is the RobotEvents event code. All endpoints return data in the form of a `ShareResponse`.

```ts
export type ShareResponseSuccess<T> = {
  success: true;
  data: T;
};

export type ShareResponseFailureReason =
  | "bad_request"
  | "server_error"
  | "incorrect_code";

export type ShareResponseFailure = {
  success: false;
  reason: ShareResponseFailureReason;
  details: string;
};

export type ShareResponse<T> = ShareResponseSuccess<T> | ShareResponseFailure;
```

### `https://referee.fyi/api/integration/v1/<SKU>/verify`

The verify endpoint can be used to ensure that your bearer token is valid.

```
/verify?token=<TOKEN>
```

```ts
type User = {
  // Base-64 encoded public key for this user
  key: string;

  // user-entered friendly name
  name: string;
};

type VerifyResponse = ShareResponse<{
  // If the bearer token is valid
  valid: boolean;

  // The user who this bearer token belongs to.
  user: User;

  // The invitation ID. Represents this specific user's invitation to this specific
  // sharing instance. Will change if the user leaves and rejoins a different instance
  invitation: string;
}>;
```

### `https://referee.fyi/api/integration/v1/<SKU>/users`

Gets information about the current users on the sharing instance.

```
/users?token=<TOKEN>
```

```ts
type Invitation = {
  admin: boolean;
  user: User;
};

type UsersResponse = ShareResponse<{
  // Invitations are all users that have access to the sharing instance
  invitations: Invitation[];

  // Active users are directly connected to the websocket and can receive live updates. All active users have invitations.
  active: User[];
}>;
```

### `https://referee.fyi/api/integration/v1/<SKU>/incidents.json`

Returns all incidents for a given instance, in JSON form.

```ts
export type IncidentOutcome =
  | "Minor"
  | "Major"
  | "Disabled"
  | "General"
  | "Inspection";

export type IncidentMatchHeadToHead = {
  type: "match";
  division: number;
  name: string;
  id: number;
};

export type IncidentMatchSkills = {
  type: "skills";
  skillsType: "driver" | "programming";
  attempt: number;
};

export type IncidentMatch = IncidentMatchHeadToHead | IncidentMatchSkills;

export type Incident = {
  // Globally unique, even across sharing instances
  id: string;

  // The timestamp the incident was created, encoded as an ISO-8601 timestamp
  time: string;

  // Event SKU
  event: string;

  match?: IncidentMatch;

  // Team *number*
  team: string;

  outcome: IncidentOutcome;

  // Any attached rules, for this program. Notated like <G1>, <SG7>
  rules: string[];

  // User-entered notes
  notes: string;

  // Any attached assets. The integration API does not currently provide a way to grant access to assets.
  assets: string[];
};

type IncidentsResponse = ShareResponse<Incident[]>;
```

### `https://referee.fyi/api/integration/v1/<SKU>/incidents.csv`

Returns all incidents for a given instance, in CSV form.

```
/incidents.csv?token=<TOKEN>
```

Columns:

```csv
Date,Time,ID,SKU,Division,Match,Team,Outcome,Rules,Notes
```

### `https://referee.fyi/api/integration/v1/<SKU>/incidents.pdf`

Returns all incidents for a given instance, as a human-readable PDF report. The
PDF is grouped by team, and is intended to be a format useful to show to judges
and other external stakeholders.

```
/incidents.pdf?token=<TOKEN>
```
