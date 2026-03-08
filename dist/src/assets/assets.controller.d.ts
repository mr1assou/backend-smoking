import { AssetsService } from './assets.service';
export declare class AssetsController {
    private readonly assetsService;
    constructor(assetsService: AssetsService);
    getByTag(tagId: string): Promise<import("./dto/asset-output.dto").AssetOutputDto>;
    update(id: string, updateDto: any): Promise<{
        message: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
