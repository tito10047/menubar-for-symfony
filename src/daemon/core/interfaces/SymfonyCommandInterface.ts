import { LoggerInterface } from '../../../shared/interfaces/LoggerInterface.js';

export interface SymfonyCommandInterface<T> {
    getName(): string;
    execute(args?: string[]): Promise<T>;
    setLogger(logger: LoggerInterface): void;
}
