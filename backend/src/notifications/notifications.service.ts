import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';

interface CreateNotificationDto {
  userId: string;
  type: NotificationType | string;
  title: string;
  message: string;
  metadata?: any;
}

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
  ) {}

  async create(
    createNotificationDto: CreateNotificationDto,
  ): Promise<Notification> {
    // Cast type to NotificationType enum
    const notification = this.notificationsRepository.create({
      ...createNotificationDto,
      type: createNotificationDto.type as NotificationType,
    });
    return this.notificationsRepository.save(notification);
  }

  async findAllForUser(
    userId: string,
    unreadOnly: boolean = false,
  ): Promise<Notification[]> {
    const queryBuilder = this.notificationsRepository
      .createQueryBuilder('notification')
      .where('notification.userId = :userId', { userId });

    if (unreadOnly) {
      queryBuilder.andWhere('notification.isRead = :isRead', { isRead: false });
    }

    queryBuilder.orderBy('notification.createdAt', 'DESC');

    return queryBuilder.getMany();
  }

  async markAsRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllAsRead(userId: string): Promise<void> {
    await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
  }
}
