
export type Color = "red" | "blue";
export type AutoWinner = Color | "tie" | "none";

export type VRCDetails = {
    program: "VRC";
    awp: Color[];
    auto: AutoWinner;
    replay: boolean;
};

export type VEXUDetails = {
    program: "VEXU";
} & Omit<VRCDetails, "program">;

export type VIQRCDetails = {
    program: "VIQRC"
    replay: boolean;
};

export type Details = VRCDetails | VEXUDetails | VIQRCDetails;

export type MatchNote = {
    event: string;
    division: number;
    match: {
        id: number;
        name: string;
    };
    notes: string;
} & Details;