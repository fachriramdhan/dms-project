import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Document, DocumentStatus } from './entities/document.entity';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { StorageService } from '../storage/storage.service';

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentsRepository: Repository<Document>,
    private storageService: StorageService,
  ) {}

  async create(
    createDocumentDto: CreateDocumentDto,
    file: Express.Multer.File,
    userId: string,
  ): Promise<Document> {
    const { fileName, filePath } = await this.storageService.saveFile(file);

    const document = this.documentsRepository.create({
      ...createDocumentDto,
      fileUrl: filePath,
      fileName: fileName,
      fileSize: file.size,
      createdBy: userId,
      status: DocumentStatus.ACTIVE,
    });

    return this.documentsRepository.save(document);
  }

  async findAll(query: QueryDocumentDto, userId: string, isAdmin: boolean) {
    const { search, documentType, status, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.documentsRepository
      .createQueryBuilder('document')
      .leftJoinAndSelect('document.creator', 'creator');

    // Filter by user if not admin
    if (!isAdmin) {
      queryBuilder.where('document.createdBy = :userId', { userId });
    }

    // Search filter
    if (search) {
      queryBuilder.andWhere(
        '(document.title LIKE :search OR document.description LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Document type filter
    if (documentType) {
      queryBuilder.andWhere('document.documentType = :documentType', {
        documentType,
      });
    }

    // Status filter
    if (status) {
      queryBuilder.andWhere('document.status = :status', { status });
    } else {
      // By default, exclude deleted documents
      queryBuilder.andWhere('document.status != :deletedStatus', {
        deletedStatus: DocumentStatus.DELETED,
      });
    }

    // Pagination
    queryBuilder.skip(skip).take(limit);
    queryBuilder.orderBy('document.createdAt', 'DESC');

    const [documents, total] = await queryBuilder.getManyAndCount();

    return {
      data: documents,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(
    id: string,
    userId: string,
    isAdmin: boolean,
  ): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
      relations: ['creator'],
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Check access rights
    if (!isAdmin && document.createdBy !== userId) {
      throw new ForbiddenException('You do not have access to this document');
    }

    return document;
  }

  async update(
    id: string,
    updateDocumentDto: UpdateDocumentDto,
    userId: string,
    isAdmin: boolean,
  ): Promise<Document> {
    const document = await this.findOne(id, userId, isAdmin);

    // Check if document is locked for approval
    if (
      document.status === DocumentStatus.PENDING_DELETE ||
      document.status === DocumentStatus.PENDING_REPLACE
    ) {
      throw new ConflictException(
        'Document is pending approval and cannot be modified',
      );
    }

    Object.assign(document, updateDocumentDto);
    return this.documentsRepository.save(document);
  }

  async requestReplace(
    id: string,
    file: Express.Multer.File,
    userId: string,
    version: number,
  ): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.createdBy !== userId) {
      throw new ForbiddenException('You can only replace your own documents');
    }

    // Optimistic locking check
    if (document.version !== version) {
      throw new ConflictException(
        'Document has been modified by another user. Please refresh and try again.',
      );
    }

    if (document.status !== DocumentStatus.ACTIVE) {
      throw new ConflictException('Document is not in active state');
    }

    // Update status to pending replace
    document.status = DocumentStatus.PENDING_REPLACE;
    return this.documentsRepository.save(document);
  }

  async requestDelete(
    id: string,
    userId: string,
    version: number,
  ): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.createdBy !== userId) {
      throw new ForbiddenException('You can only delete your own documents');
    }

    // Optimistic locking check
    if (document.version !== version) {
      throw new ConflictException(
        'Document has been modified by another user. Please refresh and try again.',
      );
    }

    if (document.status !== DocumentStatus.ACTIVE) {
      throw new ConflictException('Document is not in active state');
    }

    // Update status to pending delete
    document.status = DocumentStatus.PENDING_DELETE;
    return this.documentsRepository.save(document);
  }

  async approveReplace(
    id: string,
    file: Express.Multer.File,
  ): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.PENDING_REPLACE) {
      throw new ConflictException('Document is not pending replacement');
    }

    // Delete old file
    await this.storageService.deleteFile(document.fileName);

    // Save new file
    const { fileName, filePath } = await this.storageService.saveFile(file);

    document.fileUrl = filePath;
    document.fileName = fileName;
    document.fileSize = file.size;
    document.status = DocumentStatus.ACTIVE;

    return this.documentsRepository.save(document);
  }

  async approveDelete(id: string): Promise<void> {
    const document = await this.documentsRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (document.status !== DocumentStatus.PENDING_DELETE) {
      throw new ConflictException('Document is not pending deletion');
    }

    // Delete file from storage
    await this.storageService.deleteFile(document.fileName);

    // Mark as deleted
    document.status = DocumentStatus.DELETED;
    await this.documentsRepository.save(document);
  }

  async rejectAction(id: string): Promise<Document> {
    const document = await this.documentsRepository.findOne({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    if (
      document.status !== DocumentStatus.PENDING_DELETE &&
      document.status !== DocumentStatus.PENDING_REPLACE
    ) {
      throw new ConflictException('Document is not pending any action');
    }

    // Revert to active status
    document.status = DocumentStatus.ACTIVE;
    return this.documentsRepository.save(document);
  }
}
