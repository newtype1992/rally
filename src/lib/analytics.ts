export type AnalyticsProperties = Record<string, string | number | boolean | null | undefined>;

export const analytics = {
  capture(_eventName: string, _properties?: AnalyticsProperties) {
    return undefined;
  },
};
