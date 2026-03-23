import { AssetsService } from './assets.service';
import { CreateAssetDto } from './dto/create-asset.dto';
import { Response } from 'express';
export declare class AssetsController {
    private readonly assetsService;
    constructor(assetsService: AssetsService);
    getTemplate(res: Response): Promise<void>;
    import(file: any): Promise<{
        success: number;
        errors: any[];
        total: any;
    }>;
    reset(): Promise<{
        message: string;
    }>;
    create(dto: CreateAssetDto): Promise<any>;
    findAll(): Promise<any[]>;
    getByTag(tagId: string): Promise<any>;
    update(id: string, updateDto: any): Promise<{
        message: string;
    }>;
    remove(id: string): Promise<{
        message: string;
    }>;
    findOne(id: string): Promise<{
        debug: boolean;
        id_recu: string;
    }>;
}
