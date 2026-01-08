import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Approval,
  ApprovalStatus,
  ApprovalType,
} from './entities/approval.entity';
import { CreateApprovalDto } from './dto/create-approval.dto';
import { ReviewApprovalDto } from './dto/review-approval.dto';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UsersService } from '../users/users.service';
import { UserRole } from '../users/entities/user.entity';

@Injectable()
export class ApprovalsService {
  constructor(
    @InjectRepository(Approval)
    private approvalsRepository: Repository<Approval>,
    private documentsService: DocumentsService,
    private notificationsService: NotificationsService,
    private usersService: UsersService,
  ) {}

  async create(
    createApprovalDto: CreateApprovalDto,
    userId: string,
  ): Promise<Approval> {
    const { documentId, type, reason } = createApprovalDto;

    // Verify document exists and user has access
    const document = await this.documentsService.findOne(
      documentId,
      userId,
      false,
    );

    // Check for existing pending approvals
    const existingApproval = await this.approvalsRepository.findOne({
      where: {
        documentId,
        status: ApprovalStatus.PENDING,
      },
    });

    if (existingApproval) {
      throw new ConflictException(
        'There is already a pending approval for this document',
      );
    }

    const approval = this.approvalsRepository.create({
      type,
      documentId,
      reason,
      requestedBy: userId,
    });

    const savedApproval = await this.approvalsRepository.save(approval);

    // Send notifications to all admins
    await this.notifyAdmins(savedApproval, document.title);

    return savedApproval;
  }

  private async notifyAdmins(approval: Approval, documentTitle: string) {
    // Find all admin users (in production, use a more efficient query)
    const admins = await this.usersService.findAll({ role: UserRole.ADMIN });

    const actionText =
      approval.type === ApprovalType.DELETE ? 'deletion' : 'replacement';

    for (const admin of admins) {
      await this.notificationsService.create({
        userId: admin.id,
        type: 'APPROVAL_REQUESTED',
        title: `Approval Request: Document ${actionText}`,
        message: `A request for ${actionText} of document "${documentTitle}" requires your approval.`,
        metadata: {
          approvalId: approval.id,
          documentId: approval.documentId,
          type: approval.type,
        },
      });
    }
  }

  async findAll(userId: string, isAdmin: boolean) {
    const queryBuilder = this.approvalsRepository
      .createQueryBuilder('approval')
      .leftJoinAndSelect('approval.document', 'document')
      .leftJoinAndSelect('approval.requester', 'requester')
      .leftJoinAndSelect('approval.reviewer', 'reviewer');

    if (isAdmin) {
      // Admins see all pending approvals
      queryBuilder.where('approval.status = :status', {
        status: ApprovalStatus.PENDING,
      });
    } else {
      // Users see their own approval requests
      queryBuilder.where('approval.requestedBy = :userId', { userId });
    }

    queryBuilder.orderBy('approval.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  async findOne(id: string): Promise<Approval> {
    const approval = await this.approvalsRepository.findOne({
      where: { id },
      relations: ['document', 'requester', 'reviewer'],
    });

    if (!approval) {
      throw new NotFoundException('Approval not found');
    }

    return approval;
  }

  async review(
    id: string,
    reviewApprovalDto: ReviewApprovalDto,
    reviewerId: string,
    file?: Express.Multer.File,
  ): Promise<Approval> {
    const approval = await this.findOne(id);

    if (approval.status !== ApprovalStatus.PENDING) {
      throw new ConflictException('This approval has already been reviewed');
    }

    approval.status = reviewApprovalDto.status;
    approval.adminComment = reviewApprovalDto.adminComment;
    approval.reviewedBy = reviewerId;
    approval.reviewedAt = new Date();

    const savedApproval = await this.approvalsRepository.save(approval);

    // Execute the approval action
    if (reviewApprovalDto.status === ApprovalStatus.APPROVED) {
      if (approval.type === ApprovalType.DELETE) {
        await this.documentsService.approveDelete(approval.documentId);
      } else if (approval.type === ApprovalType.REPLACE) {
        if (!file) {
          throw new ConflictException(
            'Replacement file is required for approval',
          );
        }
        await this.documentsService.approveReplace(approval.documentId, file);
      }
    } else {
      // Rejected - revert document status
      await this.documentsService.rejectAction(approval.documentId);
    }

    // Notify the requester
    await this.notifyRequester(savedApproval);

    return savedApproval;
  }

  private async notifyRequester(approval: Approval) {
    const statusText =
      approval.status === ApprovalStatus.APPROVED ? 'approved' : 'rejected';
    const actionText =
      approval.type === ApprovalType.DELETE ? 'deletion' : 'replacement';

    await this.notificationsService.create({
      userId: approval.requestedBy,
      type:
        approval.status === ApprovalStatus.APPROVED
          ? 'APPROVAL_APPROVED'
          : 'APPROVAL_REJECTED',
      title: `Request ${statusText}`,
      message: `Your request for ${actionText} has been ${statusText}.${
        approval.adminComment ? ` Admin comment: ${approval.adminComment}` : ''
      }`,
      metadata: {
        approvalId: approval.id,
        documentId: approval.documentId,
        status: approval.status,
      },
    });
  }
}
