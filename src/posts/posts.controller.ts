import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import {
  ListPostCommentsQueryDto,
  resolveCommentsPagination,
} from './dto/list-post-comments-query.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CreatePostDto } from './dto/create-post.dto';
import { ListPostsQueryDto } from './dto/list-posts-query.dto';
import { VotePostDto } from './dto/vote-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PostsService } from './posts.service';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @UseGuards(JwtGuard)
  @Get()
  list(
    @Req() req: Request & { user: { userId: number } },
    @Query() query: ListPostsQueryDto,
  ) {
    return this.postsService.listFeed(req.user.userId, query);
  }

  @UseGuards(JwtGuard)
  @Post()
  create(
    @Req() req: Request & { user: { userId: number } },
    @Body() dto: CreatePostDto,
  ) {
    return this.postsService.createPost(req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Get(':postId')
  getOne(
    @Req() req: Request & { user: { userId: number } },
    @Param('postId', ParseIntPipe) postId: number,
  ) {
    return this.postsService.getPost(req.user.userId, postId);
  }

  @UseGuards(JwtGuard)
  @Patch(':postId')
  update(
    @Req() req: Request & { user: { userId: number } },
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: UpdatePostDto,
  ) {
    return this.postsService.updatePost(postId, req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Delete(':postId')
  remove(
    @Req() req: Request & { user: { userId: number } },
    @Param('postId', ParseIntPipe) postId: number,
  ) {
    return this.postsService.deletePost(postId, req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Get(':postId/comments')
  listComments(
    @Req() req: Request & { user: { userId: number } },
    @Param('postId', ParseIntPipe) postId: number,
    @Query() query: ListPostCommentsQueryDto,
  ) {
    const { offset, limit } = resolveCommentsPagination(query);
    return this.postsService.listComments(
      postId,
      req.user.userId,
      offset,
      limit,
    );
  }

  @UseGuards(JwtGuard)
  @Post(':postId/comments')
  createComment(
    @Req() req: Request & { user: { userId: number } },
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: CreateCommentDto,
  ) {
    return this.postsService.createComment(postId, req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Patch(':postId/comments/:commentId')
  updateComment(
    @Req() req: Request & { user: { userId: number } },
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.postsService.updateComment(
      postId,
      commentId,
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtGuard)
  @Delete(':postId/comments/:commentId')
  removeComment(
    @Req() req: Request & { user: { userId: number } },
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
  ) {
    return this.postsService.deleteComment(postId, commentId, req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Post(':postId/comments/:commentId/vote')
  voteComment(
    @Req() req: Request & { user: { userId: number } },
    @Param('postId', ParseIntPipe) postId: number,
    @Param('commentId', ParseIntPipe) commentId: number,
    @Body() dto: VotePostDto,
  ) {
    return this.postsService.voteComment(
      postId,
      commentId,
      req.user.userId,
      dto,
    );
  }

  @UseGuards(JwtGuard)
  @Post(':postId/vote')
  vote(
    @Req() req: Request & { user: { userId: number } },
    @Param('postId', ParseIntPipe) postId: number,
    @Body() dto: VotePostDto,
  ) {
    return this.postsService.votePost(postId, req.user.userId, dto);
  }

  @UseGuards(JwtGuard)
  @Post(':postId/share')
  share(
    @Req() req: Request & { user: { userId: number } },
    @Param('postId', ParseIntPipe) postId: number,
  ) {
    return this.postsService.sharePost(postId, req.user.userId);
  }
}
