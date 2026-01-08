import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApprovalsService } from './approvals.service';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../users/entities/user.entity';

@Controller('approvals')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ApprovalsController {
  constructor(private approvalsService: ApprovalsService) {}

  @Post()
  async create(
    @Body() createApprovalDto: CreateApprovalDto,
    @CurrentUser() user: any,
  ) {
    return this.approvalsService.create(createApprovalDto, user.userId);
  }

  @Get()
  async findAll(@CurrentUser() user: any) {
    const isAdmin = user.role === UserRole.ADMIN;
    return this.approvalsService.findAll(user.userId, isAdmin);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.approvalsService.findOne(id);
  }

  @Post(':id/review')
  @Roles(UserRole.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async review(
    @Param('id') id: string,
    @Body() reviewApprovalDto: ReviewApprovalDto,
    @CurrentUser() user: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.approvalsService.review(
      id,
      reviewApprovalDto,
      user.userId,
      file,
    );
  }
}
