export interface LogMessage {
    time: string;
    level: string;
    message: string;
    name?: string;
    record_id?: number | null;
}
