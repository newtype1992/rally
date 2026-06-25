export type QueryInvalidator = {
  invalidateQueries(options: { queryKey: readonly unknown[] }): unknown;
};

export function invalidateHabitQueries(queryClient: QueryInvalidator, habitId: string) {
  queryClient.invalidateQueries({ queryKey: ['habits'] });
  queryClient.invalidateQueries({ queryKey: ['weekly-progress'] });
  queryClient.invalidateQueries({ queryKey: ['habit-detail', habitId] });
}
