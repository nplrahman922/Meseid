import type { Context } from 'grammy';
import { telegramView } from '../views/telegram.view';
import { telegramLogger } from '../../logs';

export class CommandController {
  /**
   * Menangani perintah /start
   */
  async handleStart(ctx: Context): Promise<void> {
    const firstName = ctx.from?.first_name;
    const botName = ctx.me?.first_name || 'Asisten Bisnis';
    telegramLogger.info(`Perintah /start diterima dari user ${ctx.from?.id} (@${ctx.from?.username || firstName})`, {
      action: 'command_start',
      senderId: ctx.from?.id.toString(),
      chatId: ctx.chat?.id.toString(),
    });

    const message = telegramView.renderWelcome(firstName, botName);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Menangani perintah /help
   */
  async handleHelp(ctx: Context): Promise<void> {
    telegramLogger.info(`Perintah /help diterima dari user ${ctx.from?.id}`, {
      action: 'command_help',
      senderId: ctx.from?.id.toString(),
    });

    const message = telegramView.renderHelp();
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }

  /**
   * Menangani perintah /status
   */
  async handleStatus(ctx: Context): Promise<void> {
    const botName = ctx.me?.first_name || 'Meseid Bot';
    const botId = ctx.me?.id.toString() || 'Unknown';
    const mode = process.env.TELEGRAM_MODE || 'polling';

    telegramLogger.info(`Perintah /status diterima dari user ${ctx.from?.id}`, {
      action: 'command_status',
      botId,
      senderId: ctx.from?.id.toString(),
    });

    const message = telegramView.renderStatus(botName, botId, mode, true);
    await ctx.reply(message, { parse_mode: 'Markdown' });
  }
}

export const commandController = new CommandController();
