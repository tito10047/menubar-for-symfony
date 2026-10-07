import { CustomActionDescriptor } from '../../../shared/dto/CustomActionDescriptor.js';

export interface ServerItemInterface {
    updateStatus(isRunning: boolean): void;
    updatePort(port: string): void;
    updatePhpVersion(version: string | null): void;
    /** Custom actions are loaded by the daemon, so they arrive after the item exists. */
    updateCustomActions(actions: CustomActionDescriptor[]): void;
}
