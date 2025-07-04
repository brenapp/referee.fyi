/**
 * This file was auto-generated by openapi-typescript.
 * Do not make direct changes to the file.
 */

export interface paths {
    "/internal/update": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Endpoint for checking if clients have the latest database. */
        get: operations["getInternalUpdate"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/qnas/recently-asked": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Get the 20 most recently asked Q&As */
        get: operations["getApiQnasRecently-asked"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/qnas/recently-answered": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Get the 20 most recently answered Q&As */
        get: operations["getApiQnasRecently-answered"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/qnas/asked-by/{author}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Get all Q&As asked by the given author */
        get: operations["getApiQnasAsked-byByAuthor"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/qnas/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Get the Q&A with the given ID */
        get: operations["getApiQnasById"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/rules/{rule}/qnas": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** @description Get all Q&As in the current season tagged with a specific rule */
        get: operations["getApiRulesByRuleQnas"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: never;
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getInternalUpdate: {
        parameters: {
            query: {
                version: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        outdated: boolean;
                        version?: string;
                        questions?: {
                            /** @description The question's numerical ID */
                            id: string;
                            /** @description The url of the question */
                            url: string;
                            /** @description The person who asked the question */
                            author: string;
                            /** @description The program this question was asked in (e.g., V5RC, VURC, etc) */
                            program: string;
                            /** @description The title of the question */
                            title: string;
                            /** @description The season this question was asked in (e.g., 2022-2023) */
                            season: string;
                            /** @description When this question was asked (in the format DD-Mon-YYYY) */
                            askedTimestamp: string;
                            /** @description The askedTimestamp in milliseconds */
                            askedTimestampMs: number;
                            /** @description When this question was answered (in the format DD-Mon-YYYY) */
                            answeredTimestamp: string | null;
                            /** @description The answeredTimestamp in milliseconds */
                            answeredTimestampMs: number | null;
                            /** @description Whether the question was answered */
                            answered: boolean;
                            /** @description Tags added to this question */
                            tags: string[];
                            /** @description The question content as plain text */
                            question: string;
                            /** @description The question content as raw html */
                            questionRaw: string;
                            /** @description The answer content as plain text */
                            answer: string | null;
                            /** @description The answer content as raw html */
                            answerRaw: string | null;
                        }[];
                    };
                };
            };
            /** @description Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    "getApiQnasRecently-asked": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description The question's numerical ID */
                        id: string;
                        /** @description The url of the question */
                        url: string;
                        /** @description The person who asked the question */
                        author: string;
                        /** @description The program this question was asked in (e.g., V5RC, VURC, etc) */
                        program: string;
                        /** @description The title of the question */
                        title: string;
                        /** @description The season this question was asked in (e.g., 2022-2023) */
                        season: string;
                        /** @description When this question was asked (in the format DD-Mon-YYYY) */
                        askedTimestamp: string;
                        /** @description The askedTimestamp in milliseconds */
                        askedTimestampMs: number;
                        /** @description When this question was answered (in the format DD-Mon-YYYY) */
                        answeredTimestamp: string | null;
                        /** @description The answeredTimestamp in milliseconds */
                        answeredTimestampMs: number | null;
                        /** @description Whether the question was answered */
                        answered: boolean;
                        /** @description Tags added to this question */
                        tags: string[];
                    }[];
                };
            };
            /** @description Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    "getApiQnasRecently-answered": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description The question's numerical ID */
                        id: string;
                        /** @description The url of the question */
                        url: string;
                        /** @description The person who asked the question */
                        author: string;
                        /** @description The program this question was asked in (e.g., V5RC, VURC, etc) */
                        program: string;
                        /** @description The title of the question */
                        title: string;
                        /** @description The season this question was asked in (e.g., 2022-2023) */
                        season: string;
                        /** @description When this question was asked (in the format DD-Mon-YYYY) */
                        askedTimestamp: string;
                        /** @description The askedTimestamp in milliseconds */
                        askedTimestampMs: number;
                        /** @description When this question was answered (in the format DD-Mon-YYYY) */
                        answeredTimestamp: string | null;
                        /** @description The answeredTimestamp in milliseconds */
                        answeredTimestampMs: number | null;
                        /** @description Whether the question was answered */
                        answered: boolean;
                        /** @description Tags added to this question */
                        tags: string[];
                    }[];
                };
            };
            /** @description Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    "getApiQnasAsked-byByAuthor": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                author: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description The question's numerical ID */
                        id: string;
                        /** @description The url of the question */
                        url: string;
                        /** @description The person who asked the question */
                        author: string;
                        /** @description The program this question was asked in (e.g., V5RC, VURC, etc) */
                        program: string;
                        /** @description The title of the question */
                        title: string;
                        /** @description The season this question was asked in (e.g., 2022-2023) */
                        season: string;
                        /** @description When this question was asked (in the format DD-Mon-YYYY) */
                        askedTimestamp: string;
                        /** @description The askedTimestamp in milliseconds */
                        askedTimestampMs: number;
                        /** @description When this question was answered (in the format DD-Mon-YYYY) */
                        answeredTimestamp: string | null;
                        /** @description The answeredTimestamp in milliseconds */
                        answeredTimestampMs: number | null;
                        /** @description Whether the question was answered */
                        answered: boolean;
                        /** @description Tags added to this question */
                        tags: string[];
                    }[];
                };
            };
            /** @description Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getApiQnasById: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description The question's numerical ID */
                        id: string;
                        /** @description The url of the question */
                        url: string;
                        /** @description The person who asked the question */
                        author: string;
                        /** @description The program this question was asked in (e.g., V5RC, VURC, etc) */
                        program: string;
                        /** @description The title of the question */
                        title: string;
                        /** @description The season this question was asked in (e.g., 2022-2023) */
                        season: string;
                        /** @description When this question was asked (in the format DD-Mon-YYYY) */
                        askedTimestamp: string;
                        /** @description The askedTimestamp in milliseconds */
                        askedTimestampMs: number;
                        /** @description When this question was answered (in the format DD-Mon-YYYY) */
                        answeredTimestamp: string | null;
                        /** @description The answeredTimestamp in milliseconds */
                        answeredTimestampMs: number | null;
                        /** @description Whether the question was answered */
                        answered: boolean;
                        /** @description Tags added to this question */
                        tags: string[];
                    };
                };
            };
            /** @description Not Found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getApiRulesByRuleQnas: {
        parameters: {
            query?: {
                season?: string;
            };
            header?: never;
            path: {
                rule: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Successful Response */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @description The question's numerical ID */
                        id: string;
                        /** @description The url of the question */
                        url: string;
                        /** @description The person who asked the question */
                        author: string;
                        /** @description The program this question was asked in (e.g., V5RC, VURC, etc) */
                        program: string;
                        /** @description The title of the question */
                        title: string;
                        /** @description The season this question was asked in (e.g., 2022-2023) */
                        season: string;
                        /** @description When this question was asked (in the format DD-Mon-YYYY) */
                        askedTimestamp: string;
                        /** @description The askedTimestamp in milliseconds */
                        askedTimestampMs: number;
                        /** @description When this question was answered (in the format DD-Mon-YYYY) */
                        answeredTimestamp: string | null;
                        /** @description The answeredTimestamp in milliseconds */
                        answeredTimestampMs: number | null;
                        /** @description Whether the question was answered */
                        answered: boolean;
                        /** @description Tags added to this question */
                        tags: string[];
                    }[];
                };
            };
            /** @description Server Error */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
