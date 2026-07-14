import * as migration_20260714_074436_initial from './20260714_074436_initial';

export const migrations = [
  {
    up: migration_20260714_074436_initial.up,
    down: migration_20260714_074436_initial.down,
    name: '20260714_074436_initial'
  },
];
