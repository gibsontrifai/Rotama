import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBody, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Public } from './decorators/public.decorator';
import { AuthService } from './auth.service';
import { AuthSessionDto } from './dto/auth-session.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RefreshTokenResponseDto } from './dto/refresh-token-response.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiBody({
    type: LoginDto,
    examples: {
      empty: {
        summary: 'Empty payload template',
        value: {
          username: '',
          password: '',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Login success response.',
    type: AuthSessionDto,
  })
  @Public()
  async login(@Body() payload: LoginDto, @Req() request: Request) {
    const forwardedFor = request.headers['x-forwarded-for'];
    const clientIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : request.ip || request.socket.remoteAddress || 'unknown';

    return this.authService.login(payload, clientIp);
  }

  @Post('refresh')
  @ApiBody({
    type: RefreshTokenDto,
    examples: {
      empty: {
        summary: 'Empty payload template',
        value: {
          refreshToken: '',
        },
      },
    },
  })
  @ApiOkResponse({
    description: 'Refresh token success response.',
    type: RefreshTokenResponseDto,
  })
  @Public()
  async refresh(@Body() payload: RefreshTokenDto) {
    return this.authService.refresh(payload.refreshToken);
  }
}
