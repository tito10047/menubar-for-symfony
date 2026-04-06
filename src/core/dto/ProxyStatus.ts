export interface SymfonyProxy {
    domain: string;
    directory: string;
}

export interface ProxyStatus {
    isRunning: boolean;
    proxies: SymfonyProxy[];
}
