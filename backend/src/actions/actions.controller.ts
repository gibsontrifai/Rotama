import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActionsService } from './actions.service';
import { AddActionAttachmentDto } from './dto/add-action-attachment.dto';
import { CreateActionDto } from './dto/create-action.dto';
import { UpdateActionOwnerDto } from './dto/update-action-owner.dto';
import { UpdateActionProgressDto } from './dto/update-action-progress.dto';
import { UpdateActionStatusDto } from './dto/update-action-status.dto';

@ApiTags('actions')
@Controller('actions')
export class ActionsController {
  constructor(private readonly actionsService: ActionsService) {}

  @Get()
  @ApiQuery({
    name: 'page',
    required: false,
    description: 'Page number (starts from 1). Default: 1.',
    schema: { type: 'integer', minimum: 1, example: 1 },
  })
  @ApiQuery({
    name: 'size',
    required: false,
    description: 'Page size. Default: 50. Allowed: 1-100.',
    schema: { type: 'integer', minimum: 1, maximum: 100, example: 20 },
  })
  @ApiOkResponse({ description: 'Action list.' })
  async list(@Query('page') page?: string, @Query('size') size?: string) {
    return this.actionsService.list({
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
  }

  @Get(':actionId')
  @ApiOkResponse({ description: 'Action detail.' })
  async detail(@Param('actionId') actionId: string) {
    return this.actionsService.getById(actionId);
  }

  @Post()
  @Roles('supervisor', 'administrator')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        title: { type: 'string', example: '' },
        area: { type: 'string', example: '' },
        source: { type: 'string', enum: ['Incident', 'Inspection', 'Audit'], example: 'Inspection' },
        sourceRef: { type: 'string', example: '' },
        priority: { type: 'string', enum: ['Critical', 'High', 'Medium'], example: 'High' },
        owner: { type: 'string', example: '' },
        dueDate: { type: 'string', example: '15 Apr, 16:00' },
      },
      required: ['title', 'area', 'source', 'sourceRef', 'priority', 'owner', 'dueDate'],
    },
  })
  async create(@Body() body: CreateActionDto) {
    return this.actionsService.create({
      title: body.title,
      area: body.area,
      source: body.source,
      sourceRef: body.sourceRef,
      priority: body.priority,
      owner: body.owner,
      dueDate: body.dueDate,
    });
  }

  @Patch(':actionId/owner')
  @Roles('supervisor', 'administrator')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        owner: { type: 'string', example: '' },
      },
      required: ['owner'],
    },
  })
  async updateOwner(@Param('actionId') actionId: string, @Body() body: UpdateActionOwnerDto) {
    return this.actionsService.updateOwner(actionId, body.owner);
  }

  @Patch(':actionId/status')
  @Roles('supervisor', 'administrator')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['Open', 'In Progress', 'Blocked', 'Done'], example: 'Done' },
      },
      required: ['status'],
    },
  })
  async updateStatus(@Param('actionId') actionId: string, @Body() body: UpdateActionStatusDto) {
    return this.actionsService.updateStatus(actionId, body.status);
  }

  @Patch(':actionId/progress')
  @Roles('supervisor', 'administrator')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        progress: { type: 'number', example: 70 },
        status: { type: 'string', enum: ['Open', 'In Progress', 'Blocked', 'Done'], example: 'In Progress' },
        note: { type: 'string', example: '' },
      },
      required: ['progress', 'status', 'note'],
    },
  })
  async updateProgress(@Param('actionId') actionId: string, @Body() body: UpdateActionProgressDto) {
    return this.actionsService.updateProgress(actionId, {
      progress: body.progress,
      status: body.status,
      note: body.note,
    });
  }

  @Post(':actionId/attachments')
  @Roles('supervisor', 'administrator')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string', example: '' },
        kind: { type: 'string', enum: ['Photo', 'Document'], example: 'Photo' },
        mimeType: { type: 'string', example: 'image/jpeg' },
        sizeLabel: { type: 'string', example: '1.2 MB' },
        previewUrl: { type: 'string', example: '' },
      },
      required: ['name', 'kind'],
    },
  })
  async addAttachment(@Param('actionId') actionId: string, @Body() body: AddActionAttachmentDto) {
    return this.actionsService.addAttachment(actionId, {
      name: body.name,
      kind: body.kind,
      mimeType: body.mimeType,
      sizeLabel: body.sizeLabel,
      previewUrl: body.previewUrl,
    });
  }

  @Delete(':actionId/attachments/:attachmentId')
  @Roles('supervisor', 'administrator')
  async removeAttachment(@Param('actionId') actionId: string, @Param('attachmentId') attachmentId: string) {
    return this.actionsService.removeAttachment(actionId, attachmentId);
  }
}
