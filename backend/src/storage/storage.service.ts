import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private uploadPath: string;

  constructor(private configService: ConfigService) {
    this.uploadPath = this.configService.get('UPLOAD_PATH') || './uploads';
    this.ensureUploadDirectory();
  }

  private ensureUploadDirectory() {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async saveFile(
    file: Express.Multer.File,
  ): Promise<{ fileName: string; filePath: string }> {
    const fileExtension = path.extname(file.originalname);
    const fileName = `${uuidv4()}${fileExtension}`;
    const filePath = path.join(this.uploadPath, fileName);

    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, file.buffer, (err) => {
        if (err) {
          reject(new BadRequestException('Failed to save file'));
        } else {
          resolve({ fileName, filePath: `/uploads/${fileName}` });
        }
      });
    });
  }

  async deleteFile(fileName: string): Promise<void> {
    const filePath = path.join(this.uploadPath, fileName);

    return new Promise((resolve, reject) => {
      fs.unlink(filePath, (err) => {
        if (err && err.code !== 'ENOENT') {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  getFilePath(fileName: string): string {
    return path.join(this.uploadPath, fileName);
  }
}
