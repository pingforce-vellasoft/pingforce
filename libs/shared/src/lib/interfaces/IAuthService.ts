export interface IAuthService {
  login(
    loginDto: unknown,
  ): Promise<{ accessToken: string; refreshToken: string }>;
  refreshToken(
    token: string,
  ): Promise<{ accessToken: string; refreshToken: string }>;
}
