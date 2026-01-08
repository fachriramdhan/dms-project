import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('documents')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentsController {
  constructor(private documentsService: DocumentsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async create(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    return this.documentsService.create(createDocumentDto, file, user.userId);
  }

  @Get()
  async findAll(@Query() query: QueryDocumentDto, @CurrentUser() user: any) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.documentsService.findAll(query, user.userId, isAdmin);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.documentsService.findOne(id, user.userId, isAdmin);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @CurrentUser() user: any,
  ) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.documentsService.update(
      id,
      updateDocumentDto,
      user.userId,
      isAdmin,
    );
  }

  @Post(':id/request-replace')
  @UseInterceptors(FileInterceptor('file'))
  async requestReplace(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('version') version: string,
    @CurrentUser() user: any,
  ) {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (!version) {
      throw new BadRequestException(
        'Version is required for optimistic locking',
      );
    }

    return this.documentsService.requestReplace(
      id,
      file,
      user.userId,
      parseInt(version, 10),
    );
  }

  @Delete(':id/request-delete')
  async requestDelete(
    @Param('id') id: string,
    @Body('version') version: string,
    @CurrentUser() user: any,
  ) {
    if (!version) {
      throw new BadRequestException(
        'Version is required for optimistic locking',
      );
    }

    return this.documentsService.requestDelete(
      id,
      user.userId,
      parseInt(version, 10),
    );
  }
}
