import { Variants, Transition } from 'framer-motion';

// ── 常用缓动曲线 ──
export const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];
export const EASE_SPRING: Transition = { type: 'spring', stiffness: 400, damping: 30 };

// ── 动画变体预设 ──

/** 淡入 + 上移（卡片、页面入场） */
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: EASE_OUT_EXPO, delay },
  }),
  exit: { opacity: 0, y: 8, transition: { duration: 0.2 } },
};

/** 缩放弹入（Modal 内容区） */
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: EASE_OUT_EXPO },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.15, ease: 'easeIn' },
  },
};

/** 遮罩层淡入淡出 */
export const overlayFade: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

/** Toast 从底部滑入 */
export const slideInBottom: Variants = {
  hidden: { opacity: 0, y: 20, x: '-50%' },
  visible: {
    opacity: 1,
    y: 0,
    x: '-50%',
    transition: { duration: 0.35, ease: EASE_OUT_EXPO },
  },
  exit: {
    opacity: 0,
    y: 10,
    x: '-50%',
    transition: { duration: 0.2 },
  },
};

/** 列表 stagger 容器 */
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

/** 列表 stagger 子项 */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: EASE_OUT_EXPO },
  },
};
