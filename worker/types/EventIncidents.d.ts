export type IncidentOutcome = "Minor" | "Major" | "Disabled"

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

    outcome: IncidentOutcome;
    rules: string[];
    notes: string;
};

export type ShareUser = {
    id: string;
    name: string;
}

export type EventIncidents = {
    sku: string;
    owner?: ShareUser;
    incidents: Incident[]
}