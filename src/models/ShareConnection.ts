import { ShareUser, UserInvitation, WebSocketMessage, WebSocketPayload, WebSocketPeerMessage } from "~share/api";
import { create } from "zustand";
import { editServerIncident, getShareData, getShareId, getShareName, URL_BASE } from "~utils/data/share";
import { signWebSocketConnectionURL } from "~utils/data/crypto";
import { deleteIncident, getIncident, getIncidentsByEvent, hasIncident, newIncident, setIncident } from "~utils/data/incident";
import { queryClient } from "~utils/data/query";
import { toast } from "~components/Toast";

export type ShareConnectionData = {
    readyState: number;
    websocket: WebSocket | null;
    invitation: UserInvitation | null;
    activeUsers: ShareUser[];
};

export type ShareConnectionActions = {
    handleWebsocketMessage(data: WebSocketPayload<WebSocketMessage>): Promise<void>
    send(message: WebSocketPeerMessage): Promise<void>
    connect(invitation: UserInvitation): Promise<void>
    disconnect(): Promise<void>;
    forceSync(): Promise<void>
};

type ShareConnection = ShareConnectionData & ShareConnectionActions;


export const useShareConnection = create<ShareConnection>((set, get) => ({
    readyState: WebSocket.CLOSED,
    websocket: null,
    invitation: null,
    activeUsers: [],

    forceSync: async () => {
        const sku = get().invitation?.sku;
        if (!sku) {
            return;
        }

        const response = await getShareData(sku);

        if (!response.success) {
            toast({ type: "error", message: `Error when communicating with sharing server. ${response.details}` })
            return;
        };

        await get().handleWebsocketMessage({
            type: "server_share_info",
            users: get().activeUsers,
            date: new Date().toISOString(),
            data: response.data,
            sender: { type: "server" }
        });

        toast({ type: "info", message: "Synchronized with the server!" })
    },

    handleWebsocketMessage: async (data: WebSocketPayload<WebSocketMessage>) => {
        const users = get().activeUsers;
        switch (data.type) {
            case "add_incident": {
                const has = await hasIncident(data.incident.id);
                if (!has) {
                    await newIncident(data.incident, false, data.incident.id);
                    queryClient.invalidateQueries({ queryKey: ["incidents"] });
                }
                break;
            }
            case "update_incident": {
                await setIncident(data.incident.id, data.incident);
                queryClient.invalidateQueries({ queryKey: ["incidents"] });
                break;
            }
            case "remove_incident": {
                await deleteIncident(data.id, false);
                queryClient.invalidateQueries({ queryKey: ["incidents"] });
                break;
            }

            // Sent when you first join, We definitely don't want to
            // *delete* incidents the user creates before joining the share, unless they are listed as
            // being deleted on the server.
            case "server_share_info": {
                set({ activeUsers: data.users });

                for (const incident of data.data.incidents) {
                    const has = await hasIncident(incident.id);

                    // Handle newly created incidents
                    if (!has) {
                        await newIncident(incident, false, incident.id);

                        // Handle any incidents with different revisions while offline
                    } else {
                        const current = (await getIncident(incident.id))!;

                        const localRevision = current.revision?.count ?? 0;
                        const remoteRevision = incident.revision?.count ?? 0;

                        if (localRevision > remoteRevision) {
                            const response = await editServerIncident(current);
                            if (response?.success) {
                                current.revision = response.data;
                            }
                            await setIncident(incident.id, current);
                            queryClient.invalidateQueries({ queryKey: ["incidents"] });
                        }

                        if (remoteRevision > localRevision) {
                            await setIncident(incident.id, incident);
                            queryClient.invalidateQueries({ queryKey: ["incidents"] });
                        }
                    }
                }

                // Explicitly delete incidents marked as deleted first.
                for (const id of data.data.deleted) {
                    await deleteIncident(id, false);
                }

                const eventIncidents = await getIncidentsByEvent(get().invitation!.sku);
                const localOnly = eventIncidents.filter((local) =>
                    data.data.incidents.every((remote) => local.id !== remote.id)
                );

                for (const incident of localOnly) {
                    await get().send({ type: "add_incident", incident });
                }

                break;
            }

            case "server_user_add": {
                toast({ type: "info", message: `${data.user.name} joined.` });
                if (users.findIndex(u => u.id === data.user.id) < 0) {
                    set({ activeUsers: [...users, data.user] });
                }
                queryClient.invalidateQueries({ queryKey: ["event_invitation_all"] });
                break;
            }
            case "server_user_remove": {
                toast({ type: "info", message: `${data.user.name} left.` });
                set(d => ({ activeUsers: d.activeUsers.filter(u => u.id !== data.user.id) }))
                queryClient.invalidateQueries({ queryKey: ["event_invitation_all"] });
                break;
            }
            case "message": {
                const sender =
                    data.sender.type === "server" ? "Server" : data.sender.name;
                toast({ type: "info", message: `${sender}: ${data.message}` });
                break;
            }
        }
    },

    send: async (message: WebSocketPeerMessage) => {
        const id = await getShareId();
        const name = await getShareName();
        const payload: WebSocketPayload<WebSocketPeerMessage> = {
            ...message,
            sender: { type: "client", id, name },
            date: new Date().toISOString(),
        };
        get().websocket?.send(JSON.stringify(payload));
    },

    connect: async (invitation) => {

        const current = get();
        if (current.invitation && current.invitation.id === invitation.id) {
            return;
        }

        await current.disconnect();

        // Prepare URL
        const url = new URL(`/api/${invitation.sku}/join`, URL_BASE);

        if (url.protocol === "https:") {
            url.protocol = "wss:";
        } else {
            url.protocol = "ws:";
        }

        const id = await getShareId();
        const name = await getShareName();

        url.searchParams.set("id", id);
        url.searchParams.set("name", name);

        const signedURL = await signWebSocketConnectionURL(url);

        const websocket = new WebSocket(signedURL);

        websocket.onopen = () => set({ readyState: WebSocket.OPEN });
        websocket.onmessage = (event: MessageEvent) => {
            try {
                const data = JSON.parse(event.data) as WebSocketPayload<WebSocketMessage>;
                get().handleWebsocketMessage(data);
            } catch (e) {
                toast({ type: "error", message: `${e}` });
            }
        }
        websocket.onclose = () => {
            set({ readyState: WebSocket.CLOSING });
            setTimeout(() => get().connect(invitation), 5000);
        }
        websocket.onerror = () => {
            toast({ type: "error", message: "Could not connect to sharing server." });
        }

        set({ readyState: WebSocket.CONNECTING, activeUsers: [], invitation, websocket });
    },

    disconnect: async () => {
        get().websocket?.close();
        return set({ readyState: WebSocket.CLOSED, activeUsers: [], invitation: null, websocket: null });
    }
}));
