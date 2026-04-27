export class TokensDto {
  accessToken: string;
  refreshToken: string;
}

export class TermsInfoDto {
  id: string | null;
  version: string;
  content: string;
}

export class LoginResponseDto extends TokensDto {
  needsTermsAcceptance: boolean;
  terms?: TermsInfoDto;
}
