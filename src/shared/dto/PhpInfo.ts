export enum PhpExtensionStatus {
    NOT_INSTALLED = 'not_installed',
    INSTALLED     = 'installed',
    ENABLED       = 'enabled',
}

export interface PhpInfo {
    phpIniPath: string;
    xdebug:    PhpExtensionStatus;
    apcu:      PhpExtensionStatus;
    opcache:   PhpExtensionStatus;
}
