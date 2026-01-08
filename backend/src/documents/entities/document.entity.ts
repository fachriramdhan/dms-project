import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  VersionColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum DocumentStatus {
  ACTIVE = 'ACTIVE',
  PENDING_DELETE = 'PENDING_DELETE',
  PENDING_REPLACE = 'PENDING_REPLACE',
  DELETED = 'DELETED',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column('text')
  description: string;

  @Column()
  documentType: string;

  @Column()
  fileUrl: string;

  @Column({ nullable: true })
  fileName: string;

  @Column({ type: 'bigint' })
  fileSize: number;

  @VersionColumn()
  version: number;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.ACTIVE,
  })
  status: DocumentStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'createdBy' })
  creator: User;

  @Column()
  createdBy: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
