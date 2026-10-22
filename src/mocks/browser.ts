import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";
import { socketHandler } from "./socket";
export const worker = setupWorker(...handlers, socketHandler);
