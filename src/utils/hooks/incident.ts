
export enum IncidentOutcome {
    Minor,
    Major,
    Disabled,
}

export type Incident = {
    event: string;
    division: number;

    match?: number; // match ID
    team?: number;  // team ID

    outcome: IncidentOutcome;
};
