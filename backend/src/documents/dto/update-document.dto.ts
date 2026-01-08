import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateDocumentDto {
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  documentType?: string;
}
