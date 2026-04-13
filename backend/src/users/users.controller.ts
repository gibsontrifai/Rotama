import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { ActivateUserDto } from './dto/activate-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('administrator')
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
  @ApiOkResponse({ description: 'User list.' })
  async list(@Query('page') page?: string, @Query('size') size?: string) {
    return this.usersService.list({
      page: page ? Number(page) : undefined,
      size: size ? Number(size) : undefined,
    });
  }

  @Get('activate')
  @Public()
  @ApiQuery({
    name: 'token',
    required: true,
    description: 'Activation token sent to user email.',
    schema: { type: 'string' },
  })
  @ApiOkResponse({ description: 'User activation result.' })
  async activate(@Query() query: ActivateUserDto) {
    return this.usersService.activateByToken(query.token);
  }

  @Post()
  @Roles('administrator')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        username: { type: 'string', example: 'new.user' },
        password: { type: 'string', example: 'SafetyHub@2026' },
        fullName: { type: 'string', example: 'New User' },
        role: { type: 'string', enum: ['technician', 'supervisor', 'administrator'], example: 'technician' },
        position: { type: 'string', example: 'Teknisi K3' },
        branch: { type: 'string', example: 'Surabaya Plant' },
        email: { type: 'string', example: 'new.user@safetyhub.local' },
        phone: { type: 'string', example: '081234567890' },
      },
      required: ['username', 'password', 'fullName', 'role', 'position', 'branch', 'email', 'phone'],
    },
  })
  @ApiOkResponse({ description: 'Created user.' })
  async create(@Body() body: CreateUserDto) {
    return this.usersService.create({
      username: body.username,
      password: body.password,
      fullName: body.fullName,
      role: body.role,
      position: body.position,
      branch: body.branch,
      email: body.email,
      phone: body.phone,
    });
  }

  @Patch(':username/status')
  @Roles('administrator')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        isActive: { type: 'boolean', example: false },
      },
      required: ['isActive'],
    },
  })
  @ApiOkResponse({ description: 'Updated user active status.' })
  async updateStatus(
    @Param('username') username: string,
    @Body() body: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(username, body.isActive);
  }

  @Delete(':username')
  @Roles('administrator')
  @ApiOkResponse({ description: 'Deleted user.' })
  async remove(@Param('username') username: string) {
    return this.usersService.remove(username);
  }

  @Patch(':username/profile')
  @ApiBody({
    required: true,
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string', example: '' },
        position: { type: 'string', example: '' },
        branch: { type: 'string', example: '' },
        expertise: { type: 'array', items: { type: 'string' }, example: ['Risk Assessment'] },
        avatar: { type: 'string', example: '' },
      },
      required: ['fullName', 'position', 'branch', 'expertise'],
    },
  })
  @ApiOkResponse({ description: 'Updated user profile.' })
  async updateProfile(
    @Param('username') username: string,
    @Body() body: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(username, {
      fullName: body.fullName,
      position: body.position,
      branch: body.branch,
      expertise: body.expertise,
      avatar: body.avatar,
    });
  }
}
