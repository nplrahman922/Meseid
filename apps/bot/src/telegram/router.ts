import { Composer } from 'grammy';
import { commandController } from './controllers/command.controller';
import { chatController } from './controllers/chat.controller';
import { contactController } from './controllers/contact.controller';
import { photoController } from './controllers/photo.controller';
import { audioController } from './controllers/audio.controller';
import { callbackController } from './controllers/callback.controller';

export const telegramRouter = new Composer();

// 1. Rute Perintah Bot
telegramRouter.command('start', (ctx) => commandController.handleStart(ctx));
telegramRouter.command('help', (ctx) => commandController.handleHelp(ctx));
telegramRouter.command('status', (ctx) => commandController.handleStatus(ctx));
telegramRouter.command('otp', (ctx) => commandController.handleOtp(ctx));

// 2. Rute Kontak (Share Contact untuk Verifikasi OTP)
telegramRouter.on('message:contact', (ctx) => contactController.handleContact(ctx));

// 3. Rute Pesan Masuk (Teks, Foto Nota, dan Rekaman Suara / Audio)
telegramRouter.on('message:text', (ctx) => chatController.handleTextMessage(ctx));
telegramRouter.on('edited_message:text', (ctx) => chatController.handleEditedTextMessage(ctx));
telegramRouter.on('message:photo', (ctx) => photoController.handlePhotoMessage(ctx));
telegramRouter.on('message:voice', (ctx) => audioController.handleVoiceMessage(ctx));
telegramRouter.on('message:audio', (ctx) => audioController.handleAudioFileMessage(ctx));

// 4. Rute Interaksi Tombol (Callback Query)
telegramRouter.on('callback_query:data', (ctx) => callbackController.handleCallbackQuery(ctx));
