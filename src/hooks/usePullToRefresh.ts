import { useCallback, useState } from 'react';

/**
 * Manages the refreshing state for pull-to-refresh.
 *
 * Pass an async (or sync) loader; the spinner stays visible until it settles.
 * Pair with <AppRefreshControl /> on any scrollable:
 *
 *   const { refreshing, onRefresh } = usePullToRefresh(loadData);
 *   <ScrollView refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
 */
export function usePullToRefresh(onRefresh: () => unknown | Promise<unknown>) {
	const [refreshing, setRefreshing] = useState(false);

	const handleRefresh = useCallback(async () => {
		setRefreshing(true);
		try {
			await onRefresh();
		} finally {
			setRefreshing(false);
		}
	}, [onRefresh]);

	return { refreshing, onRefresh: handleRefresh };
}
