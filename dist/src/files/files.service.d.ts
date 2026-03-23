export declare class FilesService {
    private readonly uploadPath;
    constructor();
    private ensureUploadDir;
    saveBase64Image(base64String: string): Promise<string>;
}
