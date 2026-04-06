export interface ServerItemInterface {
    updateStatus(isRunning: boolean): void;
    updatePort(port: string): void;
}
