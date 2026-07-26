import type { ButtonExposes, ButtonProps } from '@proto.ui/prototypes-base/button';

export type BrutalistButtonVariant =
  | 'default'
  | 'outline'
  | 'secondary'
  | 'destructive'
  | 'reverse';
export type BrutalistButtonSize = 'default' | 'sm' | 'lg' | 'icon';

export interface BrutalistButtonProps extends ButtonProps {
  variant?: BrutalistButtonVariant;
  size?: BrutalistButtonSize;
}

export type BrutalistButtonExposes = ButtonExposes;
