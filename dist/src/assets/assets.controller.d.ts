import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
export declare class AssetsController {
    private readonly assetsService;
    constructor(assetsService: AssetsService);
    create(dto: CreateAssetDto): Promise<import("./dto/asset-output.dto").AssetOutputDto>;
    findAll(): Promise<import("./dto/asset-output.dto").AssetOutputDto[]>;
    getByTag(tagId: string): Promise<import("./dto/asset-output.dto").AssetOutputDto>;
    update(id: string, updateDto: any): Promise<{
        message: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
}
