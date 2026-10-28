import { useEffect, useState } from 'react';
import { getDirectory, listEmployees } from '@/services/emsService';

export type Person = { id: number; name: string };

/** People the signed-in lead may pick from: everyone for HR, the team for a manager, nobody for an employee. */
export function usePeople(role: string | undefined, selfId: number | null | undefined) {
  const [people, setPeople] = useState<Person[]>([]);
  useEffect(() => {
    if (role === 'employee' || !role) return;
    if (role === 'manager') listEmployees({ page_size: 100 }).then((r) => setPeople(r.items.map((e) => ({ id: e.id, name: e.full_name })))).catch(() => {});
    else getDirectory().then((d) => setPeople(d.map((p) => ({ id: p.id, name: p.name })))).catch(() => {});
  }, [role, selfId]);
  return people;
}
