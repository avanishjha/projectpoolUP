import { router } from 'expo-router';

/**
 * Back navigation that never throws. router.back() on an empty history stack
 * (deep link, post-guard redirect, soft-deleted re-login) fires an
 * unhandled GO_BACK action and errors — this falls back to a safe route.
 */
export function goBack(fallback = '/') {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace(fallback);
  }
}
