import { ScheduleOwnerConfirmationHandler } from "./schedule-owner-confirmation.handler";
import { ScheduleOwnerIntentHandler } from "./schedule-owner-intent.handler";
import { ScheduleCustomerBookingHandler } from "./schedule-customer-booking.handler";
import { ScheduleHallucinationInterceptor } from "./schedule-hallucination.interceptor";
import type { InboundMessageInput } from "../chat.schema";
import type { ChannelOwnerResolution } from "./owner-resolver";

/**
 * Coordinator Facade untuk seluruh alur logika integrasi jadwal,
 * Google Calendar, konfirmasi dua arah, dan pencegahan halusinasi AI.
 */
export class ScheduleOrchestrator {
  /**
   * Menangani jawaban konfirmasi dari Owner atas draf pending action.
   */
  static async handleOwnerConfirmation(
    owner: ChannelOwnerResolution,
    message: string
  ): Promise<{ handled: boolean; replyText?: string }> {
    return ScheduleOwnerConfirmationHandler.handle(owner, message);
  }

  /**
   * Menangani permintaan pembuatan / penghapusan jadwal baru dari Owner via chat.
   */
  static async handleOwnerIntent(
    owner: ChannelOwnerResolution,
    message: string
  ): Promise<{ handled: boolean; replyText?: string }> {
    return ScheduleOwnerIntentHandler.handle(owner, message);
  }

  /**
   * Mencegat dan memulihkan halusinasi jadwal atau blok JSON liar dari AI generatif.
   */
  static async interceptAiOutput(
    owner: ChannelOwnerResolution,
    aiReply: string,
    userMessage: string
  ): Promise<{ intercepted: boolean; replyText: string }> {
    return ScheduleHallucinationInterceptor.handle(owner, aiReply, userMessage);
  }

  /**
   * Menangani permintaan booking dari Pelanggan umum (Customer).
   */
  static async handleCustomerBooking(
    owner: ChannelOwnerResolution,
    payload: InboundMessageInput,
    userMessage: string
  ): Promise<{ handled: boolean; replyText?: string }> {
    return ScheduleCustomerBookingHandler.handle(owner, payload, userMessage);
  }
}
