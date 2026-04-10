import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { UpdateAssetDto } from './dto/update-asset.dto';
import { Response } from 'express';
export declare class AssetsController {
    private readonly assetsService;
    constructor(assetsService: AssetsService);
    getTemplate(res: Response): Promise<void>;
    import(file: any): Promise<{
        success: number;
        skipped_no_name: number;
        errors: any[];
        total: any;
    }>;
    reset(): Promise<{
        message: string;
    }>;
    findUntagged(): Promise<any[]>;
    findOrphans(q?: string): Promise<any[]>;
    getCategories(): Promise<{
        id: string;
        name: string;
    }[]>;
    getByTag(tagId: string): Promise<any>;
    create(dto: CreateAssetDto): Promise<any>;
    findAll(): Promise<any[]>;
    enroll(id: string, tagId: string): Promise<any>;
    update(id: string, body: UpdateAssetDto): Promise<any>;
    findOne(id: string): Promise<any>;
    remove(id: string): Promise<any>;
}
