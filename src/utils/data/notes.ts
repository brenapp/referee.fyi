import { get, set, update } from "idb-keyval";
import { EventData } from "robotevents/out/endpoints/events";
import { MatchData } from "robotevents/out/endpoints/matches";
import { MatchNote } from "~share/MatchNotes";

export function getMatchNoteID(event: EventData, match: MatchData) {
    return `matchnote_${event.sku}_${match.division.id}_${match.name}`;
};

export async function setMatchNotes(event: EventData, match: MatchData, note: MatchNote): Promise<void> {
    const id = getMatchNoteID(event, match);

    // Add to event index
    await update<string[]>(`matchnotes_${event.sku}`, value => {
        if (!value) {
            return [id]
        }
        return value.includes(id) ? value : [...value, id]
    });
    await set(id, note);
};

export function defaultMatchNote(event: EventData, match: MatchData): MatchNote {
    switch (event.program.code) {
        case "VEXU":
        case "VRC": {
            return {
                program: event.program.code,
                event: event.sku,
                division: match.division.id,
                match: { id: match.id, name: match.name },
                auto: "none",
                awp: [],
                replay: false,
                notes: "",
            }
        }
        case "VIQRC": {
            return {
                program: event.program.code,
                event: event.sku,
                division: match.division.id,
                match: { id: match.id, name: match.name },
                replay: false,
                notes: "",
            }
        }
        default: {
            return {
                program: event.program.code as "VIQRC",
                event: event.sku,
                division: match.division.id,
                match: { id: match.id, name: match.name },
                replay: false,
                notes: ""
            }
        }
    }
};

export async function getMatchNotes(event: EventData, match: MatchData): Promise<MatchNote> {
    const id = getMatchNoteID(event, match);
    const note = await get<MatchNote>(id);
    return note ?? defaultMatchNote(event, match);
};