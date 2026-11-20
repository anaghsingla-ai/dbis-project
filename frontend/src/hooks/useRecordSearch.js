import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

export default function useRecordSearch() {
  const [params] = useSearchParams();
  const term = params.get('search') || '';
  const [search, setSearch] = useState(term);
  useEffect(() => { setSearch(term); }, [term]);
  return [search, setSearch];
}

export function matchesRecord(record, search) {
  const term = search.trim().toLowerCase();
  return !term || Object.values(record).some((value) => value != null &&
    typeof value !== 'object' && String(value).toLowerCase().includes(term));
}
