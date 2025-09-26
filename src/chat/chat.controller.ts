import { Body, Controller, Post } from '@nestjs/common';
import { ChatService } from './chat.service';


@Controller('chat')
export class ChatController {
constructor(private readonly chat: ChatService) {}


@Post()
async chatOnce(@Body() body: any) {
const { message, tenant_id, role, lang } = body || {};
if (!message || typeof message !== 'string') {
return { error: 'message required' };
}
return this.chat.ask(message, tenant_id, role, lang ?? 'vi');
}
}