import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class OtpService {
  private readonly OTP_PREFIX = 'otp:';
  private readonly OTP_TTL = 300; // 5 minutes in seconds

  constructor(private readonly redisService: RedisService) {}

  async storeOtp(emailId: string, otp: string): Promise<void> {
    const key = this.getOtpKey(emailId);
    await this.redisService.set(key, otp, this.OTP_TTL);
  }

  async verifyOtp(emailId: string, otp: string): Promise<boolean> {
    const key = this.getOtpKey(emailId);
    const storedOtp = await this.redisService.get(key);
    
    if (storedOtp === otp) {
      // Delete the OTP after successful verification
      await this.redisService.del(key);
      return true;
    }
    
    return false;
  }

  private getOtpKey(emailId: string): string {
    return `${this.OTP_PREFIX}${emailId}`;
  }
}
