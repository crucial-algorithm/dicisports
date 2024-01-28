import * as React from 'react';

import { AnimatePresence, motion } from 'framer-motion';

import { NotificationMessage } from '~/components/shared/NotificationMessage';
import { TeamCircle } from '~/components/shared/icons/TeamCircle';

type Props = {
  visible: boolean
  action: string
  secondary?: string
}

export default function TransitionIndicator({
  visible,
  action,
  secondary
}: Props) {
  return (
    <NotificationMessage position="bottom-right" visible={visible}>
      <div className="flex items-center w-64" data-cy="transition-indication">
        <motion.div
          transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
          animate={{ rotate: 360 }}
        >
          <TeamCircle size={48} />
        </motion.div>
        <div className="inline-grid ml-4">
          <AnimatePresence>
            <div className="flex col-start-1 row-start-1 overflow-hidden">
              <motion.span
                key={action}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex-none"
              >
                {action}
              </motion.span>
            </div>
          </AnimatePresence>
          {secondary ? (
            <span className="text-secondary truncate">path: {secondary}</span>
          ) : null}
        </div>
      </div>
    </NotificationMessage>
  );
}
