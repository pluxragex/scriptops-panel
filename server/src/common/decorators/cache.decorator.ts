import { SetMetadata } from '@nestjs/common';

export const CACHE_TTL_KEY = 'cache_ttl';
export const CACHE_KEY_PREFIX = 'cache_key_prefix';


export const Cacheable = (ttl: number = 300, keyPrefix?: string) => {
  return SetMetadata(CACHE_TTL_KEY, { ttl, keyPrefix });
};


