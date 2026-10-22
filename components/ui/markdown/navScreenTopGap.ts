/**
 * PUSHED_SCREEN_TOP_GAP — extra pixels of buffer added ALONG THE TOP when a
 * Nav Button is pressed and its screen pushes in. It is added on top of the
 * measured bottom edge of the chrome pinned to the viewport top (game header
 * bar, sim button, code chip); the pushed screen's Back row
 * ("< Role Descriptions") is scrolled to sit that many pixels below it.
 *
 * Back row lands too close to the top of the screen -> raise this number.
 * Too much empty space above the Back row           -> lower this number.
 */
export const PUSHED_SCREEN_TOP_GAP = 120;
