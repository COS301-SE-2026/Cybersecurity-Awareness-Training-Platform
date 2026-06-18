import { Exports, ServerOptions } from './state.cjs';
export { ServerAlreadyRunningError } from './state.cjs';
import { DBServerPurpose } from './db.cjs';
import 'valibot';
import '@electric-sql/pglite';

declare const DEFAULT_DATABASE_PORT = 51214;
declare const DEFAULT_SERVER_PORT = 51213;
declare const DEFAULT_SHADOW_DATABASE_PORT = 51215;
type PortAssignableService = DBServerPurpose | "server";
declare class PortNotAvailableError extends Error {
    readonly port: number;
    name: string;
    constructor(port: number);
}

interface Server extends Exports {
    close(): Promise<void>;
    name: string;
}
type ReadonlyServer = Omit<Server, "close">;
declare function unstable_startServer(options?: ServerOptions): Promise<Server>;

export { DEFAULT_DATABASE_PORT, DEFAULT_SERVER_PORT, DEFAULT_SHADOW_DATABASE_PORT, type PortAssignableService, PortNotAvailableError, type ReadonlyServer, type Server, ServerOptions, unstable_startServer };
