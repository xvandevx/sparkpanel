import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { Users } from '../users/users.model';
import { McpCall } from './calls/mcp-call.model';
import { McpCallsService } from './calls/mcp-calls.service';
import { McpPanelController } from './mcp-panel.controller';
import { McpToolsService } from './mcp-tools.service';
import { McpController } from './mcp.controller';
import { McpService } from './mcp.service';
import { PanelClient } from './panel-client';
import { McpToken } from './tokens/mcp-token.model';
import { McpTokenGuard } from './tokens/mcp-token.guard';
import { McpTokensService } from './tokens/mcp-tokens.service';

/**
 * MCP: ИИ-ассистенты работают с панелью без браузера. Протокол — `/api/mcp`
 * по личному токену, токены и журнал для экрана — `/api/mcp/tokens`,
 * `/api/mcp/calls`. Сервисов разделов модуль не импортирует: инструменты
 * ходят в маршруты панели (`PanelClient`), как ходил бы браузер.
 */
@Module({
  imports: [SequelizeModule.forFeature([McpToken, McpCall, Users])],
  controllers: [McpController, McpPanelController],
  providers: [McpService, McpToolsService, McpTokensService, McpCallsService, McpTokenGuard, PanelClient],
})
export class McpModule {}
