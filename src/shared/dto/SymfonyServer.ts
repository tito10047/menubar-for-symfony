export interface SymfonyServer {
    directory: string;
    port: number;
    url: string;
    domain?: string;
    isRunning: boolean;
    phpVersion?: string;
}
