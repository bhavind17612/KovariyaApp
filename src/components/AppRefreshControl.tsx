import React from 'react';
import { RefreshControl, type RefreshControlProps } from 'react-native';
import { colors } from '../theme';

/**
 * App-themed pull-to-refresh spinner.
 *
 * Drop into any ScrollView / FlatList / SectionList `refreshControl` prop:
 *
 *   const { refreshing, onRefresh } = usePullToRefresh(loadData);
 *   <ScrollView refreshControl={<AppRefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
 *
 * Accepts every RefreshControlProps, so callers can override the themed defaults.
 */
export function AppRefreshControl(props: RefreshControlProps) {
	return (
		<RefreshControl
			tintColor={colors.primary}
			colors={[colors.primary]}
			progressBackgroundColor={colors.surface}
			{...props}
		/>
	);
}
