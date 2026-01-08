import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';
import { ApprovalType } from '../entities/approval.entity';

export class CreateApprovalDto {
  @IsEnum(ApprovalType)
  type: ApprovalType;

  @IsString()
  @IsNotEmpty()
  documentId: string;

  @IsString()
  @IsOptional()
  reason?: string;
}
