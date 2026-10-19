import { Composer } from 'grammy';
import { commandController } from './controllers/command.controller';
import { chatController } from './controllers/chat.controller';

export const telegramRouter = new Composer();

// 1. Rute Perintah Bot
telegramRouter.command('start', (ctx) => commandController.handleStart(ctx));
telegramRouter.command('help', (ctx) => commandController.handleHelp(ctx));
telegramRouter.command('status', (ctx) => commandController.handleStatus(ctx));

// 2. Rute Pesan Masuk
telegramRouter.on('message:text', (ctx) => chatController.handleTextMessage(ctx));
telegramRouter.on('message:photo', (ctx) => chatController.handlePhotoMessage(ctx));

// 3. Rute Interaksi Tombol (Callback Query)
telegramRouter.on('callback_query:data', (ctx) => chatController.handleCallbackQuery(ctx));
