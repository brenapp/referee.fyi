import { QueryClient } from "react-query";
import { toast } from "~components/Toast";

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            onError(err) {
                toast({ type: "error", message: `${err}` })
            }
        }
    }
});
