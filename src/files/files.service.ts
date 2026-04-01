import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly uploadPath = path.join(process.cwd(), 'uploads');

  constructor() {
    this.ensureUploadDir();
  }

  private ensureUploadDir() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async saveBase64Image(base64String: string): Promise<string> {
    try {
      // Nettoyer la chaîne base64 (enlever le préfixe data:image/jpeg;base64, si présent)
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');

      const fileName = `${uuidv4()}.jpg`;
      const filePath = path.join(this.uploadPath, fileName);

      // Enregistrement asynchrone
      await fs.promises.writeFile(filePath, base64Data, 'base64');

      // Retourner l'URL relative
      return `/uploads/${fileName}`;
    } catch (error) {
      console.error('FilesService Error:', error);
      throw new InternalServerErrorException(
        "Erreur lors de l'enregistrement de l'image.",
      );
    }
  }
}
