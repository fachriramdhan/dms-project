import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApprovalStatus } from '../entities/approval.entity';

export class ReviewApprovalDto {
  @IsEnum(ApprovalStatus)
  status: ApprovalStatus;

  @IsString()
  @IsOptional()
  adminComment?: string;
}
