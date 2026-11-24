import { useId } from 'react';
import { cn } from '@/lib/utils';

/**
 * Logótipo LUV CONECT: a letra L (de Luv) dentro de um círculo azul, ligada por um
 * arco tracejado a um ponto violeta, o destino que fica mais perto.
 */
export function LogoMark({ size = 40, className }: { size?: number; className?: string }) {
  const gradientId = 'luv-' + useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox='0 0 48 48' role='img' aria-label='LUV CONECT' className={cn('shrink-0', className)}>
      <defs>
        <linearGradient id={gradientId} x1='6' y1='4' x2='42' y2='44' gradientUnits='userSpaceOnUse'>
          <stop offset='0' stopColor='#6C9BF5' />
          <stop offset='1' stopColor='#3F59D9' />
        </linearGradient>
      </defs>
      <circle cx='22' cy='26' r='20' fill={'url(#' + gradientId + ')'} />
      <path d='M15 17 C22 9 30 8 36 10' fill='none' stroke='#fff' strokeOpacity='0.55' strokeWidth='2' strokeLinecap='round' strokeDasharray='1 4' />
      <path d='M15 17 V34 H29' fill='none' stroke='#fff' strokeWidth='5' strokeLinecap='round' strokeLinejoin='round' />
      <circle cx='38' cy='10' r='6' fill='#8B6CF0' stroke='#fff' strokeWidth='2.5' />
    </svg>
  );
}

export function Logo({ size = 36, tagline = false, className }: { size?: number; tagline?: boolean; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={size} />
      <span className='flex flex-col leading-none'>
        <span className='font-display text-lg font-extrabold tracking-tight text-foreground'>
          LUV <span className='text-primary'>CONECT</span>
        </span>
        {tagline && <span className='mt-1 text-xs font-medium text-muted-foreground'>O mundo mais perto de si</span>}
      </span>
    </span>
  );
}
