import CloseIcon from '@carbon/icons-react/lib/Close';
import * as _Dialog from '@radix-ui/react-dialog';
import { forwardRef } from 'react';

import cx from '@hub/lib/cx';

export const Portal = _Dialog.Portal;
export const Root = _Dialog.Root;

export const Close = forwardRef<HTMLButtonElement, _Dialog.DialogCloseProps>(
  function Close(props, ref) {
    return (
      <_Dialog.Close
        {...props}
        className={cx('absolute', 'top-4', 'right-4', props.className)}
        ref={ref}
      >
        <CloseIcon className="h-6 w-6 fill-neutral-500" />
      </_Dialog.Close>
    );
  },
);

export const Content = forwardRef<HTMLDivElement, _Dialog.DialogContentProps>(
  function Content(props, ref) {
    return (
      <_Dialog.Content
        {...props}
        className={cx(
          'bg-neutral-800',
          'drop-shadow-xl',
          'relative',
          'rounded',
          props.className,
        )}
        ref={ref}
      />
    );
  },
);

export const Overlay = forwardRef<HTMLDivElement, _Dialog.DialogOverlayProps>(
  function Overlay(props, ref) {
    return (
      <_Dialog.Overlay
        {...props}
        className={cx(
          'bottom-0',
          'fixed',
          'flex',
          'items-center',
          'justify-center',
          'left-0',
          'right-0',
          'top-0',
          'z-40',
          props.className,
        )}
        ref={ref}
      />
    );
  },
);
