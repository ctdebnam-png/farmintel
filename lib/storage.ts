import fs from 'fs/promises';
import path from 'path';

export interface StorageProvider {
  save(key: string, data: Buffer): Promise<string>;
  read(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
}

class LocalStorage implements StorageProvider {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.UPLOAD_DIR || './uploads';
  }

  async save(key: string, data: Buffer): Promise<string> {
    const filePath = path.join(this.baseDir, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return filePath;
  }

  async read(key: string): Promise<Buffer> {
    const filePath = path.join(this.baseDir, key);
    return fs.readFile(filePath);
  }

  async exists(key: string): Promise<boolean> {
    try {
      const filePath = path.join(this.baseDir, key);
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton – swap implementation here when adding S3/R2 later
export const storage: StorageProvider = new LocalStorage();
