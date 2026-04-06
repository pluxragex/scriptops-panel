import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { TelegramNotificationService } from '../common/notifications/telegram-notification.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { sanitizeHtml } from '../common/utils/sanitize.util';

@Injectable()
export class NewsService {
  private readonly logger = new Logger(NewsService.name);

  constructor(
    private prisma: PrismaService,
    private telegramNotificationService: TelegramNotificationService,
  ) {}

  async createNews(createNewsDto: CreateNewsDto, authorId: string) {
    const { title, content, excerpt, imageUrl, videoUrl, isPublished, isFeatured, priority } = createNewsDto;


    const sanitizedContent = sanitizeHtml(content);
    const sanitizedExcerpt = excerpt ? sanitizeHtml(excerpt) : null;


    const slug = this.generateSlug(title);


    const existingNews = await this.prisma.news.findUnique({
      where: { slug },
    });

    if (existingNews) {
      throw new BadRequestException('Новость с таким заголовком уже существует');
    }

    const news = await this.prisma.news.create({
      data: {
        title,
        content: sanitizedContent,
        excerpt: sanitizedExcerpt || this.generateExcerpt(sanitizedContent),
        slug,
        imageUrl,
        videoUrl,
        isPublished: isPublished || false,
        isFeatured: isFeatured || false,
        priority: priority || 0,
        publishedAt: isPublished ? new Date() : null,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
    });


    if (isPublished) {
      await this.telegramNotificationService.sendNewsNotification(
        news.title,
        news.id,
        news.slug
      );
    }

    return news;
  }


  async getNews(query: NewsQueryDto) {
    try {
      const { page = 1, limit = 10, published, featured, search } = query;
      const skip = (page - 1) * limit;


      const where: any = {};


      if (published !== undefined) {
        where.isPublished = published;
      } else {

        where.isPublished = true;
      }


      if (featured === true) {
        where.isFeatured = true;
      }


      if (search) {
        where.OR = [
          { title: { contains: search } },
          { content: { contains: search } },
          { excerpt: { contains: search } },
        ];
      }

      const [news, total] = await Promise.all([
        this.prisma.news.findMany({
          where,
          skip,
          take: limit,
          orderBy: [
            { priority: 'desc' },
            { publishedAt: 'desc' },
            { createdAt: 'desc' },
          ],
          include: {
            author: {
              select: {
                id: true,
                username: true,
              },
            },
            _count: {
              select: {
                views: true,
              },
            },
          },
        }),
        this.prisma.news.count({ where }),
      ]);

      return {
        news,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      throw error;
    }
  }


  async getNewsById(idOrSlug: string, userId?: string, ipAddress?: string, userAgent?: string) {
    const news = await this.prisma.news.findFirst({
      where: {
        OR: [
          { id: idOrSlug },
          { slug: idOrSlug },
        ],
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
    });

    if (!news) {
      throw new NotFoundException('Новость не найдена');
    }


    if (!news.isPublished) {
      if (!userId) {
        throw new ForbiddenException('Новость не опубликована');
      }


      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });

      if (news.authorId !== userId && user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
        throw new ForbiddenException('Нет прав на просмотр этой новости');
      }
    }


    await this.recordView(news.id, userId, ipAddress, userAgent);

    return news;
  }


  async updateNews(id: string, updateNewsDto: UpdateNewsDto, userId: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true },
        },
      },
    });

    if (!news) {
      throw new NotFoundException('Новость не найдена');
    }


    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (news.authorId !== userId && user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Нет прав на редактирование этой новости');
    }

    const updateData: any = { ...updateNewsDto };


    if (updateNewsDto.content) {
      updateData.content = sanitizeHtml(updateNewsDto.content);
    }
    if (updateNewsDto.excerpt) {
      updateData.excerpt = sanitizeHtml(updateNewsDto.excerpt);
    }


    if (updateNewsDto.title && updateNewsDto.title !== news.title) {
      updateData.slug = this.generateSlug(updateNewsDto.title);


      const existingNews = await this.prisma.news.findFirst({
        where: {
          slug: updateData.slug,
          id: { not: id },
        },
      });

      if (existingNews) {
        throw new BadRequestException('Новость с таким заголовком уже существует');
      }
    }


    const isBeingPublished = updateNewsDto.isPublished && !news.isPublished;
    if (isBeingPublished) {
      updateData.publishedAt = new Date();
    }


    if (updateNewsDto.isPublished === false && news.isPublished) {
      updateData.publishedAt = null;
    }

    const updatedNews = await this.prisma.news.update({
      where: { id },
      data: updateData,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
    });


    if (isBeingPublished) {
      await this.telegramNotificationService.sendNewsNotification(
        updatedNews.title,
        updatedNews.id,
        updatedNews.slug
      );
    }

    return updatedNews;
  }


  async deleteNews(id: string, userId: string) {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: {
        author: {
          select: { id: true },
        },
      },
    });

    if (!news) {
      throw new NotFoundException('Новость не найдена');
    }


    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    if (news.authorId !== userId && user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Нет прав на удаление этой новости');
    }

    await this.prisma.news.delete({
      where: { id },
    });

    return { message: 'Новость успешно удалена' };
  }


  async getFeaturedNews(limit: number = 5) {
    return this.prisma.news.findMany({
      where: {
        isPublished: true,
        isFeatured: true,
      },
      take: limit,
      orderBy: [
        { priority: 'desc' },
        { publishedAt: 'desc' },
      ],
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
    });
  }


  async getLatestNews(limit: number = 10) {
    return this.prisma.news.findMany({
      where: {
        isPublished: true,
      },
      take: limit,
      orderBy: [
        { publishedAt: 'desc' },
      ],
      include: {
        author: {
          select: {
            id: true,
            username: true,
          },
        },
        _count: {
          select: {
            views: true,
          },
        },
      },
    });
  }


  private async recordView(newsId: string, userId?: string, ipAddress?: string, userAgent?: string) {
    try {

      if (userId) {
        await this.prisma.newsView.upsert({
          where: {
            newsId_userId: {
              newsId,
              userId,
            },
          },
          update: {
            viewedAt: new Date(),
          },
          create: {
            newsId,
            userId,
            viewedAt: new Date(),
          },
        });
      } else if (ipAddress) {

        const existingView = await this.prisma.newsView.findFirst({
          where: {
            newsId,
            userId: null,
            ipAddress,
            userAgent,
          },
        });

        if (!existingView) {
          await this.prisma.newsView.create({
            data: {
              newsId,
              userId: null,
              ipAddress,
              userAgent,
              viewedAt: new Date(),
            },
          });
        }
      }
    } catch (error) {

    }
  }


  async getNewsViewStats(newsId: string) {
    try {
      const [totalViews, uniqueViews, recentViews] = await Promise.all([

        this.prisma.newsView.count({
          where: { newsId },
        }),

        this.prisma.newsView.groupBy({
          by: ['userId', 'ipAddress'],
          where: { newsId },
        }).then(results => results.length),

        this.prisma.newsView.count({
          where: {
            newsId,
            viewedAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

      return {
        totalViews,
        uniqueViews,
        recentViews,
      };
    } catch (error) {
      return {
        totalViews: 0,
        uniqueViews: 0,
        recentViews: 0,
      };
    }
  }


  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
      .substring(0, 100);
  }


  private generateExcerpt(content: string, maxLength: number = 200): string {

    const plainText = content.replace(/<[^>]*>/g, '');

    if (plainText.length <= maxLength) {
      return plainText;
    }


    const truncated = plainText.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');

    return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
  }
}
