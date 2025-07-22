import { useSnapshot } from 'valtio';
import { bucketStore, bucketSelectors } from '@/stores/bucketStore';

export function useBucket() {
  const snapshot = useSnapshot(bucketStore);

  return {
    bucket: snapshot.bucket,
    loading: snapshot.loading,
    error: snapshot.error,
    lastUpdated: snapshot.lastUpdated,
    selectors: bucketSelectors,
  };
}