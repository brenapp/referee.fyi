import WebSocket from "ws";
import pino from "pino";
import { Incident, ShareUser, WebSocketMessage, WebSocketPayload, WebSocketPeerMessage } from "~share/api"
import { readFileSync } from "fs";

const TEAMS = readFileSync("./teams.txt").toString().split("\n");

const START_DATE = new Date();

const SKU = "RE-VRC-22-9725";
const CODE = "DBA-4C5"

function createMockIncident(creator: ShareUser): Incident {
    return {
        id: crypto.randomUUID(),
        division: Math.ceil(Math.random() * 11),
        event: SKU,
        notes: `Created ${creator.name} / ${creator.id};`,
        outcome: "General",
        rules: [],
        time: new Date(),
        team: TEAMS[Math.floor(TEAMS.length * Math.random())],
        revision: {
            count: 0,
            user: { name: creator.name, type: "client" }
        }
    }
};

export async function addServerIncident(incident: Incident, user: ShareUser) {
    const url = new URL(
        `https://referee-fyi-share.bren.workers.dev/api/share/${SKU}/${CODE}/incident`,
    );

    url.searchParams.set("user_id", user.id);

    return fetch(url, {
        method: "PUT",
        body: JSON.stringify(incident),
    });
}

export async function editServerIncident(incident: Incident, user: ShareUser) {
    const url = new URL(
        `https://referee-fyi-share.bren.workers.dev/api/share/${SKU}/${CODE}/incident`,
    );

    url.searchParams.set("user_id", user.id);

    return fetch(url, {
        method: "PATCH",
        body: JSON.stringify(incident),
    });
}

export async function deleteServerIncident(id: string, user: ShareUser) {
    const url = new URL(`https://referee-fyi-share.bren.workers.dev/api/share/${SKU}/${CODE}/incident`);
    url.searchParams.set("id", id);
    url.searchParams.set("user_id", user.id);
    return fetch(url, {
        method: "DELETE",
    });
}

type ClientBodyOptions = {
    ws: WebSocket,
    user: ShareUser,
    signal?: AbortSignal
}

function clientBody({ ws, user, signal }: ClientBodyOptions) {

    let incidents: Incident[] = [];
    let users: string[] = [];

    const logger = pino(
        pino.destination({ dest: `./log/${user.name}-${START_DATE.toISOString()}`, sync: false })
    )

    logger.info("create client");

    function send(message: WebSocketPeerMessage) {
        const payload: WebSocketPayload<WebSocketPeerMessage> = {
            ...message,
            sender: { type: "client", name: user.name ?? "" },
            date: new Date().toISOString(),
        };
        logger.info(payload, "sent");
        return ws.send(JSON.stringify(payload));
    };

    function handleMessage(event: WebSocket.MessageEvent) {
        const data = JSON.parse(event.data.toString()) as WebSocketPayload<WebSocketMessage>;
        logger.info(data, "recv");

        switch (data.type) {
            case "add_incident": {
                incidents.push(data.incident);
                logger.info(incidents, "add_incident");
                break;
            }
            case "update_incident": {
                const index = incidents.findIndex(i => i.id === data.incident.id);
                incidents[index] = data.incident;
                logger.info(incidents, "update_incident");
                break;
            }
            case "remove_incident": {
                const index = incidents.findIndex(i => i.id === data.id);
                incidents.splice(index, 1);
                logger.info(incidents, "remove_incident");
                break;
            };
            case "message": {
                logger.info(data.message, "message");
                break;
            }
            case "server_share_info": {
                users = data.users;
                incidents = data.data.incidents
                logger.info(data.data, "server_share_info");
                break;
            }
            case "server_user_add": {
                users.push(data.user);
                logger.info(users, "server_user_add");
                break;
            }
            case "server_user_remove": {
                const index = users.findIndex(u => u === data.user);
                users.splice(index, 1);
                logger.info(users, "server_user_remove");
                break;
            }
        }
    }

    ws.addEventListener("message", handleMessage);

    const EDIT_INTERVAL = 150000 + (Math.random() * 10000);
    const ADD_INTERVAL = 150000 + (Math.random() * 10000);

    const editTimer = setInterval(() => {
        if (incidents.length < 1) {
            return;
        }
        const index = Math.floor(Math.random() * incidents.length)
        incidents[index].notes += `Edit by ${user.name} / ${user.id}; `;
        incidents[index].revision = { count: (incidents[index].revision?.count ?? 0) + 1, user: { name: user.name, type: "client" } }
        editServerIncident(incidents[index], user).catch(r => logger.error(r));
    }, EDIT_INTERVAL);

    const addTimers = setInterval(() => {
        const incident = createMockIncident(user);
        incidents.push(incident);
        addServerIncident(incident, user).catch(r => logger.error(r));
    }, ADD_INTERVAL);

    signal?.addEventListener("abort", () => {
        clearInterval(editTimer);
        clearInterval(addTimers);
        ws.close();
        logger.error("aborted");
    });

    ws.addEventListener("error", (e) => logger.error(e, "websocket error"));
    ws.addEventListener("close", (e) => {
        logger.error(e, "websocket close");
    });
};



const url = new URL(`wss://referee-fyi-share.bren.workers.dev/api/share/${SKU}/${CODE}/join`);

const controller = new AbortController();

for (let i = 0; i < 100; i++) {

    const name = `U${i}`;
    const id = crypto.randomUUID();
    const user = { name, id };

    url.searchParams.set("name", name);
    url.searchParams.set("id", id);

    const ws = new WebSocket(url.href);
    clientBody({ ws, user, signal: controller.signal });

};