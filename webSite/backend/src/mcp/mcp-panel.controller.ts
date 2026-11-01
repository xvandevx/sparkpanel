import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { McpCallsPageDto, McpCallsQueryDto } from './calls/mcp-call.dto';
import { McpCallsService } from './calls/mcp-calls.service';
import { CreatedMcpTokenDto, CreateMcpTokenDto, McpTokenDto } from './tokens/mcp-token.dto';
import { McpTokensService } from './tokens/mcp-tokens.service';

/**
 * MCP глазами панели — экран «Настройки → MCP»: личные токены и журнал
 * вызовов. Токен заводит себе любой пользователь; главный администратор
 * видит и отзывает все токены и весь журнал, остальные — свои.
 */
@ApiTags('mcp')
@ApiBearerAuth('JWT-auth')
@Controller('mcp')
export class McpPanelController {
  constructor(
    private readonly tokens: McpTokensService,
    private readonly calls: McpCallsService,
  ) {}

  @ApiOperation({ summary: 'Токены MCP, новые сверху: у root — все, у остальных — свои' })
  @ApiOkResponse({ type: [McpTokenDto] })
  @Get('tokens')
  findTokens(@Req() req: Request) {
    return this.tokens.findAll(req.user);
  }

  @ApiOperation({ summary: 'Создать токен себе. Ответ — единственный раз, когда токен виден целиком' })
  @ApiOkResponse({ type: CreatedMcpTokenDto })
  @Post('tokens')
  createToken(@Req() req: Request, @Body() dto: CreateMcpTokenDto) {
    return this.tokens.create(req.user, dto.name, dto.days ?? null);
  }

  @ApiOperation({ summary: 'Отозвать токен — ассистент с ним сразу теряет доступ' })
  @ApiNotFoundResponse({ description: 'Токена нет' })
  @ApiForbiddenResponse({ description: 'Чужой токен, а вы не root' })
  @Delete('tokens/:id')
  removeToken(@Req() req: Request, @Param('id', ParseIntPipe) id: number) {
    return this.tokens.remove(req.user, id);
  }

  @ApiOperation({ summary: 'Журнал вызовов MCP за 30 дней, новые сверху' })
  @ApiOkResponse({ type: McpCallsPageDto })
  @Get('calls')
  findCalls(@Req() req: Request, @Query() query: McpCallsQueryDto) {
    return this.calls.page(req.user, query);
  }
}
