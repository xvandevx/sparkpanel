import { Body, Controller, Delete, Get, HttpStatus, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '../common';
import { McpService } from './mcp.service';
import { McpCaller } from './tokens/mcp-tokens.service';
import { McpTokenGuard } from './tokens/mcp-token.guard';

/**
 * Протокол MCP — `/api/mcp`, Streamable HTTP. Ассистент шлёт сюда JSON-RPC
 * с личным токеном `spm_…` вместо JWT панели. Потока сервер не держит:
 * `GET` (поток уведомлений) и `DELETE` (конец сессии) ему не нужны — 405,
 * как и велит спецификация.
 *
 * В Swagger панели не входит: это не маршрут для экранов.
 */
@ApiExcludeController()
@Public()
@UseGuards(McpTokenGuard)
@Controller('mcp')
export class McpController {
  constructor(private readonly mcp: McpService) {}

  @Post()
  async handle(@Req() req: Request, @Body() body: unknown, @Res() res: Response) {
    const caller = req.mcp as McpCaller;
    const messages = Array.isArray(body) ? body : [body];
    const answers = [];
    // По одному: правки из одной пачки должны лечь в том порядке, в каком их прислали
    for (const message of messages) {
      const answer = await this.mcp.handle(caller, message);
      if (answer) answers.push(answer);
    }
    if (answers.length === 0) return res.status(HttpStatus.ACCEPTED).end();
    return res.status(HttpStatus.OK).json(Array.isArray(body) ? answers : answers[0]);
  }

  @Get()
  stream(@Res() res: Response) {
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).setHeader('Allow', 'POST').end();
  }

  @Delete()
  close(@Res() res: Response) {
    return res.status(HttpStatus.METHOD_NOT_ALLOWED).setHeader('Allow', 'POST').end();
  }
}
