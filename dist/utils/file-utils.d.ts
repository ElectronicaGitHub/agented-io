export declare const getJsonFromFileSync: (filePath: string, defaultValue?: {}, folderPath?: string) => any;
export declare const getJsonFromFileAsync: <T = any>(filePath: string, defaultValue?: any, folderPath?: string) => Promise<T>;
export declare const saveJsonToFileSync: (filePath: string, data: any, folderPath?: string) => void;
export declare const saveJsonToFileAsync: <T = any>(filePath: string, data: T, folderPath?: string) => Promise<void>;
export declare const pushToJsonArrayFromFileAsync: <T = any>(result: T[], fileP: string, folderPath?: string) => Promise<void>;
export declare function readFileAsync(filename: string, folderPath?: string): Promise<any>;
export declare function writeFileAsync(filename: string, string: any, folderPath?: string): Promise<void>;
export declare function saveCsvToFileAsync(fileName: string, data: Record<string, any>[], folderPath: string): Promise<void>;
