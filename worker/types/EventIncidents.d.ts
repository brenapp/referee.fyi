import { WebSocketSender } from "./api";

export type UnchangeableProperties = "revision" | "event" | "team";

type RevisionMap = {
    [K in keyof Omit<Incident, UnchangeableProperties>]-?: { property: K, old: Incident[K], new: Incident[K] };
}
type Revision = RevisionMap[keyof RevisionMap];

export type ChangeLog = {
    user: WebSocketSender;
    date: Date;
    changes: Revision[]
};

export type IncidentOutcome = "Minor" | "Major" | "Disabled" | "General"
export type Incident = {
    id: string;

    time: Date;

    event: string; // SKU
    division: number; // division ID

    match?: {
        name: string;
        id: number;
    };
    team?: string; // team number

    revision?: {
        count: number;
        user: WebSocketSender;
        history: ChangeLog[];
    };

    outcome: IncidentOutcome;
    rules: string[];
    notes: string;
};

type EditIncident = Omit<Incident, UnchangeableProperties>;

export type ShareUser = {
    id: string;
    name: string;
}

export type EventIncidentsData = {
    sku: string;
    incidents: Incident[];
    deleted: string[];
};


export type EventIncidentsInitData = {
    sku: string;
};