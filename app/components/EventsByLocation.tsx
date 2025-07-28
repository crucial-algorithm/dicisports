import { Link } from '@remix-run/react';
import { useTranslation } from 'react-i18next';

interface EventsByLocationProps {
  sportLocationRoutes: Array<{ 
    sportSlug: string; 
    sportName: string;
    locationSlug: string; 
    locationName: string;
    url: string;
  }>;
}

export default function EventsByLocation({ sportLocationRoutes }: EventsByLocationProps) {
  const { t } = useTranslation(['common']);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 border-t border-gray-200 dark:border-gray-700 mt-12">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {t('Events by Location')}
        </h3>
      </div>

      {/* Desktop: Multiple columns with compact links */}
      <div className="hidden md:grid md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-x-6 gap-y-1">
        {sportLocationRoutes.map(({ sportSlug, sportName, locationSlug, locationName, url }) => (
          <Link
            key={`${sportSlug}-${locationSlug}`}
            to={url}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors duration-200 truncate"
            title={`${sportName} em ${locationName}`}
          >
            {sportName} - {locationName}
          </Link>
        ))}
      </div>

      {/* Mobile: Compact single column */}
      <div className="md:hidden grid grid-cols-2 gap-x-4 gap-y-1">
        {sportLocationRoutes.map(({ sportSlug, sportName, locationSlug, locationName, url }) => (
          <Link
            key={`${sportSlug}-${locationSlug}`}
            to={url}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors duration-200 truncate"
            title={`${sportName} em ${locationName}`}
          >
            {sportName} - {locationName}
          </Link>
        ))}
      </div>
    </div>
  );
}
